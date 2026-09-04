// HTTP Basic Auth primitives, shared by the gate in `src/middleware.ts` and by the route cache
// provider (`src/lib/route-cache/`), which has to recognise already-authenticated traffic
// before the middleware runs. Credentials come from BASIC_AUTH_USERNAME / BASIC_AUTH_PASSWORD.

export function decodeBasicAuthHeader(header: string | null): { username: string; password: string } | null {
  if (!header?.startsWith("Basic ")) {
    return null;
  }

  const b64 = header.slice(6).trim();

  try {
    const decoded = atob(b64);
    const colon = decoded.indexOf(":");

    if (colon === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, colon),
      password: decoded.slice(colon + 1),
    };
  } catch {
    return null;
  }
}

/** Constant-time compare, so a credential check cannot be probed one character at a time. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let out = 0;

  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return out === 0;
}

/**
 * The exact `Authorization` header a browser replays once it has answered the 401 challenge, or
 * null when Basic Auth is unconfigured or the credentials fall outside latin1 (`btoa` cannot encode
 * them and `atob` cannot decode them, so the gate would reject them anyway).
 */
export function basicAuthorizationHeader(username: string, password: string): string | null {
  const user = username.trim();

  if (!user || !password) {
    return null;
  }

  try {
    return `Basic ${btoa(`${user}:${password}`)}`;
  } catch {
    return null;
  }
}
