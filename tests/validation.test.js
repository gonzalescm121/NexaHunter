import test from "node:test";
import assert from "node:assert/strict";

import worker from "../worker.js";

const BASE_URL = "https://nexahunter.test";

async function request(path, options = {}) {
  const request = new Request(`${BASE_URL}${path}`, options);
  return worker.fetch(request);
}

async function jsonRequest(body, headers = {}) {
  return request("/api/paper-orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

async function readJson(response) {
  return response.json();
}

/*
========================================================
HEALTH
========================================================
*/

test("health endpoint returns healthy paper-mode status", async () => {
  const response = await request("/health");

  assert.equal(response.status, 200);

  const data = await readJson(response);

  assert.equal(data.status, "ok");
  assert.equal(data.app, "NexaHunter");
  assert.equal(data.mode, "paper");
  assert.equal(data.liveExecution, false);
  assert.ok(data.timestamp);

  assert.equal(
    response.headers.get("cache-control"),
    "no-store"
  );
});

/*
========================================================
VALID PAPER ORDER
========================================================
*/

test("valid BUY paper order is accepted", async () => {
  const response = await jsonRequest({
    symbol: "AAPL",
    quantity: 10,
    price: 100.25,
    side: "BUY"
  });

  assert.equal(response.status, 200);

  const data = await readJson(response);

  assert.equal(data.accepted, true);
  assert.equal(data.order.symbol, "AAPL");
  assert.equal(data.order.quantity, 10);
  assert.equal(data.order.price, 100.25);
  assert.equal(data.order.side, "BUY");
  assert.equal(data.order.mode, "PAPER");
  assert.equal(data.order.liveExecution, false);
  assert.ok(data.order.id);
});

/*
========================================================
SELL ORDER
========================================================
*/

test("valid SELL paper order is accepted", async () => {
  const response = await jsonRequest({
    symbol: "MSFT",
    quantity: 5,
    price: 500,
    side: "SELL"
  });

  assert.equal(response.status, 200);

  const data = await readJson(response);

  assert.equal(data.accepted, true);
  assert.equal(data.order.side, "SELL");
});

/*
========================================================
INVALID PAYLOADS
========================================================
*/

test("missing request body is rejected", async () => {
  const response = await request("/api/paper-orders", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(null)
  });

  assert.equal(response.status, 400);

  const data = await readJson(response);

  assert.equal(data.accepted, false);
  assert.ok(data.error);
});

test("malformed JSON is rejected", async () => {
  const response = await request("/api/paper-orders", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: "{invalid-json"
  });

  assert.equal(response.status, 400);

  const data = await readJson(response);

  assert.equal(data.accepted, false);
  assert.match(data.error, /JSON/i);
});

/*
========================================================
SYMBOL VALIDATION
========================================================
*/

test("missing symbol is rejected", async () => {
  const response = await jsonRequest({
    quantity: 1,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("invalid symbol characters are rejected", async () => {
  const response = await jsonRequest({
    symbol: "AAPL<script>",
    quantity: 1,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("symbol beginning with a number is rejected", async () => {
  const response = await jsonRequest({
    symbol: "123ABC",
    quantity: 1,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("symbol longer than ten characters is rejected", async () => {
  const response = await jsonRequest({
    symbol: "ABCDEFGHIJK",
    quantity: 1,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

/*
========================================================
QUANTITY VALIDATION
========================================================
*/

test("zero quantity is rejected", async () => {
  const response = await jsonRequest({
    symbol: "AAPL",
    quantity: 0,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("negative quantity is rejected", async () => {
  const response = await jsonRequest({
    symbol: "AAPL",
    quantity: -1,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("fractional quantity is rejected", async () => {
  const response = await jsonRequest({
    symbol: "AAPL",
    quantity: 1.5,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("quantity above maximum is rejected", async () => {
  const response = await jsonRequest({
    symbol: "AAPL",
    quantity: 1000001,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("NaN quantity is rejected", async () => {
  const response = await jsonRequest({
    symbol: "AAPL",
    quantity: "not-a-number",
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("Infinity quantity is rejected", async () => {
  const response = await jsonRequest({
    symbol: "AAPL",
    quantity: "Infinity",
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

/*
========================================================
PRICE VALIDATION
========================================================
*/

test("zero price is rejected", async () => {
  const response = await jsonRequest({
    symbol: "AAPL",
    quantity: 1,
    price: 0,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("negative price is rejected", async () => {
  const response = await jsonRequest({
    symbol: "AAPL",
    quantity: 1,
    price: -100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("price above maximum is rejected", async () => {
  const response = await jsonRequest({
    symbol: "AAPL",
    quantity: 1,
    price: 1000000001,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("NaN price is rejected", async () => {
  const response = await jsonRequest({
    symbol: "AAPL",
    quantity: 1,
    price: "not-a-number",
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("Infinity price is rejected", async () => {
  const response = await jsonRequest({
    symbol: "AAPL",
    quantity: 1,
    price: "Infinity",
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

/*
========================================================
SIDE VALIDATION
========================================================
*/

test("invalid side is rejected", async () => {
  const response = await jsonRequest({
    symbol: "AAPL",
    quantity: 1,
    price: 100,
    side: "HOLD"
  });

  assert.equal(response.status, 400);
});

test("lowercase buy is normalized and accepted", async () => {
  const response = await jsonRequest({
    symbol: "AAPL",
    quantity: 2,
    price: 100,
    side: "buy"
  });

  assert.equal(response.status, 200);

  const data = await readJson(response);

  assert.equal(data.order.side, "BUY");
});

/*
========================================================
TIMESTAMP SECURITY
========================================================
*/

test("invalid timestamp is rejected", async () => {
  const response = await jsonRequest({
    symbol: "GOOG",
    quantity: 1,
    price: 100,
    side: "BUY",
    timestamp: "not-a-date"
  });

  assert.equal(response.status, 400);
});

test("future timestamp is rejected", async () => {
  const future = new Date(
    Date.now() + 60 * 60 * 1000
  ).toISOString();

  const response = await jsonRequest({
    symbol: "GOOG",
    quantity: 1,
    price: 100,
    side: "BUY",
    timestamp: future
  });

  assert.equal(response.status, 400);

  const data = await readJson(response);

  assert.match(
    data.error,
    /future timestamp/i
  );
});

test("current timestamp is accepted", async () => {
  const response = await jsonRequest({
    symbol: "AMZN",
    quantity: 1,
    price: 100,
    side: "BUY",
    timestamp: new Date().toISOString()
  });

  assert.equal(response.status, 200);
});

/*
========================================================
DUPLICATE ORDER PROTECTION
========================================================
*/

test("duplicate logical paper order is rejected", async () => {
  const order = {
    symbol: "DUPTEST",
    quantity: 7,
    price: 123.45,
    side: "BUY"
  };

  const first = await jsonRequest(order);

  assert.equal(first.status, 200);

  const second = await jsonRequest(order);

  assert.equal(second.status, 409);

  const data = await readJson(second);

  assert.equal(data.accepted, false);
  assert.match(
    data.error,
    /duplicate/i
  );
});

test("different order parameters are not duplicates", async () => {
  const first = await jsonRequest({
    symbol: "DIFFTEST",
    quantity: 1,
    price: 100,
    side: "BUY"
  });

  assert.equal(first.status, 200);

  const second = await jsonRequest({
    symbol: "DIFFTEST",
    quantity: 2,
    price: 100,
    side: "BUY"
  });

  assert.equal(second.status, 200);
});

/*
========================================================
HTTP METHOD PROTECTION
========================================================
*/

test("GET paper-order endpoint is rejected", async () => {
  const response = await request(
    "/api/paper-orders",
    {
      method: "GET"
    }
  );

  assert.equal(response.status, 404);
});

test("PUT paper-order endpoint is rejected", async () => {
  const response = await request(
    "/api/paper-orders",
    {
      method: "PUT"
    }
  );

  assert.equal(response.status, 404);
});

test("DELETE paper-order endpoint is rejected", async () => {
  const response = await request(
    "/api/paper-orders",
    {
      method: "DELETE"
    }
  );

  assert.equal(response.status, 404);
});

/*
========================================================
ROUTING
========================================================
*/

test("unknown route returns 404", async () => {
  const response = await request("/does-not-exist");

  assert.equal(response.status, 404);

  const text = await response.text();

  assert.match(
    text,
    /route not found/i
  );
});

/*
========================================================
SECURITY HEADERS
========================================================
*/

test("health response includes security headers", async () => {
  const response = await request("/health");

  assert.equal(
    response.headers.get(
      "x-content-type-options"
    ),
    "nosniff"
  );

  assert.equal(
    response.headers.get(
      "x-frame-options"
    ),
    "DENY"
  );

  assert.equal(
    response.headers.get(
      "referrer-policy"
    ),
    "no-referrer"
  );
});

test("paper order response includes security headers", async () => {
  const response = await jsonRequest({
    symbol: "SECURITY",
    quantity: 1,
    price: 10,
    side: "BUY"
  });

  assert.equal(
    response.headers.get(
      "x-content-type-options"
    ),
    "nosniff"
  );

  assert.equal(
    response.headers.get(
      "x-frame-options"
    ),
    "DENY"
  );
});

/*
========================================================
LIVE EXECUTION SAFETY
========================================================
*/

test("health endpoint confirms live execution is disabled", async () => {
  const response = await request("/health");

  const data = await readJson(response);

  assert.equal(
    data.liveExecution,
    false
  );

  assert.equal(
    data.mode,
    "paper"
  );
});

test("paper order cannot enable live execution", async () => {
  const response = await jsonRequest({
    symbol: "SAFE",
    quantity: 1,
    price: 100,
    side: "BUY",
    liveExecution: true,
    mode: "LIVE"
  });

  assert.equal(response.status, 200);

  const data = await readJson(response);

  assert.equal(
    data.order.mode,
    "PAPER"
  );

  assert.equal(
    data.order.liveExecution,
    false
  );
});

/*
========================================================
BOUNDARY TESTS
========================================================
*/

test("minimum valid quantity is accepted", async () => {
  const response = await jsonRequest({
    symbol: "MINQTY",
    quantity: 1,
    price: 1,
    side: "BUY"
  });

  assert.equal(response.status, 200);
});

test("maximum allowed quantity is accepted", async () => {
  const response = await jsonRequest({
    symbol: "MAXQTY",
    quantity: 1000000,
    price: 1,
    side: "BUY"
  });

  assert.equal(response.status, 200);
});

test("maximum allowed price is accepted", async () => {
  const response = await jsonRequest({
    symbol: "MAXPRICE",
    quantity: 1,
    price: 1000000000,
    side: "BUY"
  });

  assert.equal(response.status, 200);
});

/*
========================================================
STRING/NORMALIZATION TESTS
========================================================
*/

test("symbol whitespace is normalized", async () => {
  const response = await jsonRequest({
    symbol: "  NORMAL  ",
    quantity: 1,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 200);

  const data = await readJson(response);

  assert.equal(
    data.order.symbol,
    "NORMAL"
  );
});

test("side whitespace is normalized", async () => {
  const response = await jsonRequest({
    symbol: "WHITESIDE",
    quantity: 1,
    price: 100,
    side: " BUY "
  });

  assert.equal(response.status, 200);

  const data = await readJson(response);

  assert.equal(
    data.order.side,
    "BUY"
  );
});

/*
========================================================
FINAL SAFETY INVARIANTS
========================================================
*/

test("accepted order always contains a generated ID", async () => {
  const response = await jsonRequest({
    symbol: "IDTEST",
    quantity: 1,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 200);

  const data = await readJson(response);

  assert.equal(typeof data.order.id, "string");
  assert.ok(data.order.id.length > 0);
});

test("accepted orders always remain PAPER mode", async () => {
  const response = await jsonRequest({
    symbol: "PAPERONLY",
    quantity: 3,
    price: 50,
    side: "SELL"
  });

  assert.equal(response.status, 200);

  const data = await readJson(response);

  assert.equal(data.order.mode, "PAPER");
  assert.equal(data.order.liveExecution, false);
});