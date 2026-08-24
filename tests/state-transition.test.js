import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateRisk,
  estimateExecution
} from "../src/core.js";


function makeOrder(overrides = {}) {
  return {
    symbol: "AAPL",
    quantity: 10,
    price: 100,
    side: "BUY",
    ...overrides
  };
}


function makeLimits(overrides = {}) {
  return {
    maxOrderNotional: 5000,
    maxPositionNotional: 10000,
    maxAbsolutePosition: 100,
    maxDailyLoss: 1000,
    ...overrides
  };
}


/*
========================================================
POSITION TRANSITIONS
========================================================
*/

test("BUY increases projected position", () => {
  const result = evaluateRisk(
    makeOrder({
      quantity: 10,
      side: "BUY"
    }),
    {
      currentPosition: 20,
      dailyLoss: 0
    },
    makeLimits()
  );

  assert.equal(result.allowed, true);
  assert.equal(result.projectedPosition, 30);
});


test("SELL decreases projected position", () => {
  const result = evaluateRisk(
    makeOrder({
      quantity: 10,
      side: "SELL"
    }),
    {
      currentPosition: 20,
      dailyLoss: 0
    },
    makeLimits()
  );

  assert.equal(result.allowed, true);
  assert.equal(result.projectedPosition, 10);
});


test("SELL can reduce a long position to zero", () => {
  const result = evaluateRisk(
    makeOrder({
      quantity: 20,
      side: "SELL"
    }),
    {
      currentPosition: 20,
      dailyLoss: 0
    },
    makeLimits()
  );

  assert.equal(result.allowed, true);
  assert.equal(result.projectedPosition, 0);
});


test("SELL can transition from long to short when limits permit", () => {
  const result = evaluateRisk(
    makeOrder({
      quantity: 30,
      side: "SELL"
    }),
    {
      currentPosition: 20,
      dailyLoss: 0
    },
    makeLimits({
      maxAbsolutePosition: 100
    })
  );

  assert.equal(result.allowed, true);
  assert.equal(result.projectedPosition, -10);
});


test("BUY can cover a short position", () => {
  const result = evaluateRisk(
    makeOrder({
      quantity: 10,
      side: "BUY"
    }),
    {
      currentPosition: -20,
      dailyLoss: 0
    },
    makeLimits()
  );

  assert.equal(result.allowed, true);
  assert.equal(result.projectedPosition, -10);
});


/*
========================================================
POSITION LIMIT TRANSITIONS
========================================================
*/

test("BUY is rejected when projected position exceeds limit", () => {
  const result = evaluateRisk(
    makeOrder({
      quantity: 11
    }),
    {
      currentPosition: 90,
      dailyLoss: 0
    },
    makeLimits({
      maxAbsolutePosition: 100
    })
  );

  assert.equal(result.allowed, false);
  assert.ok(
    result.reasons.includes("POSITION_LIMIT")
  );
});


test("SELL is rejected when projected short position exceeds limit", () => {
  const result = evaluateRisk(
    makeOrder({
      quantity: 11,
      side: "SELL"
    }),
    {
      currentPosition: -90,
      dailyLoss: 0
    },
    makeLimits({
      maxAbsolutePosition: 100
    })
  );

  assert.equal(result.allowed, false);
  assert.ok(
    result.reasons.includes("POSITION_LIMIT")
  );
});


test("position exactly at the limit is allowed", () => {
  const result = evaluateRisk(
    makeOrder({
      quantity: 10
    }),
    {
      currentPosition: 90,
      dailyLoss: 0
    },
    makeLimits({
      maxAbsolutePosition: 100
    })
  );

  assert.equal(result.allowed, true);
  assert.equal(result.projectedPosition, 100);
});


/*
========================================================
POSITION NOTIONAL TRANSITIONS
========================================================
*/

test("projected long notional is calculated correctly", () => {
  const result = evaluateRisk(
    makeOrder({
      quantity: 10,
      price: 100
    }),
    {
      currentPosition: 20,
      dailyLoss: 0
    },
    makeLimits()
  );

  assert.equal(result.projectedPosition, 30);
  assert.equal(result.projectedNotional, 3000);
});


test("projected short notional uses absolute exposure", () => {
  const result = evaluateRisk(
    makeOrder({
      quantity: 30,
      price: 100,
      side: "SELL"
    }),
    {
      currentPosition: 20,
      dailyLoss: 0
    },
    makeLimits()
  );

  assert.equal(result.projectedPosition, -10);
  assert.equal(result.projectedNotional, 1000);
});


test("projected notional limit rejects excessive exposure", () => {
  const result = evaluateRisk(
    makeOrder({
      quantity: 10,
      price: 100
    }),
    {
      currentPosition: 40,
      dailyLoss: 0
    },
    makeLimits({
      maxPositionNotional: 4500
    })
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "POSITION_NOTIONAL_LIMIT"
    )
  );
});


/*
========================================================
DAILY LOSS STATE
========================================================
*/

test("trading remains allowed below daily loss limit", () => {
  const result = evaluateRisk(
    makeOrder(),
    {
      currentPosition: 0,
      dailyLoss: -999
    },
    makeLimits({
      maxDailyLoss: 1000
    })
  );

  assert.equal(result.allowed, true);
});


test("trading is blocked at the daily loss limit", () => {
  const result = evaluateRisk(
    makeOrder(),
    {
      currentPosition: 0,
      dailyLoss: -1000
    },
    makeLimits({
      maxDailyLoss: 1000
    })
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "DAILY_LOSS_LIMIT"
    )
  );
});


test("trading remains blocked beyond the daily loss limit", () => {
  const result = evaluateRisk(
    makeOrder(),
    {
      currentPosition: 0,
      dailyLoss: -1500
    },
    makeLimits({
      maxDailyLoss: 1000
    })
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
MULTIPLE RISK VIOLATIONS
========================================================
*/

test("multiple simultaneous risk violations are all reported", () => {
  const result = evaluateRisk(
    makeOrder({
      quantity: 200,
      price: 100
    }),
    {
      currentPosition: 90,
      dailyLoss: -1500
    },
    makeLimits({
      maxOrderNotional: 5000,
      maxPositionNotional: 5000,
      maxAbsolutePosition: 100,
      maxDailyLoss: 1000
    })
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "ORDER_NOTIONAL_LIMIT"
    )
  );

  assert.ok(
    result.reasons.includes(
      "POSITION_NOTIONAL_LIMIT"
    )
  );

  assert.ok(
    result.reasons.includes(
      "POSITION_LIMIT"
    )
  );

  assert.ok(
    result.reasons.includes(
      "DAILY_LOSS_LIMIT"
    )
  );
});


/*
========================================================
STATE IMMUTABILITY
========================================================
*/

test("risk evaluation does not mutate state", () => {
  const state = {
    currentPosition: 20,
    dailyLoss: -100
  };

  const before = {
    ...state
  };

  evaluateRisk(
    makeOrder(),
    state,
    makeLimits()
  );

  assert.deepEqual(
    state,
    before
  );
});


test("risk evaluation does not mutate order", () => {
  const order = makeOrder();

  const before = {
    ...order
  };

  evaluateRisk(
    order,
    {
      currentPosition: 0,
      dailyLoss: 0
    },
    makeLimits()
  );

  assert.deepEqual(
    order,
    before
  );
});


/*
========================================================
EXECUTION STATE CONSISTENCY
========================================================
*/

test("execution estimate remains valid after risk approval", () => {
  const order = makeOrder({
    quantity: 25,
    price: 100
  });

  const risk = evaluateRisk(
    order,
    {
      currentPosition: 10,
      dailyLoss: 0
    },
    makeLimits()
  );

  assert.equal(risk.allowed, true);

  const execution = estimateExecution(
    order,
    {
      spreadBps: 10,
      slippageBps: 5,
      latencyMs: 20
    }
  );

  assert.equal(execution.valid, true);
});


test("risk rejection does not alter execution inputs", () => {
  const order = makeOrder({
    quantity: 100,
    price: 100
  });

  const before = {
    ...order
  };

  const risk = evaluateRisk(
    order,
    {
      currentPosition: 0,
      dailyLoss: 0
    },
    makeLimits({
      maxOrderNotional: 5000
    })
  );

  assert.equal(risk.allowed, false);

  assert.deepEqual(
    order,
    before
  );
});


/*
========================================================
FAIL-CLOSED STATE CORRUPTION
========================================================
*/

test("NaN current position fails closed", () => {
  const result = evaluateRisk(
    makeOrder(),
    {
      currentPosition: NaN,
      dailyLoss: 0
    },
    makeLimits()
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_RISK_STATE"
    )
  );
});


test("Infinity current position fails closed", () => {
  const result = evaluateRisk(
    makeOrder(),
    {
      currentPosition: Infinity,
      dailyLoss: 0
    },
    makeLimits()
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_RISK_STATE"
    )
  );
});


test("NaN daily loss fails closed", () => {
  const result = evaluateRisk(
    makeOrder(),
    {
      currentPosition: 0,
      dailyLoss: NaN
    },
    makeLimits()
  );

  assert.equal(result.allowed, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_RISK_STATE"
    )
  );
});


test("Infinity daily loss fails closed", () => {
  const result = evaluateRisk(
    makeOrder(),
    {
      currentPosition: 0,
      dailyLoss: Infinity
    },
    makeLimits()
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
REPEATED EVALUATION DETERMINISM
========================================================
*/

test("identical risk evaluations produce identical results", () => {
  const order = makeOrder({
    quantity: 15,
    price: 125,
    side: "BUY"
  });

  const state = {
    currentPosition: 20,
    dailyLoss: -100
  };

  const limits = makeLimits();

  const first =
    evaluateRisk(
      order,
      state,
      limits
    );

  const second =
    evaluateRisk(
      order,
      state,
      limits
    );

  assert.deepEqual(
    second,
    first
  );
});


test("identical execution estimates produce identical results", () => {
  const order = makeOrder({
    quantity: 15,
    price: 125,
    side: "SELL"
  });

  const market = {
    spreadBps: 20,
    slippageBps: 10,
    latencyMs: 25
  };

  const first =
    estimateExecution(
      order,
      market
    );

  const second =
    estimateExecution(
      order,
      market
    );

  assert.deepEqual(
    second,
    first
  );
});


/*
========================================================
NO NaN / INFINITY ON ACCEPTED RESULTS
========================================================
*/

test("accepted risk result contains finite exposure values", () => {
  const result = evaluateRisk(
    makeOrder(),
    {
      currentPosition: 10,
      dailyLoss: 0
    },
    makeLimits()
  );

  assert.equal(result.allowed, true);

  assert.equal(
    Number.isFinite(
      result.orderNotional
    ),
    true
  );

  assert.equal(
    Number.isFinite(
      result.projectedPosition
    ),
    true
  );

  assert.equal(
    Number.isFinite(
      result.projectedNotional
    ),
    true
  );
});


test("accepted execution result contains finite values", () => {
  const result = estimateExecution(
    makeOrder(),
    {
      spreadBps: 10,
      slippageBps: 5,
      latencyMs: 20
    }
  );

  assert.equal(result.valid, true);

  assert.equal(
    Number.isFinite(
      result.executionPrice
    ),
    true
  );

  assert.equal(
    Number.isFinite(
      result.grossNotional
    ),
    true
  );

  assert.equal(
    Number.isFinite(
      result.estimatedNotional
    ),
    true
  );

  assert.equal(
    Number.isFinite(
      result.estimatedCost
    ),
    true
  );
});