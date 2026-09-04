// The decorator is what restores per-deploy freshness on a store that no longer forgets, so these
// pin both halves: a new release empties the cache exactly once, and an unchanged one never does.

import assert from "node:assert/strict";
import { test } from "node:test";
import { withDeployPurge } from "./deploy-purge";
import type { RouteCacheEntry } from "./entry";
import { createMemoryStore } from "./store";

const ENTRY: RouteCacheEntry = { status: 200, headers: [], body: "aGk=" };

function harness({
  marker,
  buildId = "build_new",
  failPurge = false,
}: {
  marker?: string;
  buildId?: string;
  failPurge?: boolean;
} = {}) {
  const inner = createMemoryStore();
  let stored = marker ?? null;
  const calls: string[] = [];

  const store = withDeployPurge(inner, {
    buildId,
    readMarker: async () => {
      calls.push("read");

      return stored;
    },
    writeMarker: async (id) => {
      calls.push("write");
      stored = id;
    },
    purge: async () => {
      calls.push("purge");

      if (failPurge) {
        throw new Error("purge unavailable");
      }

      await inner.expireTag(["route-cache:all"]);
    },
  });

  return { store, inner, calls, marker: () => stored };
}

test("a new build empties what the previous one cached", async () => {
  const { store, inner, calls, marker } = harness({ marker: "build_old" });

  await inner.set("a", ENTRY, { ttl: 60, tags: ["route-cache:all"] });

  assert.equal(await store.get("a"), null, "the entry should not survive the purge");
  assert.deepEqual(calls, ["read", "purge", "write"]);
  assert.equal(marker(), "build_new");
});

test("an unchanged build leaves the cache alone", async () => {
  const { store, inner, calls } = harness({ marker: "build_new" });

  await inner.set("a", ENTRY, { ttl: 60, tags: ["route-cache:all"] });

  assert.deepEqual(await store.get("a"), ENTRY);
  assert.deepEqual(calls, ["read"], "nothing should be purged");
});

test("purges once per instance, however many requests race it", async () => {
  const { store, calls } = harness({ marker: "build_old" });

  await Promise.all([store.get("a"), store.get("b"), store.set("c", ENTRY, { ttl: 60, tags: [] })]);
  await store.get("d");

  assert.equal(calls.filter((call) => call === "purge").length, 1);
});

test("writes wait for the purge, so a racing render is not wiped after storing", async () => {
  const { store, inner, calls } = harness({ marker: "build_old" });

  await store.set("a", ENTRY, { ttl: 60, tags: ["route-cache:all"] });

  assert.deepEqual(calls, ["read", "purge", "write"]);
  assert.deepEqual(await inner.get("a"), ENTRY, "the entry was stored after the purge, so it survives");
});

test("a failed purge is retried rather than remembered", async () => {
  const { store, calls } = harness({ marker: "build_old", failPurge: true });

  await store.get("a");
  await store.get("a");

  assert.equal(calls.filter((call) => call === "purge").length, 2);
  assert.ok(!calls.includes("write"), "the marker must not advance past a purge that failed");
});

test("passes reads, writes and tag expiry through to the wrapped store", async () => {
  const { store, inner } = harness({ marker: "build_new" });

  await store.set("a", ENTRY, { ttl: 60, tags: ["doc:abc"] });
  assert.deepEqual(await store.get("a"), ENTRY);

  await store.expireTag(["doc:abc"]);
  assert.equal(await inner.get("a"), null);
});
