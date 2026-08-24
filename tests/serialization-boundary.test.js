import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateRisk,
  estimateExecution
} from "../src/core.js";

function order(overrides = {}) {
  return {
    symbol: "AAPL",
    quantity: 10,
    price: 100,
    side: "BUY",
    ...overrides
  };
}

function limits(overrides = {}) {
  return {
    maxOrderNotional: 5000,
    maxPositionNotional: 10000,
    maxAbsolutePosition: 100,
    maxDailyLoss: 1000,
    ...overrides
  };
}

test("risk result is JSON serializable", () => {
  const result = evaluateRisk(
    order(),
    { currentPosition: 10, dailyLoss: 0 },
    limits()
  );

  assert.doesNotThrow(() => JSON.stringify(result));

  const parsed = JSON.parse(JSON.stringify(result));
  assert.deepEqual(parsed, result);
});

test("execution result is JSON serializable", () => {
  const result = estimateExecution(
    order(),
    { spreadBps: 10, slippageBps: 5, latencyMs: 20 }
  );

  assert.equal(result.valid, true);
  assert.doesNotThrow(() => JSON.stringify(result));

  const parsed = JSON.parse(JSON.stringify(result));
  assert.deepEqual(parsed, result);
});

test("risk rejection remains serializable", () => {
  const result = evaluateRisk(
    order({ quantity: 100 }),
    { currentPosition: 0, dailyLoss: 0 },
    limits({ maxOrderNotional: 500 })
  );

  assert.equal(result.allowed, false);
  assert.ok(result.reasons.length > 0);

  const parsed = JSON.parse(JSON.stringify(result));
  assert.deepEqual(parsed, result);
});

test("invalid execution result is serializable", () => {
  const result = estimateExecution(
    order({ quantity: 0 }),
    {}
  );

  assert.equal(result.valid, false);
  assert.equal(result.error, "INVALID_EXECUTION_ORDER");

  const parsed = JSON.parse(JSON.stringify(result));
  assert.deepEqual(parsed, result);
});

test("risk output contains no undefined own properties", () => {
  const result = evaluateRisk(
    order(),
    { currentPosition: 0, dailyLoss: 0 },
    limits()
  );

  for (const [key, value] of Object.entries(result)) {
    assert.notEqual(
      value,
      undefined,
      `undefined output: ${key}`
    );
  }
});

test("execution output contains no undefined own properties", () => {
  const result = estimateExecution(
    order(),
    {
      spreadBps: 10,
      slippageBps: 5,
      latencyMs: 20
    }
  );

  assert.equal(result.valid, true);

  for (const [key, value] of Object.entries(result)) {
    assert.notEqual(
      value,
      undefined,
      `undefined output: ${key}`
    );
  }
});

test("risk result survives deep cloning", () => {
  const result = evaluateRisk(
    order({
      quantity: 25,
      price: 125,
      side: "SELL"
    }),
    {
      currentPosition: 50,
      dailyLoss: -100
    },
    limits()
  );

  const clone =
    JSON.parse(JSON.stringify(result));

  assert.equal(
    clone.allowed,
    result.allowed
  );

  assert.deepEqual(
    clone.reasons,
    result.reasons
  );

  assert.equal(
    clone.orderNotional,
    result.orderNotional
  );

  assert.equal(
    clone.projectedPosition,
    result.projectedPosition
  );

  assert.equal(
    clone.projectedNotional,
    result.projectedNotional
  );
});

test("execution result survives deep cloning", () => {
  const result = estimateExecution(
    order({
      quantity: 25,
      price: 125,
      side: "SELL"
    }),
    {
      spreadBps: 20,
      slippageBps: 10,
      latencyMs: 25
    }
  );

  const clone =
    JSON.parse(JSON.stringify(result));

  assert.deepEqual(
    clone,
    result
  );
});