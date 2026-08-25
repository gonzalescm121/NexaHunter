import test from "node:test";
import assert from "node:assert/strict";

import worker from "../worker.js";

const BASE_URL = "https://nexahunter.test";

function request(path, options = {}) {
  return worker.fetch(
    new Request(`${BASE_URL}${path}`, options)
  );
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

/*
========================================================
EDGE-CASE VALIDATION
========================================================
*/

test("array request body is rejected", async () => {
  const response = await jsonRequest([
    "AAPL",
    1,
    100,
    "BUY"
  ]);

  assert.equal(response.status, 400);

  const data = await response.json();

  assert.equal(data.accepted, false);
});

test("object symbol is rejected", async () => {
  const response = await jsonRequest({
    symbol: {
      value: "AAPL"
    },
    quantity: 1,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("object quantity is rejected", async () => {
  const response = await jsonRequest({
    symbol: "OBJQTY",
    quantity: {
      value: 1
    },
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("object price is rejected", async () => {
  const response = await jsonRequest({
    symbol: "OBJPRC",
    quantity: 1,
    price: {
      value: 100
    },
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("boolean side is rejected", async () => {
  const response = await jsonRequest({
    symbol: "BOOLSIDE",
    quantity: 1,
    price: 100,
    side: true
  });

  assert.equal(response.status, 400);
});

test("whitespace-only side is rejected", async () => {
  const response = await jsonRequest({
    symbol: "WHITESIDE",
    quantity: 1,
    price: 100,
    side: "   "
  });

  assert.equal(response.status, 400);
});

test("BTC/USD-style symbol is accepted", async () => {
  const response = await jsonRequest({
    symbol: "BTC/USD",
    quantity: 1,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 200);

  const data = await response.json();

  assert.equal(
    data.order.symbol,
    "BTC/USD"
  );
});

test("duplicate protection uses normalized symbol", async () => {
  const first = await jsonRequest({
    symbol: "  NORMDUP  ",
    quantity: 3,
    price: 77.25,
    side: "buy"
  });

  assert.equal(first.status, 200);

  const second = await jsonRequest({
    symbol: "NORMDUP",
    quantity: 3,
    price: 77.25,
    side: "BUY"
  });

  assert.equal(second.status, 409);

  const data = await second.json();

  assert.equal(
    data.accepted,
    false
  );

  assert.match(
    data.error,
    /duplicate/i
  );
});

test("application/json with parameters remains accepted", async () => {
  const response = await jsonRequest(
    {
      symbol: "JSONPARAM",
      quantity: 1,
      price: 11,
      side: "BUY"
    },
    {
      "content-type":
        "application/json; charset=UTF-8"
    }
  );

  assert.equal(
    response.status,
    200
  );
});

test("boolean timestamp is rejected", async () => {
  const response = await jsonRequest({
    symbol: "BOOLTIME",
    quantity: 1,
    price: 100,
    side: "BUY",
    timestamp: true
  });

  assert.equal(
    response.status,
    400
  );
});