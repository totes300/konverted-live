/**
 * Helpers for `scripts/sanity-project-setup/setup.ts`: env merging and Sanity CLI.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * If `envPath` is missing and `.env.example` exists, copy the example to `envPath` so upserts preserve all template keys.
 */
export function ensureEnvFromExample(envPath: string, examplePath: string): boolean {
  if (existsSync(envPath)) {
    return false;
  }

  if (!existsSync(examplePath)) {
    return false;
  }
  writeFileSync(envPath, readFileSync(examplePath, "utf8"), "utf8");
  return true;
}

/**
 * The prefix this project's framework uses for browser-visible env vars, read from `.env.example`
 * rather than hardcoded, so the script adapts to whichever host it is dropped into instead of
 * writing keys that host will never read.
 *
 * Anchored on the Sanity project id, which every host spells the same way after its own prefix.
 * Falls back to the bare `PUBLIC_` a plain Vite host uses when the example says nothing.
 */
export function readPublicEnvPrefix(exampleContents: string): string {
  return /^([A-Z0-9_]*?PUBLIC_)SANITY_PROJECT_ID\s*=/m.exec(exampleContents)?.[1] ?? "PUBLIC_";
}

/**
 * The local dev origin the project's own example points at, so the CORS default matches the port
 * the dev server actually listens on rather than a number this script guessed.
 *
 * Any `http://localhost:<port>` in the example will do: the site URL is the only key that carries
 * one, whatever the host calls it.
 */
export function readLocalSiteOrigin(exampleContents: string, fallback: string): string {
  return /^[A-Z0-9_]*\s*=\s*(http:\/\/localhost:\d+)\s*$/m.exec(exampleContents)?.[1] ?? fallback;
}

/**
 * Parses the first balanced JSON object found in CLI stdout.
 * Tolerates noise both before the object (spinner lines) and after it (version notices, ANSI resets)
 * by scanning for the brace that matches the opening `{` instead of slicing to end-of-output.
 */
export function parseJsonFromCliOutput(stdout: string): Record<string, unknown> {
  const trimmed = stdout.trim();
  const start = trimmed.indexOf("{");

  if (start === -1) {
    throw new Error(`Expected JSON object in CLI output, got:\n${trimmed.slice(0, 500)}`);
  }

  const end = findMatchingBrace(trimmed, start);

  if (end === -1) {
    throw new Error(`Unterminated JSON object in CLI output:\n${trimmed.slice(start, start + 500)}`);
  }

  return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
}

/**
 * Index of the `}` that closes the `{` at `open`, accounting for nested objects and braces inside
 * string literals. Returns -1 when the object is never closed.
 */
function findMatchingBrace(text: string, open: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = open; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

export function runSanityCli(args: string[]): { ok: boolean; stdout: string; stderr: string; status: number | null } {
  const binName = process.platform === "win32" ? "sanity.cmd" : "sanity";
  const bin = join(process.cwd(), "node_modules", ".bin", binName);
  const result = spawnSync(bin, args, {
    encoding: "utf-8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  // A spawn-level failure (e.g. the binary is missing) sets `error` and leaves `status` null;
  // surface that message so callers never print an empty error.
  const spawnError = result.error ? result.error.message : "";

  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr || spawnError,
    status: result.status,
  };
}

/**
 * Same runner as `runSanityCli`, but with inherited stdio and `extraEnv` layered on top of the
 * process env. For the long commands that print their own progress and read the project from the
 * environment (`dataset import`), whose parent still holds the env from before this run wrote `.env`.
 */
export function runSanityCliStreaming(
  args: string[],
  extraEnv: Record<string, string> = {}
): { ok: boolean; error: string; status: number | null } {
  const binName = process.platform === "win32" ? "sanity.cmd" : "sanity";
  const bin = join(process.cwd(), "node_modules", ".bin", binName);
  const result = spawnSync(bin, args, {
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
  });

  return {
    ok: !result.error && result.status === 0,
    error: result.error ? result.error.message : "",
    status: result.status,
  };
}

export function formatEnvValue(value: string): string {
  if (/[\s#'"\\]/.test(value)) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

/**
 * Upserts KEY=value pairs in a `.env` file, preserving unrelated lines and order where possible.
 */
export function upsertEnvFile(filePath: string, updates: Record<string, string>): void {
  const keysRemaining = new Set(Object.keys(updates));
  const lines: string[] = existsSync(filePath) ? readFileSync(filePath, "utf8").split(/\r?\n/) : [];

  const out: string[] = [];
  for (const line of lines) {
    const match = /^(?:export\s+)?([A-Za-z_]\w*)\s*=/.exec(line);

    if (match?.[1] && keysRemaining.has(match[1])) {
      const key = match[1];
      out.push(`${key}=${formatEnvValue(updates[key] ?? "")}`);
      keysRemaining.delete(key);
    } else {
      out.push(line);
    }
  }

  for (const key of keysRemaining) {
    out.push(`${key}=${formatEnvValue(updates[key] ?? "")}`);
  }

  const body = out.join("\n");
  writeFileSync(filePath, body.endsWith("\n") ? body : `${body}\n`, "utf8");
}
