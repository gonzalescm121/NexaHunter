import test from "node:test";
import assert from "node:assert/strict";

import worker from "../worker.js";

test("health endpoint reports paper mode and live execution disabled", async () => {
  const request = new Request("https://nexahunter.test/health");

  const response = await worker.fetch(request);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.mode, "paper");
  assert.equal(body.liveExecution, false);
});

test("valid paper order is accepted", async () => {
  const request = new Request(
    "https://nexahunter.test/api/paper-orders",
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        symbol: "MSFT",
        quantity: 5,
        price: 100,
        side: "BUY"
      })
    }
  );

  const response = await worker.fetch(request);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.accepted, true);
  assert.equal(body.order.mode, "PAPER");
  assert.equal(body.order.liveExecution, false);
});

test("invalid quantity is rejected by the Worker", async () => {
  const request = new Request(
    "https://nexahunter.test/api/paper-orders",
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        symbol: "AAPL",
        quantity: -10,
        price: 100,
        side: "BUY"
      })
    }
  );

  const response = await worker.fetch(request);

  assert.equal(response.status, 400);
});

test("invalid side is rejected by the Worker", async () => {
  const request = new Request(
    "https://nexahunter.test/api/paper-orders",
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        symbol: "AAPL",
        quantity: 1,
        price: 100,
        side: "HACK"
      })
    }
  );

  const response = await worker.fetch(request);

  assert.equal(response.status, 400);
});

test("duplicate paper order is rejected", async () => {
  const payload = {
    symbol: "NVDA",
    quantity: 7,
    price: 150,
    side: "BUY"
  };

  const first = await worker.fetch(
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

  assert.equal(first.status, 200);

  const second = await worker.fetch(
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

  assert.equal(second.status, 409);

  const body = await second.json();

  assert.match(
    body.error,
    /Duplicate paper order rejected/
  );
});

test("malformed JSON is rejected safely", async () => {
  const request = new Request(
    "https://nexahunter.test/api/paper-orders",
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: "{not-valid-json"
    }
  );

  const response = await worker.fetch(request);

  assert.equal(response.status, 400);
});

test("unknown route does not expose execution functionality", async () => {
  const request = new Request(
    "https://nexahunter.test/api/live-execution",
    {
      method: "POST"
    }
  );

  const response = await worker.fetch(request);

  assert.notEqual(response.status, 200);
});