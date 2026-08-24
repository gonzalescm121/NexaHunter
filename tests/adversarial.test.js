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

async function readJson(response) {
  return response.json();
}

/*
========================================================
ADVERSARIAL ROUTING
========================================================
*/

test("HEAD health endpoint is rejected with 405", async () => {
  const response = await request("/health", {
    method: "HEAD"
  });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
});

test("OPTIONS health endpoint is rejected with 405", async () => {
  const response = await request("/health", {
    method: "OPTIONS"
  });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
});

test("PATCH paper-order endpoint is rejected with 405", async () => {
  const response = await request("/api/paper-orders", {
    method: "PATCH"
  });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
});

test("OPTIONS paper-order endpoint is rejected with 405", async () => {
  const response = await request("/api/paper-orders", {
    method: "OPTIONS"
  });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
});

/*
========================================================
QUERY STRING ROUTING
========================================================
*/

test("health routing ignores query string", async () => {
  const response = await request(
    "/health?probe=1&source=adversarial"
  );

  assert.equal(response.status, 200);

  const data = await readJson(response);

  assert.equal(data.status, "ok");
});

test("paper-order routing works with query string", async () => {
  const response = await request(
    "/api/paper-orders?source=test",
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        symbol: "QUERY01",
        quantity: 1,
        price: 17,
        side: "BUY"
      })
    }
  );

  assert.equal(response.status, 200);
});

/*
========================================================
SYMBOL HARDENING
========================================================
*/

test("unicode symbol is rejected", async () => {
  const response = await jsonRequest({
    symbol: "AAPL€",
    quantity: 1,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("newline injection in symbol is rejected", async () => {
  const response = await jsonRequest({
    symbol: "AAPL\nX",
    quantity: 1,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("symbol containing only punctuation is rejected", async () => {
  const response = await jsonRequest({
    symbol: "///",
    quantity: 1,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("mixed-case symbol is normalized", async () => {
  const response = await jsonRequest({
    symbol: "  adVeRsArY1  ",
    quantity: 1,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 200);

  const data = await readJson(response);

  assert.equal(data.order.symbol, "ADVERSARY1");
});

/*
========================================================
NUMERIC TYPE HARDENING
========================================================
*/

test("boolean quantity is rejected", async () => {
  const response = await jsonRequest({
    symbol: "BOOLQTY",
    quantity: true,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("boolean price is rejected", async () => {
  const response = await jsonRequest({
    symbol: "BOOLPRC",
    quantity: 1,
    price: true,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("null quantity is rejected", async () => {
  const response = await jsonRequest({
    symbol: "NULLQTY",
    quantity: null,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("null price is rejected", async () => {
  const response = await jsonRequest({
    symbol: "NULLPRC",
    quantity: 1,
    price: null,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("non-numeric quantity string is rejected", async () => {
  const response = await jsonRequest({
    symbol: "STRQTY",
    quantity: "not-a-number",
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

test("negative zero quantity is rejected", async () => {
  const response = await jsonRequest({
    symbol: "NEGZERO",
    quantity: -0,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 400);
});

/*
========================================================
TIMESTAMP HARDENING
========================================================
*/

test("invalid numeric-like timestamp is rejected", async () => {
  const response = await jsonRequest({
    symbol: "NUMTIME",
    quantity: 1,
    price: 100,
    side: "BUY",
    timestamp: "not-a-date"
  });

  assert.equal(response.status, 400);
});

test("old timestamp is accepted when otherwise valid", async () => {
  const response = await jsonRequest({
    symbol: "OLDTIME",
    quantity: 1,
    price: 100,
    side: "BUY",
    timestamp: "2020-01-01T00:00:00.000Z"
  });

  assert.equal(response.status, 200);
});

/*
========================================================
PAPER-MODE TAMPERING
========================================================
*/

test("hostile live-control fields cannot change paper mode", async () => {
  const response = await jsonRequest({
    symbol: "TAMPER01",
    quantity: 1,
    price: 100,
    side: "BUY",
    mode: "LIVE",
    liveExecution: true,
    executeLive: true,
    paper: false,
    environment: "production"
  });

  assert.equal(response.status, 200);

  const data = await readJson(response);

  assert.equal(data.order.mode, "PAPER");
  assert.equal(data.order.liveExecution, false);
  assert.equal(data.order.executeLive, undefined);
});

/*
========================================================
RESPONSE SECURITY
========================================================
*/

test("405 responses consistently include security headers", async () => {
  const response = await request("/api/paper-orders", {
    method: "PATCH"
  });

  assert.equal(response.status, 405);

  assert.equal(
    response.headers.get("x-content-type-options"),
    "nosniff"
  );

  assert.equal(
    response.headers.get("x-frame-options"),
    "DENY"
  );

  assert.equal(
    response.headers.get("referrer-policy"),
    "no-referrer"
  );

  assert.equal(
    response.headers.get("content-security-policy") !== null,
    true
  );
});

test("root application response includes security headers", async () => {
  const response = await request("/");

  assert.equal(response.status, 200);

  assert.match(
    response.headers.get("content-type") || "",
    /text\/html/i
  );

  assert.equal(
    response.headers.get("x-content-type-options"),
    "nosniff"
  );

  assert.equal(
    response.headers.get("x-frame-options"),
    "DENY"
  );

  assert.equal(
    response.headers.get("referrer-policy"),
    "no-referrer"
  );

  assert.equal(
    response.headers.get("cache-control"),
    "no-store"
  );
});

/*
========================================================
UNKNOWN ROUTE
========================================================
*/

test("unknown route remains 404 regardless of query string", async () => {
  const response = await request(
    "/definitely-not-a-route?method=POST"
  );

  assert.equal(response.status, 404);

  assert.equal(
    response.headers.get("cache-control"),
    "no-store"
  );

  const text = await response.text();

  assert.match(
    text,
    /route not found/i
  );
});