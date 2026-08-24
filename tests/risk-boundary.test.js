import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateRisk
} from "../src/core.js";


const BASE_ORDER = {
  quantity: 10,
  price: 100,
  side: "BUY"
};

const BASE_STATE = {
  currentPosition: 0,
  dailyLoss: 0
};


/*
========================================================
RISK CONFIGURATION BOUNDARY
========================================================
*/

test(
  "negative maxOrderNotional is rejected",
  () => {
    const result =
      evaluateRisk(
        BASE_ORDER,
        BASE_STATE,
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
  "NaN maxOrderNotional is rejected",
  () => {
    const result =
      evaluateRisk(
        BASE_ORDER,
        BASE_STATE,
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
  "Infinity maxPositionNotional is rejected",
  () => {
    const result =
      evaluateRisk(
        BASE_ORDER,
        BASE_STATE,
        {
          maxPositionNotional: Infinity
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
  "negative maxAbsolutePosition is rejected",
  () => {
    const result =
      evaluateRisk(
        BASE_ORDER,
        BASE_STATE,
        {
          maxAbsolutePosition: -5
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
  "negative maxDailyLoss is rejected",
  () => {
    const result =
      evaluateRisk(
        BASE_ORDER,
        BASE_STATE,
        {
          maxDailyLoss: -100
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


/*
========================================================
RISK CALCULATION OVERFLOW
========================================================
*/

test(
  "order notional overflow is rejected",
  () => {
    const result =
      evaluateRisk(
        {
          quantity: Number.MAX_SAFE_INTEGER,
          price: Number.MAX_VALUE,
          side: "BUY"
        },
        BASE_STATE
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


test(
  "projected position overflow is rejected",
  () => {
    const result =
      evaluateRisk(
        {
          quantity: Number.MAX_VALUE,
          price: 1,
          side: "BUY"
        },
        {
          currentPosition:
            Number.MAX_VALUE,
          dailyLoss: 0
        }
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
ORDER NOTIONAL LIMIT
========================================================
*/

test(
  "order exactly at notional limit is accepted",
  () => {
    const result =
      evaluateRisk(
        BASE_ORDER,
        BASE_STATE,
        {
          maxOrderNotional: 1000
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

    assert.deepEqual(
      result.reasons,
      []
    );
  }
);


test(
  "order above notional limit is rejected",
  () => {
    const result =
      evaluateRisk(
        BASE_ORDER,
        BASE_STATE,
        {
          maxOrderNotional: 999
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


/*
========================================================
POSITION NOTIONAL LIMIT
========================================================
*/

test(
  "position exactly at notional limit is accepted",
  () => {
    const result =
      evaluateRisk(
        BASE_ORDER,
        BASE_STATE,
        {
          maxPositionNotional: 1000
        }
      );

    assert.equal(
      result.allowed,
      true
    );

    assert.equal(
      result.projectedNotional,
      1000
    );

    assert.deepEqual(
      result.reasons,
      []
    );
  }
);


test(
  "position above notional limit is rejected",
  () => {
    const result =
      evaluateRisk(
        BASE_ORDER,
        {
          currentPosition: 1,
          dailyLoss: 0
        },
        {
          maxPositionNotional: 1000
        }
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.ok(
      result.reasons.includes(
        "POSITION_NOTIONAL_LIMIT"
      )
    );
  }
);


/*
========================================================
ABSOLUTE POSITION LIMIT
========================================================
*/

test(
  "absolute position exactly at limit is accepted",
  () => {
    const result =
      evaluateRisk(
        BASE_ORDER,
        BASE_STATE,
        {
          maxAbsolutePosition: 10
        }
      );

    assert.equal(
      result.allowed,
      true
    );

    assert.equal(
      result.projectedPosition,
      10
    );

    assert.deepEqual(
      result.reasons,
      []
    );
  }
);


test(
  "absolute position above limit is rejected",
  () => {
    const result =
      evaluateRisk(
        BASE_ORDER,
        BASE_STATE,
        {
          maxAbsolutePosition: 9
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


/*
========================================================
DAILY LOSS LIMIT
========================================================
*/

test(
  "daily loss exactly at limit is rejected",
  () => {
    const result =
      evaluateRisk(
        BASE_ORDER,
        {
          currentPosition: 0,
          dailyLoss: -100
        },
        {
          maxDailyLoss: 100
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
  "daily loss below limit is rejected",
  () => {
    const result =
      evaluateRisk(
        BASE_ORDER,
        {
          currentPosition: 0,
          dailyLoss: -101
        },
        {
          maxDailyLoss: 100
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
  "daily loss above safety boundary remains allowed",
  () => {
    const result =
      evaluateRisk(
        BASE_ORDER,
        {
          currentPosition: 0,
          dailyLoss: -99
        },
        {
          maxDailyLoss: 100
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
SIDE / POSITION PROJECTION
========================================================
*/

test(
  "BUY increases projected position",
  () => {
    const result =
      evaluateRisk(
        {
          quantity: 10,
          price: 100,
          side: "BUY"
        },
        {
          currentPosition: 5,
          dailyLoss: 0
        }
      );

    assert.equal(
      result.allowed,
      true
    );

    assert.equal(
      result.projectedPosition,
      15
    );
  }
);


test(
  "SELL decreases projected position",
  () => {
    const result =
      evaluateRisk(
        {
          quantity: 10,
          price: 100,
          side: "SELL"
        },
        {
          currentPosition: 15,
          dailyLoss: 0
        }
      );

    assert.equal(
      result.allowed,
      true
    );

    assert.equal(
      result.projectedPosition,
      5
    );
  }
);


/*
========================================================
MULTIPLE SAFETY FAILURES
========================================================
*/

test(
  "multiple invalid risk conditions are reported",
  () => {
    const result =
      evaluateRisk(
        {
          quantity: 0,
          price: -1,
          side: "HOLD"
        },
        {
          currentPosition: NaN,
          dailyLoss: Infinity
        },
        {
          maxOrderNotional: -1,
          maxPositionNotional: -1,
          maxAbsolutePosition: -1,
          maxDailyLoss: -1
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

    assert.ok(
      result.reasons.includes(
        "INVALID_RISK_LIMIT_MAXORDERNOTIONAL"
      )
    );

    assert.ok(
      result.reasons.includes(
        "INVALID_RISK_LIMIT_MAXPOSITIONNOTIONAL"
      )
    );

    assert.ok(
      result.reasons.includes(
        "INVALID_RISK_LIMIT_MAXABSOLUTEPOSITION"
      )
    );

    assert.ok(
      result.reasons.includes(
        "INVALID_RISK_LIMIT_MAXDAILYLOSS"
      )
    );

    assert.ok(
      result.reasons.includes(
        "INVALID_QUANTITY"
      )
    );

    assert.ok(
      result.reasons.includes(
        "INVALID_PRICE"
      )
    );

    assert.ok(
      result.reasons.includes(
        "INVALID_SIDE"
      )
    );
  }
);