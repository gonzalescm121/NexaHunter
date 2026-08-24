import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateRisk,
  estimateExecution
} from "../src/core.js";


/*
========================================================
RISK STATE HARDENING
========================================================
*/

test(
  "NaN position state fails closed",
  () => {

    const result =
      evaluateRisk(
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
  "infinite position state fails closed",
  () => {

    const result =
      evaluateRisk(
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
  "negative infinite position state fails closed",
  () => {

    const result =
      evaluateRisk(
        {
          symbol: "AAPL",
          quantity: 1,
          price: 100,
          side: "BUY"
        },
        {
          currentPosition: -Infinity,
          dailyLoss: 0
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
        "INVALID_RISK_STATE"
      )
    );
  }
);


test(
  "NaN daily loss state fails closed",
  () => {

    const result =
      evaluateRisk(
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
        {
          symbol: "AAPL",
          quantity: 1,
          price: 100,
          side: "BUY"
        },
        {
          currentPosition: 0,
          dailyLoss: Infinity
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
        "INVALID_RISK_STATE"
      )
    );
  }
);


/*
========================================================
VALID RISK STATE REGRESSION
========================================================
*/

test(
  "valid risk state remains allowed",
  () => {

    const result =
      evaluateRisk(
        {
          symbol: "AAPL",
          quantity: 1,
          price: 100,
          side: "BUY"
        },
        {
          currentPosition: 0,
          dailyLoss: 0
        },
        {
          maxPositionNotional: 10000,
          maxAbsolutePosition: 100,
          maxDailyLoss: 1000
        }
      );

    assert.equal(
      result.allowed,
      true
    );

    assert.deepEqual(
      result.reasons,
      []
    );
  }
);


/*
========================================================
EXECUTION INPUT HARDENING
========================================================
*/

test(
  "invalid execution order fails closed",
  () => {

    const result =
      estimateExecution(
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

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "INVALID_EXECUTION_ORDER"
    );
  }
);


test(
  "infinite execution price fails closed",
  () => {

    const result =
      estimateExecution(
        {
          side: "BUY",
          price: Infinity,
          quantity: 10
        },
        {
          spreadBps: 20,
          slippageBps: 10
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "INVALID_EXECUTION_ORDER"
    );
  }
);


test(
  "zero execution price fails closed",
  () => {

    const result =
      estimateExecution(
        {
          side: "BUY",
          price: 0,
          quantity: 10
        },
        {
          spreadBps: 20,
          slippageBps: 10
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "INVALID_EXECUTION_ORDER"
    );
  }
);


test(
  "invalid execution quantity fails closed",
  () => {

    const result =
      estimateExecution(
        {
          side: "BUY",
          price: 100,
          quantity: NaN
        },
        {
          spreadBps: 20,
          slippageBps: 10
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "INVALID_EXECUTION_ORDER"
    );
  }
);


test(
  "zero execution quantity fails closed",
  () => {

    const result =
      estimateExecution(
        {
          side: "BUY",
          price: 100,
          quantity: 0
        },
        {
          spreadBps: 20,
          slippageBps: 10
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "INVALID_EXECUTION_ORDER"
    );
  }
);


/*
========================================================
EXECUTION MARKET DATA HARDENING
========================================================
*/

test(
  "infinite execution market data fails closed",
  () => {

    const result =
      estimateExecution(
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

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "INVALID_EXECUTION_MARKET"
    );
  }
);


test(
  "NaN execution spread fails closed",
  () => {

    const result =
      estimateExecution(
        {
          side: "BUY",
          price: 100,
          quantity: 10
        },
        {
          spreadBps: NaN,
          slippageBps: 10
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "INVALID_EXECUTION_MARKET"
    );
  }
);


test(
  "negative execution spread fails closed",
  () => {

    const result =
      estimateExecution(
        {
          side: "BUY",
          price: 100,
          quantity: 10
        },
        {
          spreadBps: -1,
          slippageBps: 10
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "INVALID_EXECUTION_MARKET"
    );
  }
);


test(
  "infinite execution slippage fails closed",
  () => {

    const result =
      estimateExecution(
        {
          side: "BUY",
          price: 100,
          quantity: 10
        },
        {
          spreadBps: 10,
          slippageBps: Infinity
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "INVALID_EXECUTION_MARKET"
    );
  }
);


test(
  "negative execution slippage fails closed",
  () => {

    const result =
      estimateExecution(
        {
          side: "BUY",
          price: 100,
          quantity: 10
        },
        {
          spreadBps: 10,
          slippageBps: -1
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "INVALID_EXECUTION_MARKET"
    );
  }
);


/*
========================================================
EXECUTION LATENCY HARDENING
========================================================
*/

test(
  "infinite execution latency fails closed",
  () => {

    const result =
      estimateExecution(
        {
          side: "BUY",
          price: 100,
          quantity: 10
        },
        {
          spreadBps: 10,
          slippageBps: 10,
          latencyMs: Infinity
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "INVALID_EXECUTION_MARKET"
    );
  }
);


test(
  "negative execution latency fails closed",
  () => {

    const result =
      estimateExecution(
        {
          side: "BUY",
          price: 100,
          quantity: 10
        },
        {
          spreadBps: 10,
          slippageBps: 10,
          latencyMs: -1
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "INVALID_EXECUTION_MARKET"
    );
  }
);


/*
========================================================
EXECUTION SIDE HARDENING
========================================================
*/

test(
  "invalid execution side fails closed",
  () => {

    const result =
      estimateExecution(
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

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "INVALID_EXECUTION_SIDE"
    );
  }
);


test(
  "missing execution side fails closed",
  () => {

    const result =
      estimateExecution(
        {
          price: 100,
          quantity: 10
        },
        {
          spreadBps: 10,
          slippageBps: 10
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.error,
      "INVALID_EXECUTION_SIDE"
    );
  }
);


/*
========================================================
VALID EXECUTION REGRESSION
========================================================
*/

test(
  "valid BUY execution remains valid",
  () => {

    const result =
      estimateExecution(
        {
          side: "BUY",
          price: 100,
          quantity: 10
        },
        {
          spreadBps: 10,
          slippageBps: 10,
          latencyMs: 5
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
      result.executionPrice > 100
    );
  }
);


test(
  "valid SELL execution remains valid",
  () => {

    const result =
      estimateExecution(
        {
          side: "SELL",
          price: 100,
          quantity: 10
        },
        {
          spreadBps: 10,
          slippageBps: 10,
          latencyMs: 5
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
      result.executionPrice < 100
    );
  }
);