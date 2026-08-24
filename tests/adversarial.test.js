import test from "node:test";
import assert from "node:assert/strict";

import {
  validateBar,
  validateSeries,
  pointInTimeGuard,
  validateUniverseMembership,
  evaluateRisk,
  estimateExecution,
  createIdempotencyKey,
  reconcileState,
  recoveryDecision,
  walkForwardWindows
} from "../src/core.js";

const NOW = 1700000000000;

function bar(overrides = {}) {
  return {
    symbol: "AAPL",
    timestamp: NOW - 60000,
    open: 100,
    high: 105,
    low: 99,
    close: 103,
    volume: 1000,
    ...overrides
  };
}

/* DATA INTEGRITY */

test("valid market bar is accepted", () => {
  const result = validateBar(
    bar(),
    { nowMs: NOW }
  );

  assert.equal(
    result.status,
    "ACCEPT"
  );
  assert.equal(
    result.valid,
    true
  );
});

test("corrupted OHLC is rejected", () => {
  const result = validateBar(
    bar({
      high: 90
    }),
    { nowMs: NOW }
  );

  assert.equal(
    result.status,
    "REJECT"
  );

  assert.ok(
    result.reasons.includes(
      "IMPOSSIBLE_HIGH"
    )
  );
});

test("negative volume is rejected", () => {
  const result = validateBar(
    bar({
      volume: -1
    }),
    { nowMs: NOW }
  );

  assert.equal(
    result.status,
    "REJECT"
  );

  assert.ok(
    result.reasons.includes(
      "INVALID_VOLUME"
    )
  );
});

test("future timestamp is rejected", () => {
  const result = validateBar(
    bar({
      timestamp:
        NOW + 60000
    }),
    { nowMs: NOW }
  );

  assert.ok(
    result.reasons.includes(
      "FUTURE_TIMESTAMP"
    )
  );
});

test("duplicate timestamp is rejected", () => {
  const result = validateBar(
    bar({
      timestamp:
        NOW - 60000
    }),
    {
      nowMs: NOW,
      previousTimestamp:
        NOW - 60000
    }
  );

  assert.ok(
    result.reasons.includes(
      "DUPLICATE_TIMESTAMP"
    )
  );
});

test("out-of-order timestamp is rejected", () => {
  const result = validateBar(
    bar({
      timestamp:
        NOW - 120000
    }),
    {
      nowMs: NOW,
      previousTimestamp:
        NOW - 60000
    }
  );

  assert.ok(
    result.reasons.includes(
      "OUT_OF_ORDER_TIMESTAMP"
    )
  );
});

test("stale data is quarantined", () => {
  const result = validateBar(
    bar({
      timestamp:
        NOW - 600000
    }),
    {
      nowMs: NOW,
      staleAfterMs:
        120000
    }
  );

  assert.equal(
    result.status,
    "QUARANTINE"
  );

  assert.ok(
    result.warnings.includes(
      "STALE_FEED"
    )
  );
});

test("large data gap is quarantined", () => {
  const result = validateBar(
    bar({
      timestamp:
        NOW - 60000
    }),
    {
      nowMs: NOW,
      previousTimestamp:
        NOW - 600000,
      intervalMs: 60000,
      maxGapIntervals: 1
    }
  );

  assert.equal(
    result.status,
    "QUARANTINE"
  );

  assert.ok(
    result.warnings.includes(
      "DATA_GAP"
    )
  );
});

test("invalid symbol is rejected", () => {
  const result = validateBar(
    bar({
      symbol:
        "<script>"
    }),
    { nowMs: NOW }
  );

  assert.ok(
    result.reasons.includes(
      "INVALID_SYMBOL"
    )
  );
});

test("series detects corrupted data", () => {
  const result = validateSeries(
    [
      bar({
        timestamp:
          NOW - 120000
      }),

      bar({
        timestamp:
          NOW - 60000
      }),

      bar({
        timestamp:
          NOW - 60000
      })
    ],
    {
      nowMs: NOW
    }
  );

  assert.equal(
    result.valid,
    false
  );

  assert.ok(
    result.rejected.length > 0
  );
});

/* LEAKAGE */

test("point-in-time guard accepts historical feature", () => {
  const result =
    pointInTimeGuard(
      NOW - 60000,
      NOW
    );

  assert.equal(
    result.allowed,
    true
  );
});

test("point-in-time guard rejects future feature", () => {
  const result =
    pointInTimeGuard(
      NOW + 1,
      NOW
    );

  assert.equal(
    result.allowed,
    false
  );

  assert.equal(
    result.reason,
    "FUTURE_FEATURE"
  );
});

test("minimum feature lag is enforced", () => {
  const result =
    pointInTimeGuard(
      NOW - 100,
      NOW,
      {
        minimumLagMs:
          1000
      }
    );

  assert.equal(
    result.allowed,
    false
  );
});

test("missing universe snapshot is rejected", () => {
  const result =
    validateUniverseMembership(
      "AAPL",
      "2026-01-01",
      {}
    );

  assert.equal(
    result.allowed,
    false
  );

  assert.equal(
    result.reason,
    "UNIVERSE_SNAPSHOT_MISSING"
  );
});

test("inactive symbol is rejected", () => {
  const result =
    validateUniverseMembership(
      "AAPL",
      "2026-01-01",
      {
        "2026-01-01": [
          "MSFT",
          "NVDA"
        ]
      }
    );

  assert.equal(
    result.allowed,
    false
  );
});

/* RISK */

test("risk engine accepts safe order", () => {
  const result =
    evaluateRisk(
      {
        symbol: "AAPL",
        quantity: 10,
        price: 100,
        side: "BUY"
      },
      {
        currentPosition: 0,
        dailyLoss: 0
      },
      {
        maxOrderNotional: 5000,
        maxPositionNotional: 10000,
        maxAbsolutePosition: 100,
        maxDailyLoss: 1000
      }
    );

  assert.equal(
    result.allowed,
    true
  );
});

test("risk engine rejects oversized order", () => {
  const result =
    evaluateRisk(
      {
        symbol: "AAPL",
        quantity: 100,
        price: 100,
        side: "BUY"
      },
      {},
      {
        maxOrderNotional: 5000
      }
    );

  assert.equal(
    result.allowed,
    false
  );

  assert.ok(
    result.reasons.includes(
      "ORDER_NOTIONAL_LIMIT"
    )
  );
});

test("risk engine rejects position limit", () => {
  const result =
    evaluateRisk(
      {
        symbol: "AAPL",
        quantity: 10,
        price: 100,
        side: "BUY"
      },
      {
        currentPosition: 95
      },
      {
        maxAbsolutePosition: 100
      }
    );

  assert.equal(
    result.allowed,
    false
  );

  assert.ok(
    result.reasons.includes(
      "POSITION_LIMIT"
    )
  );
});

test("risk engine blocks after daily loss limit", () => {
  const result =
    evaluateRisk(
      {
        symbol: "AAPL",
        quantity: 1,
        price: 100,
        side: "BUY"
      },
      {
        dailyLoss: -1000
      },
      {
        maxDailyLoss: 1000
      }
    );

  assert.equal(
    result.allowed,
    false
  );

  assert.ok(
    result.reasons.includes(
      "DAILY_LOSS_LIMIT"
    )
  );
});

/* EXECUTION */

test("execution model calculates buy slippage", () => {
  const result =
    estimateExecution(
      {
        side: "BUY",
        price: 100,
        quantity: 10
      },
      {
        spreadBps: 20,
        slippageBps: 10,
        latencyMs: 50
      }
    );

  assert.ok(
    result.executionPrice > 100
  );

  assert.equal(
    result.latencyMs,
    50
  );

  assert.ok(
    result.estimatedCost > 0
  );
});

test("execution model calculates sell slippage", () => {
  const result =
    estimateExecution(
      {
        side: "SELL",
        price: 100,
        quantity: 10
      },
      {
        spreadBps: 20,
        slippageBps: 10
      }
    );

  assert.ok(
    result.executionPrice < 100
  );
});

test("idempotency key is deterministic", () => {
  const order = {
    symbol: "AAPL",
    quantity: 10,
    price: 100,
    side: "BUY",
    timestamp: 123
  };

  assert.equal(
    createIdempotencyKey(order),
    createIdempotencyKey(order)
  );
});

/* RECOVERY */

test("matching internal and external state reconciles", () => {
  const result =
    reconcileState(
      {
        position: 10,
        openOrders: 1,
        knownOrderIds: [
          "A"
        ]
      },
      {
        position: 10,
        openOrders: 1,
        knownOrderIds: [
          "A"
        ]
      }
    );

  assert.equal(
    result.reconciled,
    true
  );

  assert.equal(
    result.tradingAllowed,
    true
  );
});

test("position mismatch blocks trading", () => {
  const result =
    reconcileState(
      {
        position: 10,
        openOrders: 0
      },
      {
        position: 5,
        openOrders: 0
      }
    );

  assert.equal(
    result.reconciled,
    false
  );

  assert.equal(
    result.tradingAllowed,
    false
  );
});

test("unknown recovery state blocks trading", () => {
  const result =
    recoveryDecision(
      "UNKNOWN"
    );

  assert.equal(
    result.tradingAllowed,
    false
  );
});

test("recovered state permits trading", () => {
  const result =
    recoveryDecision(
      "RECOVERED"
    );

  assert.equal(
    result.tradingAllowed,
    true
  );
});

/* WALK-FORWARD */

test("walk-forward windows never overlap train and test data", () => {
  const data =
    [1, 2, 3, 4, 5, 6, 7, 8];

  const windows =
    walkForwardWindows(
      data,
      3,
      2,
      2
    );

  assert.equal(
    windows.length,
    2
  );

  assert.deepEqual(
    windows[0].train,
    [1, 2, 3]
  );

  assert.deepEqual(
    windows[0].test,
    [4, 5]
  );

  assert.deepEqual(
    windows[1].train,
    [3, 4, 5]
  );

  assert.deepEqual(
    windows[1].test,
    [6, 7]
  );
});