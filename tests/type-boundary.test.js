import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateRisk,
  estimateExecution
} from "../src/core.js";

const validLimits = {
  maxOrderNotional: 5000,
  maxPositionNotional: 10000,
  maxAbsolutePosition: 100,
  maxDailyLoss: 1000
};

const validState = {
  currentPosition: 0,
  dailyLoss: 0
};

const validOrder = {
  symbol: "AAPL",
  quantity: 10,
  price: 100,
  side: "BUY"
};

test("risk engine rejects NaN quantity", () => {
  const result = evaluateRisk(
    { ...validOrder, quantity: NaN },
    validState,
    validLimits
  );

  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("INVALID_QUANTITY"));
});

test("risk engine rejects Infinity quantity", () => {
  const result = evaluateRisk(
    { ...validOrder, quantity: Infinity },
    validState,
    validLimits
  );

  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("INVALID_QUANTITY"));
});

test("risk engine rejects negative quantity", () => {
  const result = evaluateRisk(
    { ...validOrder, quantity: -10 },
    validState,
    validLimits
  );

  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("INVALID_QUANTITY"));
});

test("risk engine rejects fractional quantity", () => {
  const result = evaluateRisk(
    { ...validOrder, quantity: 10.5 },
    validState,
    validLimits
  );

  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("INVALID_QUANTITY"));
});

test("risk engine rejects zero quantity", () => {
  const result = evaluateRisk(
    { ...validOrder, quantity: 0 },
    validState,
    validLimits
  );

  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("INVALID_QUANTITY"));
});

test("risk engine rejects NaN price", () => {
  const result = evaluateRisk(
    { ...validOrder, price: NaN },
    validState,
    validLimits
  );

  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("INVALID_PRICE"));
});

test("risk engine rejects Infinity price", () => {
  const result = evaluateRisk(
    { ...validOrder, price: Infinity },
    validState,
    validLimits
  );

  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("INVALID_PRICE"));
});

test("risk engine rejects negative price", () => {
  const result = evaluateRisk(
    { ...validOrder, price: -100 },
    validState,
    validLimits
  );

  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("INVALID_PRICE"));
});

test("risk engine rejects invalid side", () => {
  const result = evaluateRisk(
    { ...validOrder, side: "HOLD" },
    validState,
    validLimits
  );

  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("INVALID_SIDE"));
});

test("risk engine fails closed on invalid state", () => {
  const result = evaluateRisk(
    validOrder,
    {
      currentPosition: NaN,
      dailyLoss: 0
    },
    validLimits
  );

  assert.equal(result.allowed, false);
  assert.ok(
    result.reasons.includes("INVALID_RISK_STATE")
  );
});

test("risk engine fails closed on infinite state", () => {
  const result = evaluateRisk(
    validOrder,
    {
      currentPosition: Infinity,
      dailyLoss: 0
    },
    validLimits
  );

  assert.equal(result.allowed, false);
  assert.ok(
    result.reasons.includes("INVALID_RISK_STATE")
  );
});

test("risk engine rejects NaN risk limit", () => {
  const result = evaluateRisk(
    validOrder,
    validState,
    {
      ...validLimits,
      maxOrderNotional: NaN
    }
  );

  assert.equal(result.allowed, false);
  assert.ok(
    result.reasons.includes(
      "INVALID_RISK_LIMIT_MAXORDERNOTIONAL"
    )
  );
});

test("risk engine rejects infinite risk limit", () => {
  const result = evaluateRisk(
    validOrder,
    validState,
    {
      ...validLimits,
      maxOrderNotional: Infinity
    }
  );

  assert.equal(result.allowed, false);
  assert.ok(
    result.reasons.includes(
      "INVALID_RISK_LIMIT_MAXORDERNOTIONAL"
    )
  );
});

test("risk engine rejects negative risk limit", () => {
  const result = evaluateRisk(
    validOrder,
    validState,
    {
      ...validLimits,
      maxOrderNotional: -1
    }
  );

  assert.equal(result.allowed, false);
  assert.ok(
    result.reasons.includes(
      "INVALID_RISK_LIMIT_MAXORDERNOTIONAL"
    )
  );
});

test("execution engine rejects NaN price", () => {
  const result = estimateExecution(
    { ...validOrder, price: NaN },
    {}
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_ORDER"
  );
});

test("execution engine rejects Infinity price", () => {
  const result = estimateExecution(
    { ...validOrder, price: Infinity },
    {}
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_ORDER"
  );
});

test("execution engine rejects zero quantity", () => {
  const result = estimateExecution(
    { ...validOrder, quantity: 0 },
    {}
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_ORDER"
  );
});

test("execution engine rejects fractional quantity", () => {
  const result = estimateExecution(
    { ...validOrder, quantity: 1.5 },
    {}
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_ORDER"
  );
});

test("execution engine rejects invalid side", () => {
  const result = estimateExecution(
    { ...validOrder, side: "HOLD" },
    {}
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_SIDE"
  );
});

test("execution engine rejects NaN spread", () => {
  const result = estimateExecution(
    validOrder,
    { spreadBps: NaN }
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_MARKET"
  );
});

test("execution engine rejects infinite slippage", () => {
  const result = estimateExecution(
    validOrder,
    { slippageBps: Infinity }
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_MARKET"
  );
});

test("execution engine rejects negative latency", () => {
  const result = estimateExecution(
    validOrder,
    { latencyMs: -1 }
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_MARKET"
  );
});

test("valid numeric inputs remain accepted", () => {
  const risk = evaluateRisk(
    validOrder,
    validState,
    validLimits
  );

  assert.equal(risk.allowed, true);

  const execution = estimateExecution(
    validOrder,
    {
      spreadBps: 10,
      slippageBps: 5,
      latencyMs: 20
    }
  );

  assert.equal(execution.valid, true);
});