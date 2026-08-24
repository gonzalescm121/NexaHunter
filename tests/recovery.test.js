import test from "node:test";
import assert from "node:assert/strict";

async function sendOrder(worker, payload) {
  return worker.fetch(
    new Request(
      "https://nexahunter.test/api/paper-orders",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    )
  );
}

test("duplicate replay is rejected within one Worker instance", async () => {
  const { default: worker } =
    await import("../worker.js?recovery-single-instance");

  const payload = {
    symbol: "AAPL",
    quantity: 11,
    price: 123,
    side: "BUY"
  };

  const first =
    await sendOrder(worker, payload);

  assert.equal(first.status, 200);

  const second =
    await sendOrder(worker, payload);

  assert.equal(second.status, 409);

  const body =
    await second.json();

  assert.equal(
    body.accepted,
    false
  );

  assert.match(
    body.error,
    /Duplicate paper order rejected/
  );
});

test("duplicate replay must remain rejected after Worker restart", async () => {
  const payload = {
    symbol: "MSFT",
    quantity: 13,
    price: 321,
    side: "BUY"
  };

  /*
   * Import two independently-instantiated
   * Worker modules. This simulates two
   * isolated Worker instances/restarts.
   */

  const firstModule =
    await import(
      "../worker.js?restart-instance-one"
    );

  const secondModule =
    await import(
      "../worker.js?restart-instance-two"
    );

  const first =
    await sendOrder(
      firstModule.default,
      payload
    );

  assert.equal(
    first.status,
    200
  );

  const replay =
    await sendOrder(
      secondModule.default,
      payload
    );

  /*
   * This SHOULD be 409 once durable
   * idempotency is implemented.
   */

  assert.equal(
    replay.status,
    409
  );
});

test("different orders are not treated as duplicates", async () => {
  const {
    default: worker
  } = await import(
    "../worker.js?different-orders"
  );

  const first =
    await sendOrder(
      worker,
      {
        symbol: "NVDA",
        quantity: 5,
        price: 100,
        side: "BUY"
      }
    );

  const second =
    await sendOrder(
      worker,
      {
        symbol: "NVDA",
        quantity: 6,
        price: 100,
        side: "BUY"
      }
    );

  assert.equal(
    first.status,
    200
  );

  assert.equal(
    second.status,
    200
  );
});