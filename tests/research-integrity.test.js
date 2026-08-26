import test from "node:test";
import assert from "node:assert/strict";

import {
  pointInTimeGuard,
  validateUniverseMembership
} from "../src/core.js";

import {
  walkForwardWindows,
  parameterStability,
  regimeShiftGuard,
  executionCostStress
} from "../src/research.js";

test("walk-forward windows never overlap train and test data", () => {
  const data = Array.from({ length: 12 }, (_, i) => i);
  const windows = walkForwardWindows(data, 4, 2, 2);

  assert.equal(windows.length, 4);

  for (const window of windows) {
    assert.equal(window.trainEnd, window.testStart);
    assert.equal(window.train.length, 4);
    assert.equal(window.test.length, 2);
    assert.deepEqual(
      window.train,
      data.slice(window.trainStart, window.trainEnd)
    );
    assert.deepEqual(
      window.test,
      data.slice(window.testStart, window.testEnd)
    );
  }

  assert.equal(
    Math.max(...windows[0].train),
    3
  );
  assert.equal(
    Math.min(...windows[0].test),
    4
  );
});

test("point-in-time guard blocks future information and allows delayed information", () => {
  const decision = 1_000_000;

  assert.equal(
    pointInTimeGuard(decision + 1, decision).allowed,
    false
  );

  assert.equal(
    pointInTimeGuard(decision - 5_000, decision, { minimumLagMs: 1_000 }).allowed,
    true
  );
});

test("survivorship guard requires the historical universe snapshot", () => {
  const history = {
    "2020-01-01": ["AAA", "BBB"],
    "2025-01-01": ["BBB", "CCC"]
  };

  assert.equal(
    validateUniverseMembership("AAA", "2020-01-01", history).allowed,
    true
  );

  assert.equal(
    validateUniverseMembership("AAA", "2025-01-01", history).allowed,
    false
  );

  assert.equal(
    validateUniverseMembership("AAA", "2022-01-01", history).reason,
    "UNIVERSE_SNAPSHOT_MISSING"
  );
});

test("parameter stability rejects fragile parameter sweeps", () => {
  const stable = parameterStability(
    [0.10, 0.12, 0.11, 0.09],
    { maxSpread: 0.05 }
  );

  assert.equal(stable.stable, true);
  assert.equal(stable.reason, "STABLE");

  const unstable = parameterStability(
    [0.40, 0.05, -0.30, 0.20],
    { maxSpread: 0.20 }
  );

  assert.equal(unstable.stable, false);
  assert.equal(
    unstable.reason,
    "PARAMETER_INSTABILITY"
  );
});

test("regime guard blocks large volatility and return shifts", () => {
  const volatilityShock = regimeShiftGuard(
    { volatility: 0.10, return: 0.05 },
    { volatility: 0.25, return: 0.05 },
    { maxVolRatio: 2.0, maxReturnDelta: 0.25 }
  );

  assert.equal(volatilityShock.allowed, false);
  assert.equal(
    volatilityShock.reason,
    "VOLATILITY_REGIME_SHIFT"
  );

  const returnShock = regimeShiftGuard(
    { volatility: 0.10, return: 0.05 },
    { volatility: 0.10, return: -0.30 },
    { maxVolRatio: 2.0, maxReturnDelta: 0.25 }
  );

  assert.equal(returnShock.allowed, false);
  assert.equal(
    returnShock.reason,
    "RETURN_REGIME_SHIFT"
  );
});

test("execution-cost stress blocks excessive spread and slippage", () => {
  const acceptable = executionCostStress(
    { price: 100, quantity: 10 },
    { spreadBps: 20, slippageBps: 30, latencyMs: 100 },
    { maxCostRatio: 0.01 }
  );

  assert.equal(acceptable.allowed, true);
  assert.ok(acceptable.estimatedCost > 0);

  const stressed = executionCostStress(
    { price: 100, quantity: 10 },
    { spreadBps: 500, slippageBps: 1500, latencyMs: 1000 },
    { maxCostRatio: 0.10 }
  );

  assert.equal(stressed.allowed, false);
  assert.equal(
    stressed.reason,
    "EXECUTION_COST_TOO_HIGH"
  );
  assert.ok(stressed.estimatedCost > acceptable.estimatedCost);
});
