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
RISK POSITION TRANSITIONS
========================================================
*/

test(
  "BUY increases projected position",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity: 10,
          side: "BUY"
        }),
        state({
          currentPosition: 5
        }),
        {
          maxAbsolutePosition: 20
        }
      );

    assert.equal(result.allowed, true);
    assert.equal(result.projectedPosition, 15);
  }
);


test(
  "SELL decreases projected position",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity: 10,
          side: "SELL"
        }),
        state({
          currentPosition: 15
        }),
        {
          maxAbsolutePosition: 20
        }
      );

    assert.equal(result.allowed, true);
    assert.equal(result.projectedPosition, 5);
  }
);


/*
--------------------------------------------------------
BOUNDARY:
Exactly at the absolute position limit is allowed.
--------------------------------------------------------
*/

test(
  "SELL can cross from long to short at the absolute limit",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity: 15,
          side: "SELL"
        }),
        state({
          currentPosition: 5
        }),
        {
          maxAbsolutePosition: 10
        }
      );

    assert.equal(result.allowed, true);

    assert.deepEqual(
      result.reasons,
      []
    );

    assert.equal(
      result.projectedPosition,
      -10
    );
  }
);


/*
--------------------------------------------------------
BOUNDARY:
One unit beyond the absolute position limit is rejected.
--------------------------------------------------------
*/

test(
  "SELL beyond the absolute limit is rejected",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity: 16,
          side: "SELL"
        }),
        state({
          currentPosition: 5
        }),
        {
          maxAbsolutePosition: 10
        }
      );

    assert.equal(result.allowed, false);

    assert.ok(
      result.reasons.includes(
        "POSITION_LIMIT"
      )
    );

    assert.equal(
      result.projectedPosition,
      -11
    );
  }
);


/*
========================================================
SIDE NORMALIZATION
========================================================
*/

test(
  "BUY and SELL side matching is case insensitive",
  () => {
    const buy =
      evaluateRisk(
        order({
          quantity: 1,
          side: "buy"
        }),
        state(),
        {
          maxAbsolutePosition: 10
        }
      );

    const sell =
      evaluateRisk(
        order({
          quantity: 1,
          side: "sell"
        }),
        state({
          currentPosition: 1
        }),
        {
          maxAbsolutePosition: 10
        }
      );

    assert.equal(buy.allowed, true);
    assert.equal(buy.projectedPosition, 1);

    assert.equal(sell.allowed, true);
    assert.equal(sell.projectedPosition, 0);
  }
);


/*
========================================================
RISK LIMIT BOUNDARIES
========================================================
*/

test(
  "position notional exactly at the limit is allowed",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity: 10,
          price: 100
        }),
        state(),
        {
          maxPositionNotional: 1000
        }
      );

    assert.equal(result.allowed, true);

    assert.equal(
      result.projectedNotional,
      1000
    );
  }
);


test(
  "position notional above the limit is rejected",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity: 11,
          price: 100
        }),
        state(),
        {
          maxPositionNotional: 1000
        }
      );

    assert.equal(result.allowed, false);

    assert.ok(
      result.reasons.includes(
        "POSITION_NOTIONAL_LIMIT"
      )
    );
  }
);


test(
  "order notional exactly at the limit is allowed",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity: 10,
          price: 100
        }),
        state(),
        {
          maxOrderNotional: 1000
        }
      );

    assert.equal(result.allowed, true);

    assert.equal(
      result.orderNotional,
      1000
    );
  }
);


test(
  "order notional above the limit is rejected",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity: 11,
          price: 100
        }),
        state(),
        {
          maxOrderNotional: 1000
        }
      );

    assert.equal(result.allowed, false);

    assert.ok(
      result.reasons.includes(
        "ORDER_NOTIONAL_LIMIT"
      )
    );
  }
);


/*
========================================================
DAILY LOSS
========================================================
*/

test(
  "daily loss exactly at the configured threshold is rejected",
  () => {
    const result =
      evaluateRisk(
        order(),
        state({
          dailyLoss: -1000
        }),
        {
          maxDailyLoss: 1000
        }
      );

    assert.equal(result.allowed, false);

    assert.ok(
      result.reasons.includes(
        "DAILY_LOSS_LIMIT"
      )
    );
  }
);


test(
  "daily loss beyond the configured threshold is rejected",
  () => {
    const result =
      evaluateRisk(
        order(),
        state({
          dailyLoss: -1000.01
        }),
        {
          maxDailyLoss: 1000
        }
      );

    assert.equal(result.allowed, false);

    assert.ok(
      result.reasons.includes(
        "DAILY_LOSS_LIMIT"
      )
    );
  }
);


/*
========================================================
EXECUTION REGRESSION
========================================================
*/

test(
  "execution defaults remain valid for a normal BUY",
  () => {
    const result =
      estimateExecution(
        order({
          quantity: 10,
          price: 100,
          side: "BUY"
        }),
        {}
      );

    assert.equal(result.valid, true);
    assert.equal(result.executionPrice, 100);
    assert.equal(result.grossNotional, 1000);
    assert.equal(result.estimatedNotional, 1000);
  }
);


test(
  "execution defaults remain valid for a normal SELL",
  () => {
    const result =
      estimateExecution(
        order({
          quantity: 10,
          price: 100,
          side: "SELL"
        }),
        {}
      );

    assert.equal(result.valid, true);
    assert.equal(result.executionPrice, 100);
    assert.equal(result.grossNotional, 1000);
    assert.equal(result.estimatedNotional, 1000);
  }
);


test(
  "zero spread and slippage produce no execution price impact",
  () => {
    const result =
      estimateExecution(
        order({
          quantity: 5,
          price: 250,
          side: "BUY"
        }),
        {
          spreadBps: 0,
          slippageBps: 0,
          latencyMs: 0
        }
      );

    assert.equal(result.valid, true);
    assert.equal(result.executionPrice, 250);
    assert.equal(result.estimatedCost, 0);
  }
);


/*
========================================================
EXECUTION HARDENING
========================================================
*/

test(
  "invalid execution quantity fails closed",
  () => {
    const result =
      estimateExecution(
        order({
          quantity: 0
        }),
        {}
      );

    assert.equal(result.valid, false);

    assert.equal(
      result.error,
      "INVALID_EXECUTION_ORDER"
    );
  }
);


test(
  "negative execution quantity fails closed",
  () => {
    const result =
      estimateExecution(
        order({
          quantity: -1
        }),
        {}
      );

    assert.equal(result.valid, false);

    assert.equal(
      result.error,
      "INVALID_EXECUTION_ORDER"
    );
  }
);


test(
  "invalid execution price fails closed",
  () => {
    const result =
      estimateExecution(
        order({
          price: NaN
        }),
        {}
      );

    assert.equal(result.valid, false);

    assert.equal(
      result.error,
      "INVALID_EXECUTION_ORDER"
    );
  }
);


test(
  "invalid execution side fails closed",
  () => {
    const result =
      estimateExecution(
        order({
          side: "HOLD"
        }),
        {}
      );

    assert.equal(result.valid, false);

    assert.equal(
      result.error,
      "INVALID_EXECUTION_SIDE"
    );
  }
);


test(
  "negative execution spread fails closed",
  () => {
    const result =
      estimateExecution(
        order(),
        {
          spreadBps: -1
        }
      );

    assert.equal(result.valid, false);

    assert.equal(
      result.error,
      "INVALID_EXECUTION_MARKET"
    );
  }
);


test(
  "NaN execution slippage fails closed",
  () => {
    const result =
      estimateExecution(
        order(),
        {
          slippageBps: NaN
        }
      );

    assert.equal(result.valid, false);

    assert.equal(
      result.error,
      "INVALID_EXECUTION_MARKET"
    );
  }
);


test(
  "infinite execution latency fails closed",
  () => {
    const result =
      estimateExecution(
        order(),
        {
          latencyMs: Infinity
        }
      );

    assert.equal(result.valid, false);

    assert.equal(
      result.error,
      "INVALID_EXECUTION_MARKET"
    );
  }
);


/*
========================================================
RISK HARDENING REGRESSION
========================================================
*/

test(
  "NaN current position fails closed",
  () => {
    const result =
      evaluateRisk(
        order(),
        state({
          currentPosition: NaN
        }),
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
        "INVALID_RISK_STATE"
      )
    );
  }
);


test(
  "infinite current position fails closed",
  () => {
    const result =
      evaluateRisk(
        order(),
        state({
          currentPosition: Infinity
        }),
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
        "INVALID_RISK_STATE"
      )
    );
  }
);


test(
  "infinite daily loss state fails closed",
  () => {
    const result =
      evaluateRisk(
        order(),
        state({
          dailyLoss: Infinity
        }),
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
        "INVALID_RISK_STATE"
      )
    );
  }
);


test(
  "negative infinite daily loss state fails closed",
  () => {
    const result =
      evaluateRisk(
        order(),
        state({
          dailyLoss: -Infinity
        }),
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
        "INVALID_RISK_STATE"
      )
    );
  }
);


test(
  "NaN risk limit fails closed",
  () => {
    const result =
      evaluateRisk(
        order(),
        state(),
        {
          maxOrderNotional: NaN
        }
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.ok(
      result.reasons.includes(
        "INVALID_RISK_LIMIT_MAXORDERNOTIONAL"
      )
    );
  }
);


test(
  "infinite risk limit fails closed",
  () => {
    const result =
      evaluateRisk(
        order(),
        state(),
        {
          maxOrderNotional: Infinity
        }
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.ok(
      result.reasons.includes(
        "INVALID_RISK_LIMIT_MAXORDERNOTIONAL"
      )
    );
  }
);


test(
  "negative risk limit fails closed",
  () => {
    const result =
      evaluateRisk(
        order(),
        state(),
        {
          maxAbsolutePosition: -1
        }
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.ok(
      result.reasons.includes(
        "INVALID_RISK_LIMIT_MAXABSOLUTEPOSITION"
      )
    );
  }
);


test(
  "negative max order notional fails closed",
  () => {
    const result =
      evaluateRisk(
        order(),
        state(),
        {
          maxOrderNotional: -1
        }
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.ok(
      result.reasons.includes(
        "INVALID_RISK_LIMIT_MAXORDERNOTIONAL"
      )
    );
  }
);


test(
  "negative max position notional fails closed",
  () => {
    const result =
      evaluateRisk(
        order(),
        state(),
        {
          maxPositionNotional: -1
        }
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.ok(
      result.reasons.includes(
        "INVALID_RISK_LIMIT_MAXPOSITIONNOTIONAL"
      )
    );
  }
);


test(
  "negative max daily loss fails closed",
  () => {
    const result =
      evaluateRisk(
        order(),
        state(),
        {
          maxDailyLoss: -1
        }
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.ok(
      result.reasons.includes(
        "INVALID_RISK_LIMIT_MAXDAILYLOSS"
      )
    );
  }
);


test(
  "zero quantity fails closed",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity: 0
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
        "INVALID_QUANTITY"
      )
    );
  }
);


test(
  "negative quantity fails closed",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity: -1
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
        "INVALID_QUANTITY"
      )
    );
  }
);


test(
  "fractional quantity fails closed",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity: 1.5
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
        "INVALID_QUANTITY"
      )
    );
  }
);


test(
  "NaN risk quantity fails closed",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity: NaN
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
        "INVALID_QUANTITY"
      )
    );
  }
);


test(
  "infinite risk quantity fails closed",
  () => {
    const result =
      evaluateRisk(
        order({
          quantity: Infinity
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
        "INVALID_QUANTITY"
      )
    );
  }
);


test(
  "invalid risk side fails closed",
  () => {
    const result =
      evaluateRisk(
        order({
          side: "HOLD"
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
        "INVALID_SIDE"
      )
    );
  }
);


test(
  "empty risk side fails closed",
  () => {
    const result =
      evaluateRisk(
        order({
          side: ""
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
        "INVALID_SIDE"
      )
    );
  }
);


test(
  "NaN risk price fails closed",
  () => {
    const result =
      evaluateRisk(
        order({
          price: NaN
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
        "INVALID_PRICE"
      )
    );
  }
);


test(
  "zero risk price fails closed",
  () => {
    const result =
      evaluateRisk(
        order({
          price: 0
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
        "INVALID_PRICE"
      )
    );
  }
);


test(
  "negative risk price fails closed",
  () => {
    const result =
      evaluateRisk(
        order({
          price: -100
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
        "INVALID_PRICE"
      )
    );
  }
);