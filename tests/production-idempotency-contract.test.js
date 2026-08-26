import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const has = (text, needle) =>
  assert.equal(
    text.includes(needle),
    true,
    `Missing production idempotency contract: ${needle}`
  );

test("production entrypoint routes paper orders through the durable idempotency binding", () => {
  const entry = read("worker-idempotent-entry.js");
  const wrangler = read("wrangler.toml");

  has(wrangler, 'main = "worker-idempotent-entry.js"');
  has(wrangler, 'name = "IDEMPOTENCY"');
  has(entry, "env.IDEMPOTENCY");
  has(entry, "idFromName");
  has(entry, "/reserve");
  has(entry, "Duplicate paper order rejected");
  has(entry, "Idempotency storage unavailable");
});

test("production idempotency scope does not trust a client-supplied user identity over Access", () => {
  const entry = read("worker-idempotent-entry.js");

  const accessIndex = entry.indexOf("ctx.access.getIdentity");
  const headerIndex = entry.indexOf("x-nexahunter-user");

  assert.ok(accessIndex >= 0);
  assert.ok(headerIndex >= 0);
  assert.ok(accessIndex < headerIndex);
});
