import assert from "node:assert/strict";
import { test } from "node:test";
import { basicAuthorizationHeader, decodeBasicAuthHeader, timingSafeEqual } from "./basic-auth";

test("decodeBasicAuthHeader reads the credentials out of a Basic header", () => {
  assert.deepEqual(decodeBasicAuthHeader(`Basic ${btoa("editor:s3cret")}`), {
    username: "editor",
    password: "s3cret",
  });
});

test("decodeBasicAuthHeader keeps colons inside the password", () => {
  assert.deepEqual(decodeBasicAuthHeader(`Basic ${btoa("editor:a:b")}`), {
    username: "editor",
    password: "a:b",
  });
});

test("decodeBasicAuthHeader rejects anything that is not a decodable Basic header", () => {
  assert.equal(decodeBasicAuthHeader(null), null);
  assert.equal(decodeBasicAuthHeader("Bearer token"), null);
  assert.equal(decodeBasicAuthHeader("Basic !!!not-base64!!!"), null);
  assert.equal(decodeBasicAuthHeader(`Basic ${btoa("no-colon")}`), null);
});

test("timingSafeEqual compares by value, not by prefix", () => {
  assert.equal(timingSafeEqual("secret", "secret"), true);
  assert.equal(timingSafeEqual("secret", "secreT"), false);
  assert.equal(timingSafeEqual("secret", "secret-longer"), false);
  assert.equal(timingSafeEqual("", ""), true);
});

test("basicAuthorizationHeader rebuilds the header a browser replays", () => {
  const header = basicAuthorizationHeader("editor", "s3cret");

  assert.equal(header, `Basic ${btoa("editor:s3cret")}`);
  assert.deepEqual(decodeBasicAuthHeader(header), { username: "editor", password: "s3cret" });
});

test("basicAuthorizationHeader returns null when Basic Auth cannot run", () => {
  assert.equal(basicAuthorizationHeader("", "s3cret"), null);
  assert.equal(basicAuthorizationHeader("  ", "s3cret"), null);
  assert.equal(basicAuthorizationHeader("editor", ""), null);
  // Outside latin1: btoa cannot encode it and the gate's atob decode could not match it either.
  assert.equal(basicAuthorizationHeader("editor", "パスワード"), null);
});
