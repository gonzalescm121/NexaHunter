import test from "node:test";
import assert from "node:assert/strict";

import {
  validateBar,
  evaluateRisk,
  estimateExecution,
  pointInTimeGuard,
  reconcileState,
  recoveryDecision
} from "../src/core.js";

const NOW = 1700000000000;

function marketBar(overrides = {}) {
  return {
    symbol: "AAPL",
    timestamp: NOW - 60000,
    open: 100,
    high: 101,
    low: 99,
    close: 100.5,
    volume: 10000,
    ...overrides
  };
}

/*
========================================================
VOLATILITY SHOCKS
========================================================
*/

test("extreme volatility with valid OHLC remains structurally valid", () => {
  const result = validateBar(
    marketBar({
      open: 100,
      high: 150,
      low: 50,
      close: 140
    }),
    { nowMs: NOW }
  );

  assert.equal(result.status, "ACCEPT");
});

test("negative price shock is rejected", () => {
  const result = validateBar(
    marketBar({
      open: 100,
      high: 110,
      low: -5,
      close: 90
    }),
    { nowMs: NOW }
  );

  assert.equal(result.status, "REJECT");
  assert.ok(
    result.reasons.includes("INVALID_PRICE")
  );
});

/*
========================================================
LIQUIDITY DETERIORATION
========================================================
*/

test("large spread and slippage produce measurable execution cost", () => {
  const result = estimateExecution(
    {
      side: "BUY",
      price: 100,
      quantity: 1000
    },
    {
      spreadBps: 500,
      slippageBps: 1000,
      latencyMs: 1000
    }
  );

  assert.ok(result.executionPrice > 100);
  assert.ok(result.estimatedCost > 0);
  assert.equal(result.latencyMs, 1000);
});

test("extreme execution deterioration remains directional", () => {
  const buy = estimateExecution(
    {
      side: "BUY",
      price: 100,
      quantity: 10
    },
    {
      spreadBps: 1000,
      slippageBps: 5000
    }
  );

  const sell = estimateExecution(
    {
      side: "SELL",
      price: 100,
      quantity: 10
    },
    {
      spreadBps: 1000,
      slippageBps: 5000
    }
  );

  assert.ok(buy.executionPrice > 100);
  assert.ok(sell.executionPrice < 100);
});

/*
========================================================
RISK UNDER VOLATILITY
========================================================
*/

test("position notional limit blocks volatility-amplified exposure", () => {
  const result = evaluateRisk(
    {
      symbol: "AAPL",
      quantity: 100,
      price: 500,
      side: "BUY"
    },
    {
      currentPosition: 0,
      dailyLoss: 0
    },
    {
      maxOrderNotional: 100000,
      maxPositionNotional: 25000
    }
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "POSITION_NOTIONAL_LIMIT"
    )
  );
});

test("daily loss limit blocks additional risk", () => {
  const result = evaluateRisk(
    {
      symbol: "AAPL",
      quantity: 1,
      price: 100,
      side: "BUY"
    },
    {
      currentPosition: 0,
      dailyLoss: -5000
    },
    {
      maxDailyLoss: 5000
    }
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "DAILY_LOSS_LIMIT"
    )
  );
});

/*
========================================================
DELAYED SIGNALS / LOOK-AHEAD
========================================================
*/

test("delayed feature remains valid when within historical window", () => {
  const result = pointInTimeGuard(
    NOW - 60000,
    NOW,
    {
      minimumLagMs: 1000
    }
  );

  assert.equal(result.allowed, true);
});

test("one-millisecond future feature is blocked", () => {
  const result = pointInTimeGuard(
    NOW + 1,
    NOW
  );

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "FUTURE_FEATURE"
  );
});

/*
========================================================
RECONCILIATION FAILURE
========================================================
*/

test("open-order mismatch blocks trading", () => {
  const result = reconcileState(
    {
      position: 10,
      openOrders: 5
    },
    {
      position: 10,
      openOrders: 4
    }
  );

  assert.equal(result.reconciled, false);
  assert.equal(result.tradingAllowed, false);

  assert.ok(
    result.mismatches.includes(
      "OPEN_ORDER_MISMATCH"
    )
  );
});

test("order ID mismatch blocks trading", () => {
  const result = reconcileState(
    {
      position: 10,
      openOrders: 1,
      knownOrderIds: ["A"]
    },
    {
      position: 10,
      openOrders: 1,
      knownOrderIds: ["B"]
    }
  );

  assert.equal(result.reconciled, false);
  assert.equal(result.tradingAllowed, false);

  assert.ok(
    result.mismatches.includes(
      "ORDER_ID_MISMATCH"
    )
  );
});

/*
========================================================
RECOVERY SAFETY
========================================================
*/

test("unknown recovery state cannot trade", () => {
  const result = recoveryDecision("UNKNOWN");

  assert.equal(
    result.tradingAllowed,
    false
  );
});

test("corrupt recovery state cannot trade", () => {
  const result =
    recoveryDecision("CORRUPTED");

  assert.equal(
    result.tradingAllowed,
    false
  );
});

/*
========================================================
DATA CORRUPTION
========================================================
*/

test("NaN-like price input is rejected", () => {
  const result = validateBar(
    marketBar({
      close: "not-a-number"
    }),
    {
      nowMs: NOW
    }
  );

  assert.equal(result.status, "REJECT");

  assert.ok(
    result.reasons.includes(
      "INVALID_PRICE"
    )
  );
});

test("infinite volume is rejected", () => {
  const result = validateBar(
    marketBar({
      volume: Infinity
    }),
    {
      nowMs: NOW
    }
  );

  assert.equal(result.status, "REJECT");

  assert.ok(
    result.reasons.includes(
      "INVALID_VOLUME"
    )
  );
});