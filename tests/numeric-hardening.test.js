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


function state(overrides = {}) {
  return {
    currentPosition: 0,
    dailyLoss: 0,
    ...overrides
  };
}


/*
========================================================
RISK CALCULATION OVERFLOW
========================================================
*/

test(
  "risk calculation overflow fails closed",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity:
            Number.MAX_SAFE_INTEGER,
          price:
            Number.MAX_VALUE
        }),
        state(),
        {}
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.ok(
      result.reasons.includes(
        "RISK_CALCULATION_OVERFLOW"
      )
    );
  }
);


/*
========================================================
POSITION CALCULATION OVERFLOW
========================================================
*/

test(
  "projected position overflow fails closed",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity: 1,
          price: 100
        }),
        state({
          currentPosition:
            Number.MAX_VALUE
        }),
        {}
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.ok(
      result.reasons.includes(
        "RISK_CALCULATION_OVERFLOW"
      )
    );
  }
);


/*
========================================================
EXECUTION NOTIONAL OVERFLOW
========================================================
*/

test(
  "execution notional overflow fails closed",
  () => {
    const result =
      estimateExecution(
        order({
          quantity:
            Number.MAX_SAFE_INTEGER,
          price:
            Number.MAX_VALUE
        }),
        {}
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "EXECUTION_CALCULATION_OVERFLOW"
    );
  }
);


/*
========================================================
EXECUTION PRICE OVERFLOW
========================================================
*/

test(
  "execution price overflow fails closed",
  () => {
    const result =
      estimateExecution(
        order({
          quantity: 1,
          price:
            Number.MAX_VALUE
        }),
        {
          spreadBps: 1000000000000,
          slippageBps: 1000000000000
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "EXECUTION_CALCULATION_OVERFLOW"
    );
  }
);


/*
========================================================
NORMAL NUMBERS REMAIN VALID
========================================================
*/

test(
  "normal risk calculation remains allowed",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity: 10,
          price: 100
        }),
        state(),
        {
          maxOrderNotional: 2000,
          maxPositionNotional: 2000,
          maxAbsolutePosition: 100,
          maxDailyLoss: 1000
        }
      );

    assert.equal(
      result.allowed,
      true
    );

    assert.equal(
      result.orderNotional,
      1000
    );

    assert.equal(
      result.projectedPosition,
      10
    );

    assert.equal(
      result.projectedNotional,
      1000
    );
  }
);


/*
========================================================
NORMAL EXECUTION REMAINS VALID
========================================================
*/

test(
  "normal execution remains valid",
  () => {
    const result =
      estimateExecution(
        order({
          quantity: 10,
          price: 100,
          side: "BUY"
        }),
        {
          spreadBps: 10,
          slippageBps: 5,
          latencyMs: 20
        }
      );

    assert.equal(
      result.valid,
      true
    );

    assert.ok(
      Number.isFinite(
        result.executionPrice
      )
    );

    assert.ok(
      Number.isFinite(
        result.grossNotional
      )
    );

    assert.ok(
      Number.isFinite(
        result.estimatedNotional
      )
    );

    assert.ok(
      Number.isFinite(
        result.estimatedCost
      )
    );
  }
);