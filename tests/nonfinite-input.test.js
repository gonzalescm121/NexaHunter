import test from "node:test";
import assert from "node:assert/strict";

import {
  validateBar,
  evaluateRisk,
  estimateExecution
} from "../src/core.js";


/*
========================================================
NON-FINITE INPUT HARDENING
========================================================
*/


test("validateBar rejects NaN timestamp", () => {
  const result = validateBar({
    symbol: "AAPL",
    timestamp: NaN,
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: 1000
  });

  assert.equal(result.status, "REJECT");
  assert.equal(result.valid, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_TIMESTAMP"
    )
  );
});


test("validateBar rejects Infinity timestamp", () => {
  const result = validateBar({
    symbol: "AAPL",
    timestamp: Infinity,
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: 1000
  });

  assert.equal(result.status, "REJECT");
  assert.equal(result.valid, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_TIMESTAMP"
    )
  );
});


test("validateBar rejects NaN price", () => {
  const result = validateBar({
    symbol: "AAPL",
    timestamp: Date.now(),
    open: NaN,
    high: 101,
    low: 99,
    close: 100,
    volume: 1000
  });

  assert.equal(result.status, "REJECT");
  assert.equal(result.valid, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_PRICE"
    )
  );
});


test("validateBar rejects Infinity price", () => {
  const result = validateBar({
    symbol: "AAPL",
    timestamp: Date.now(),
    open: 100,
    high: Infinity,
    low: 99,
    close: 100,
    volume: 1000
  });

  assert.equal(result.status, "REJECT");
  assert.equal(result.valid, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_PRICE"
    )
  );
});


test("validateBar rejects NaN volume", () => {
  const result = validateBar({
    symbol: "AAPL",
    timestamp: Date.now(),
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: NaN
  });

  assert.equal(result.status, "REJECT");
  assert.equal(result.valid, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_VOLUME"
    )
  );
});


test("validateBar rejects Infinity volume", () => {
  const result = validateBar({
    symbol: "AAPL",
    timestamp: Date.now(),
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: Infinity
  });

  assert.equal(result.status, "REJECT");
  assert.equal(result.valid, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_VOLUME"
    )
  );
});


/*
========================================================
RISK ENGINE NON-FINITE ORDER INPUTS
========================================================
*/


test("evaluateRisk rejects NaN quantity", () => {
  const result = evaluateRisk(
    {
      symbol: "AAPL",
      quantity: NaN,
      price: 100,
      side: "BUY"
    },
    {
      currentPosition: 0,
      dailyLoss: 0
    },
    {}
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_QUANTITY"
    )
  );

  assert.ok(
    result.reasons.includes(
      "RISK_CALCULATION_OVERFLOW"
    )
  );
});


test("evaluateRisk rejects Infinity quantity", () => {
  const result = evaluateRisk(
    {
      symbol: "AAPL",
      quantity: Infinity,
      price: 100,
      side: "BUY"
    },
    {
      currentPosition: 0,
      dailyLoss: 0
    },
    {}
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_QUANTITY"
    )
  );

  assert.ok(
    result.reasons.includes(
      "RISK_CALCULATION_OVERFLOW"
    )
  );
});


test("evaluateRisk rejects NaN price", () => {
  const result = evaluateRisk(
    {
      symbol: "AAPL",
      quantity: 10,
      price: NaN,
      side: "BUY"
    },
    {
      currentPosition: 0,
      dailyLoss: 0
    },
    {}
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_PRICE"
    )
  );

  assert.ok(
    result.reasons.includes(
      "RISK_CALCULATION_OVERFLOW"
    )
  );
});


test("evaluateRisk rejects Infinity price", () => {
  const result = evaluateRisk(
    {
      symbol: "AAPL",
      quantity: 10,
      price: Infinity,
      side: "BUY"
    },
    {
      currentPosition: 0,
      dailyLoss: 0
    },
    {}
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_PRICE"
    )
  );

  assert.ok(
    result.reasons.includes(
      "RISK_CALCULATION_OVERFLOW"
    )
  );
});


/*
========================================================
RISK STATE NON-FINITE INPUTS
========================================================
*/


test("evaluateRisk rejects NaN current position", () => {
  const result = evaluateRisk(
    {
      quantity: 10,
      price: 100,
      side: "BUY"
    },
    {
      currentPosition: NaN,
      dailyLoss: 0
    },
    {}
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_RISK_STATE"
    )
  );
});


test("evaluateRisk rejects Infinity current position", () => {
  const result = evaluateRisk(
    {
      quantity: 10,
      price: 100,
      side: "BUY"
    },
    {
      currentPosition: Infinity,
      dailyLoss: 0
    },
    {}
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_RISK_STATE"
    )
  );
});


test("evaluateRisk rejects NaN daily loss", () => {
  const result = evaluateRisk(
    {
      quantity: 10,
      price: 100,
      side: "BUY"
    },
    {
      currentPosition: 0,
      dailyLoss: NaN
    },
    {}
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_RISK_STATE"
    )
  );
});


test("evaluateRisk rejects Infinity daily loss", () => {
  const result = evaluateRisk(
    {
      quantity: 10,
      price: 100,
      side: "BUY"
    },
    {
      currentPosition: 0,
      dailyLoss: Infinity
    },
    {}
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_RISK_STATE"
    )
  );
});


/*
========================================================
EXECUTION ENGINE NON-FINITE INPUTS
========================================================
*/


test("estimateExecution rejects NaN price", () => {
  const result = estimateExecution(
    {
      quantity: 10,
      price: NaN,
      side: "BUY"
    },
    {}
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_ORDER"
  );
});


test("estimateExecution rejects Infinity price", () => {
  const result = estimateExecution(
    {
      quantity: 10,
      price: Infinity,
      side: "BUY"
    },
    {}
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_ORDER"
  );
});


test("estimateExecution rejects NaN quantity", () => {
  const result = estimateExecution(
    {
      quantity: NaN,
      price: 100,
      side: "BUY"
    },
    {}
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_ORDER"
  );
});


test("estimateExecution rejects Infinity quantity", () => {
  const result = estimateExecution(
    {
      quantity: Infinity,
      price: 100,
      side: "BUY"
    },
    {}
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_ORDER"
  );
});


test("estimateExecution rejects NaN spread", () => {
  const result = estimateExecution(
    {
      quantity: 10,
      price: 100,
      side: "BUY"
    },
    {
      spreadBps: NaN
    }
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_MARKET"
  );
});


test("estimateExecution rejects Infinity slippage", () => {
  const result = estimateExecution(
    {
      quantity: 10,
      price: 100,
      side: "BUY"
    },
    {
      slippageBps: Infinity
    }
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_MARKET"
  );
});


test("estimateExecution rejects NaN latency", () => {
  const result = estimateExecution(
    {
      quantity: 10,
      price: 100,
      side: "BUY"
    },
    {
      latencyMs: NaN
    }
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_MARKET"
  );
});


/*
========================================================
NORMAL INPUT STILL WORKS
========================================================
*/


test("normal finite inputs remain valid", () => {
  const result = estimateExecution(
    {
      quantity: 10,
      price: 100,
      side: "BUY"
    },
    {
      spreadBps: 10,
      slippageBps: 5,
      latencyMs: 20
    }
  );

  assert.equal(result.valid, true);
  assert.equal(
    result.side,
    "BUY"
  );

  assert.ok(
    Number.isFinite(
      result.executionPrice
    )
  );

  assert.ok(
    Number.isFinite(
      result.executionNotional
    )
  );
});