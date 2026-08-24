import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateRisk
} from "../src/core.js";


function baseOrder() {
  return {
    symbol: "AAPL",
    quantity: 1,
    price: 100,
    side: "BUY"
  };
}


function baseState() {
  return {
    currentPosition: 0,
    dailyLoss: 0
  };
}


/*
========================================================
INVALID RISK LIMITS
========================================================
*/

test(
  "NaN max order notional fails closed",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      baseState(),
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
  "infinite max order notional fails closed",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      baseState(),
      {
        maxOrderNotional: Infinity
      }
    );

    assert.equal(
      result.allowed,
      false
    );
  }
);


test(
  "negative max order notional fails closed",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      baseState(),
      {
        maxOrderNotional: -1
      }
    );

    assert.equal(
      result.allowed,
      false
    );
  }
);


test(
  "NaN max position notional fails closed",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      baseState(),
      {
        maxPositionNotional: NaN
      }
    );

    assert.equal(
      result.allowed,
      false
    );
  }
);


test(
  "infinite max position notional fails closed",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      baseState(),
      {
        maxPositionNotional: Infinity
      }
    );

    assert.equal(
      result.allowed,
      false
    );
  }
);


test(
  "negative max position notional fails closed",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      baseState(),
      {
        maxPositionNotional: -1
      }
    );

    assert.equal(
      result.allowed,
      false
    );
  }
);


test(
  "NaN max absolute position fails closed",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      baseState(),
      {
        maxAbsolutePosition: NaN
      }
    );

    assert.equal(
      result.allowed,
      false
    );
  }
);


test(
  "infinite max absolute position fails closed",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      baseState(),
      {
        maxAbsolutePosition: Infinity
      }
    );

    assert.equal(
      result.allowed,
      false
    );
  }
);


test(
  "negative max absolute position fails closed",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      baseState(),
      {
        maxAbsolutePosition: -1
      }
    );

    assert.equal(
      result.allowed,
      false
    );
  }
);


test(
  "NaN max daily loss fails closed",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      baseState(),
      {
        maxDailyLoss: NaN
      }
    );

    assert.equal(
      result.allowed,
      false
    );
  }
);


test(
  "infinite max daily loss fails closed",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      baseState(),
      {
        maxDailyLoss: Infinity
      }
    );

    assert.equal(
      result.allowed,
      false
    );
  }
);


test(
  "negative max daily loss fails closed",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      baseState(),
      {
        maxDailyLoss: -1
      }
    );

    assert.equal(
      result.allowed,
      false
    );
  }
);


/*
========================================================
BOUNDARY TESTS
========================================================
*/

test(
  "order exactly at notional limit is allowed",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      baseState(),
      {
        maxOrderNotional: 100
      }
    );

    assert.equal(
      result.allowed,
      true
    );
  }
);


test(
  "order one cent above notional limit is rejected",
  () => {
    const result = evaluateRisk(
      {
        ...baseOrder(),
        price: 100.01
      },
      baseState(),
      {
        maxOrderNotional: 100
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
  }
);


test(
  "position exactly at absolute limit is allowed",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      baseState(),
      {
        maxAbsolutePosition: 1
      }
    );

    assert.equal(
      result.allowed,
      true
    );
  }
);


test(
  "position one unit above absolute limit is rejected",
  () => {
    const result = evaluateRisk(
      {
        ...baseOrder(),
        quantity: 2
      },
      baseState(),
      {
        maxAbsolutePosition: 1
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
  }
);


test(
  "daily loss exactly at limit is rejected",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      {
        currentPosition: 0,
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
  }
);


test(
  "daily loss just below limit remains rejected",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      {
        currentPosition: 0,
        dailyLoss: -1000.01
      },
      {
        maxDailyLoss: 1000
      }
    );

    assert.equal(
      result.allowed,
      false
    );
  }
);


/*
========================================================
VALID REGRESSION
========================================================
*/

test(
  "valid finite risk limits remain allowed",
  () => {
    const result = evaluateRisk(
      baseOrder(),
      baseState(),
      {
        maxOrderNotional: 1000,
        maxPositionNotional: 5000,
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