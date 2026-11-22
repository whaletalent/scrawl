import { test } from "node:test";
import assert from "node:assert/strict";
import { isOwnAvatarUrl } from "../src/account-rules.js";

test("only this project's avatars/<userId>/ URLs are accepted", () => {
  const base = "https://p.supabase.co";
  const own = `${base}/storage/v1/object/public/avatars/u1/123.png`;
  assert.equal(isOwnAvatarUrl(own, base, "u1"), true);
  for (const bad of [
    `${base}/storage/v1/object/public/avatars/u2/123.png`,
    `https://evil.example/storage/v1/object/public/avatars/u1/x.png`,
    `${base}/storage/v1/object/public/avatars/u1/../u2/x.png`,
    `${base}/storage/v1/object/public/avatars/u1/a/b.png`,
    `${base}/storage/v1/object/public/avatars/u1/x.png?next=1`,
    "javascript:alert(1)",
    null,
    42,
  ])
    assert.equal(isOwnAvatarUrl(bad, base, "u1"), false);
});
