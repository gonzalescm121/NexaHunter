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

test("symbol whitespace is normalized", async () => {
  const response = await jsonRequest({
    symbol: "  NORMAL  ",
    quantity: 1,
    price: 100,
    side: "BUY"
  });

  assert.equal(response.status, 200);

  const data = await readJson(response);

  assert.equal(data.order.symbol, "NORMAL");
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

test("lowercase sell is normalized and accepted", async () => {
  const response = await jsonRequest({
    symbol: "MSFT",
    quantity: 2,
    price: 100,
    side: "sell"
  });

  assert.equal(response.status, 200);

  const data = await readJson(response);

  assert.equal(data.order.side, "SELL");
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

IMPORTANT:
worker.js returns 405 for unsupported methods.
These tests intentionally expect 405.
========================================================
*/

test("GET paper-order endpoint is rejected", async () => {
  const response = await request(
    "/api/paper-orders",
    {
      method: "GET"
    }
  );

  assert.equal(response.status, 405);

  const data = await readJson(response);

  assert.equal(data.accepted, false);
  assert.match(data.error, /method not allowed/i);
});

test("PUT paper-order endpoint is rejected", async () => {
  const response = await request(
    "/api/paper-orders",
    {
      method: "PUT"
    }
  );

  assert.equal(response.status, 405);

  const data = await readJson(response);

  assert.equal(data.accepted, false);
  assert.match(data.error, /method not allowed/i);
});

test("DELETE paper-order endpoint is rejected", async () => {
  const response = await request(
    "/api/paper-orders",
    {
      method: "DELETE"
    }
  );

  assert.equal(response.status, 405);

  const data = await readJson(response);

  assert.equal(data.accepted, false);
  assert.match(data.error, /method not allowed/i);
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

  assert.equal(
    response.headers.get(
      "permissions-policy"
    ),
    "camera=(), microphone=(), geolocation=()"
  );

  assert.equal(
    response.headers.get(
      "content-security-policy"
    ) !== null,
    true
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

  assert.equal(
    response.headers.get(
      "referrer-policy"
    ),
    "no-referrer"
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
    symbol: "MAXPRC",
    quantity: 1,
    price: 1000000000,
    side: "BUY"
  });

  assert.equal(response.status, 200);
});

/*
========================================================
CONTENT TYPE
========================================================
*/

test("missing content type is rejected", async () => {
  const response = await request(
    "/api/paper-orders",
    {
      method: "POST",
      body: JSON.stringify({
        symbol: "AAPL",
        quantity: 1,
        price: 100,
        side: "BUY"
      })
    }
  );

  assert.equal(response.status, 415);

  const data = await readJson(response);

  assert.equal(data.accepted, false);
  assert.match(
    data.error,
    /content-type/i
  );
});

test("text content type is rejected", async () => {
  const response = await request(
    "/api/paper-orders",
    {
      method: "POST",
      headers: {
        "content-type": "text/plain"
      },
      body: JSON.stringify({
        symbol: "AAPL",
        quantity: 1,
        price: 100,
        side: "BUY"
      })
    }
  );

  assert.equal(response.status, 415);
});

test("application/json with charset is accepted", async () => {
  const response = await request(
    "/api/paper-orders",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        symbol: "CHARSET",
        quantity: 1,
        price: 100,
        side: "BUY"
      })
    }
  );

  assert.equal(response.status, 200);
});

/*
========================================================
REQUEST SIZE PROTECTION
========================================================
*/

test("oversized request body is rejected", async () => {
  const hugeValue =
    "x".repeat(20000);

  const response = await jsonRequest({
    symbol: "BIG",
    quantity: 1,
    price: 100,
    side: "BUY",
    extra: hugeValue
  });

  assert.equal(response.status, 413);

  const data = await readJson(response);

  assert.equal(data.accepted, false);

  assert.match(
    data.error,
    /too large/i
  );
});

test("invalid content length is rejected", async () => {
  const response = await request(
    "/api/paper-orders",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
        "content-length":
          "not-a-number"
      },
      body: JSON.stringify({
        symbol: "AAPL",
        quantity: 1,
        price: 100,
        side: "BUY"
      })
    }
  );

  assert.equal(response.status, 400);

  const data = await readJson(response);

  assert.match(
    data.error,
    /content-length/i
  );
});

/*
========================================================
JSON DEPTH PROTECTION
========================================================
*/

test("excessively deep JSON is rejected", async () => {
  let value = {};

  for(let i = 0; i < 15; i++){
    value = {
      nested: value
    };
  }

  const response = await jsonRequest({
    symbol: "DEPTH",
    quantity: 1,
    price: 100,
    side: "BUY",
    data: value
  });

  assert.equal(response.status, 400);

  const data = await readJson(response);

  assert.match(
    data.error,
    /nesting/i
  );
});

/*
========================================================
METHOD PROTECTION ON HEALTH
========================================================
*/

test("POST health endpoint is rejected", async () => {
  const response = await request(
    "/health",
    {
      method: "POST"
    }
  );

  assert.equal(response.status, 405);

  const data = await readJson(response);

  assert.equal(data.accepted, false);
  assert.match(
    data.error,
    /method not allowed/i
  );
});

test("PUT health endpoint is rejected", async () => {
  const response = await request(
    "/health",
    {
      method: "PUT"
    }
  );

  assert.equal(response.status, 405);
});

test("DELETE health endpoint is rejected", async () => {
  const response = await request(
    "/health",
    {
      method: "DELETE"
    }
  );

  assert.equal(response.status, 405);
});
/*
========================================================
ALLOW HEADER VALIDATION
========================================================
*/

test("POST health endpoint includes Allow GET header", async () => {
  const response = await request(
    "/health",
    {
      method: "POST"
    }
  );

  assert.equal(response.status, 405);

  assert.equal(
    response.headers.get("allow"),
    "GET"
  );
});

test("PUT health endpoint includes Allow GET header", async () => {
  const response = await request(
    "/health",
    {
      method: "PUT"
    }
  );

  assert.equal(response.status, 405);

  assert.equal(
    response.headers.get("allow"),
    "GET"
  );
});

test("DELETE health endpoint includes Allow GET header", async () => {
  const response = await request(
    "/health",
    {
      method: "DELETE"
    }
  );

  assert.equal(response.status, 405);

  assert.equal(
    response.headers.get("allow"),
    "GET"
  );
});

test("GET paper-order endpoint includes Allow POST header", async () => {
  const response = await request(
    "/api/paper-orders",
    {
      method: "GET"
    }
  );

  assert.equal(response.status, 405);

  assert.equal(
    response.headers.get("allow"),
    "POST"
  );
});

test("PUT paper-order endpoint includes Allow POST header", async () => {
  const response = await request(
    "/api/paper-orders",
    {
      method: "PUT"
    }
  );

  assert.equal(response.status, 405);

  assert.equal(
    response.headers.get("allow"),
    "POST"
  );
});

test("DELETE paper-order endpoint includes Allow POST header", async () => {
  const response = await request(
    "/api/paper-orders",
    {
      method: "DELETE"
    }
  );

  assert.equal(response.status, 405);

  assert.equal(
    response.headers.get("allow"),
    "POST"
  );
});

/*
========================================================
RESPONSE FORMAT
========================================================
*/

test("successful paper order returns JSON", async () => {
  const response = await jsonRequest({
    symbol: "FORMAT",
    quantity: 1,
    price: 25,
    side: "BUY"
  });

  assert.equal(response.status, 200);

  const contentType =
    response.headers.get(
      "content-type"
    );

  assert.match(
    contentType,
    /application\/json/i
  );

  const data = await readJson(response);

  assert.equal(
    typeof data,
    "object"
  );

  assert.equal(
    data.accepted,
    true
  );

  assert.ok(data.order);
});

/*
========================================================
PAPER MODE ENFORCEMENT
========================================================
*/

test("live mode input is ignored", async () => {
  const response = await jsonRequest({
    symbol: "LIVEMODE",
    quantity: 1,
    price: 50,
    side: "BUY",
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

test("live execution input is ignored", async () => {
  const response = await jsonRequest({
    symbol: "LIVEFLAG",
    quantity: 1,
    price: 50,
    side: "BUY",
    liveExecution: true
  });

  assert.equal(response.status, 200);

  const data = await readJson(response);

  assert.equal(
    data.order.liveExecution,
    false
  );

  assert.equal(
    data.order.mode,
    "PAPER"
  );
});

/*
========================================================
ORDER ID
========================================================
*/

test("accepted order receives unique id", async () => {
  const first = await jsonRequest({
    symbol: "ORDERID1",
    quantity: 1,
    price: 10,
    side: "BUY"
  });

  const second = await jsonRequest({
    symbol: "ORDERID2",
    quantity: 1,
    price: 10,
    side: "BUY"
  });

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);

  const firstData = await readJson(first);
  const secondData = await readJson(second);

  assert.ok(firstData.order.id);
  assert.ok(secondData.order.id);

  assert.notEqual(
    firstData.order.id,
    secondData.order.id
  );
});

/*
========================================================
CACHE CONTROL
========================================================
*/

test("paper order response disables caching", async () => {
  const response = await jsonRequest({
    symbol: "CACHE",
    quantity: 1,
    price: 10,
    side: "BUY"
  });

  assert.equal(response.status, 200);

  assert.equal(
    response.headers.get(
      "cache-control"
    ),
    "no-store"
  );
});

test("unknown route disables caching", async () => {
  const response = await request(
    "/unknown-test-route"
  );

  assert.equal(response.status, 404);

  assert.equal(
    response.headers.get(
      "cache-control"
    ),
    "no-store"
  );
});

/*
========================================================
SECURITY HEADER CONSISTENCY
========================================================
*/

test("unknown route includes security headers", async () => {
  const response = await request(
    "/security-test-route"
  );

  assert.equal(response.status, 404);

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

/*
========================================================
FINAL SAFETY ASSERTION
========================================================
*/

test("NexaHunter remains paper trading only", async () => {
  const health = await request("/health");

  assert.equal(
    health.status,
    200
  );

  const data = await readJson(health);

  assert.equal(
    data.app,
    "NexaHunter"
  );

  assert.equal(
    data.mode,
    "paper"
  );

  assert.equal(
    data.liveExecution,
    false
  );
});