import { test } from "node:test";
import assert from "node:assert/strict";
import {
  projectAvatarUrl,
  validateEmail,
  validatePassword,
  validateUsername,
} from "../src/lib/account-rules";

test("username rules", () => {
  for (const ok of ["ana", "Ana_99", "a.b", "abcdefghijklmnop"])
    assert.equal(validateUsername(ok), null);
  for (const bad of [
    "ab",
    "abcdefghijklmnopq",
    "ana maria",
    "ana@x",
    "aná",
    "",
  ])
    assert.equal(typeof validateUsername(bad), "string");
});

test("password rules", () => {
  assert.equal(validatePassword("12345678", "12345678"), null);
  assert.match(validatePassword("1234567", "1234567")!, /8/);
  assert.equal(typeof validatePassword("12345678", "12345679"), "string");
});

test("e-mail shape", () => {
  for (const ok of ["ana@example.com", " Ana.B+x@mail.example.org "])
    assert.equal(validateEmail(ok), null);
  for (const bad of ["", "ana", "ana@", "@x.com", "ana@x", "a b@x.com"])
    assert.equal(typeof validateEmail(bad), "string");
});

test("only avatars stored in this project, in the account's own folder, are shown", () => {
  const base = "https://p.supabase.co";
  const own = `${base}/storage/v1/object/public/avatars/u1/123.png`;
  assert.equal(projectAvatarUrl(own, base, "u1"), own);
  assert.equal(projectAvatarUrl(own, `${base}/`, "u1"), own);
  for (const bad of [
    `https://evil.example/storage/v1/object/public/avatars/u1/123.png`,
    `${base}/storage/v1/object/public/avatars/u2/123.png`,
    `${base}.evil.example/storage/v1/object/public/avatars/u1/1.png`,
    "",
    null,
    undefined,
  ])
    assert.equal(projectAvatarUrl(bad, base, "u1"), null);
  // No project configured: nothing can be trusted.
  assert.equal(projectAvatarUrl(own, undefined, "u1"), null);
});
