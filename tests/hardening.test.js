import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateRisk,
  estimateExecution
} from "../src/core.js";


test("NaN position state fails closed", () => {
  const result = evaluateRisk(
    {
      symbol: "AAPL",
      quantity: 1,
      price: 100,
      side: "BUY"
    },
    {
      currentPosition: NaN,
      dailyLoss: 0
    },
    {
      maxPositionNotional: 10000,
      maxAbsolutePosition: 100,
      maxDailyLoss: 1000
    }
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_RISK_STATE"
    )
  );
});


test("infinite position state fails closed", () => {
  const result = evaluateRisk(
    {
      symbol: "AAPL",
      quantity: 1,
      price: 100,
      side: "BUY"
    },
    {
      currentPosition: Infinity,
      dailyLoss: 0
    },
    {
      maxAbsolutePosition: 100
    }
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_RISK_STATE"
    )
  );
});


test("NaN daily loss state fails closed", () => {
  const result = evaluateRisk(
    {
      symbol: "AAPL",
      quantity: 1,
      price: 100,
      side: "BUY"
    },
    {
      currentPosition: 0,
      dailyLoss: NaN
    },
    {
      maxDailyLoss: 1000
    }
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_RISK_STATE"
    )
  );
});


test("invalid execution order fails closed", () => {
  const result = estimateExecution(
    {
      side: "BUY",
      price: NaN,
      quantity: 10
    },
    {
      spreadBps: 20,
      slippageBps: 10
    }
  );

  assert.equal(result.valid, false);

  assert.equal(
    result.error,
    "INVALID_EXECUTION_ORDER"
  );
});


test("infinite execution market data fails closed", () => {
  const result = estimateExecution(
    {
      side: "BUY",
      price: 100,
      quantity: 10
    },
    {
      spreadBps: Infinity,
      slippageBps: 10
    }
  );

  assert.equal(result.valid, false);

  assert.equal(
    result.error,
    "INVALID_EXECUTION_MARKET"
  );
});


test("invalid execution side fails closed", () => {
  const result = estimateExecution(
    {
      side: "HOLD",
      price: 100,
      quantity: 10
    },
    {
      spreadBps: 10,
      slippageBps: 10
    }
  );

  assert.equal(result.valid, false);

  assert.equal(
    result.error,
    "INVALID_EXECUTION_SIDE"
  );
});