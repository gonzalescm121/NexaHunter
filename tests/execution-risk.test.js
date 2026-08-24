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


function limits(overrides = {}) {
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
NORMAL RISK + EXECUTION FLOW
========================================================
*/

test(
  "normal order passes risk and execution",
  () => {
    const o = order({
      quantity: 10,
      price: 100,
      side: "BUY"
    });

    const risk =
      evaluateRisk(
        o,
        state(),
        limits()
      );

    assert.equal(
      risk.allowed,
      true
    );

    const execution =
      estimateExecution(
        o,
        {
          spreadBps: 10,
          slippageBps: 5,
          latencyMs: 20
        }
      );

    assert.equal(
      execution.valid,
      true
    );

    assert.ok(
      Number.isFinite(
        execution.executionPrice
      )
    );

    assert.ok(
      Number.isFinite(
        execution.estimatedNotional
      )
    );
  }
);


/*
========================================================
RISK REJECTION
========================================================
*/

test(
  "order above max order notional is rejected by risk",
  () => {
    const o = order({
      quantity: 100,
      price: 100
    });

    const risk =
      evaluateRisk(
        o,
        state(),
        limits({
          maxOrderNotional: 5000
        })
      );

    assert.equal(
      risk.allowed,
      false
    );

    assert.ok(
      risk.reasons.includes(
        "ORDER_NOTIONAL_LIMIT"
      )
    );
  }
);


test(
  "order above position notional limit is rejected",
  () => {
    const o = order({
      quantity: 100,
      price: 100
    });

    const risk =
      evaluateRisk(
        o,
        state(),
        limits({
          maxPositionNotional: 5000
        })
      );

    assert.equal(
      risk.allowed,
      false
    );

    assert.ok(
      risk.reasons.includes(
        "POSITION_NOTIONAL_LIMIT"
      )
    );
  }
);


test(
  "order beyond absolute position limit is rejected",
  () => {
    const o = order({
      quantity: 101
    });

    const risk =
      evaluateRisk(
        o,
        state(),
        limits({
          maxAbsolutePosition: 100
        })
      );

    assert.equal(
      risk.allowed,
      false
    );

    assert.ok(
      risk.reasons.includes(
        "POSITION_LIMIT"
      )
    );
  }
);


/*
========================================================
DAILY LOSS GATING
========================================================
*/

test(
  "daily loss limit prevents additional risk",
  () => {
    const risk =
      evaluateRisk(
        order(),
        state({
          dailyLoss: -1000
        }),
        limits({
          maxDailyLoss: 1000
        })
      );

    assert.equal(
      risk.allowed,
      false
    );

    assert.ok(
      risk.reasons.includes(
        "DAILY_LOSS_LIMIT"
      )
    );
  }
);


/*
========================================================
EXECUTION VALIDATION
========================================================
*/

test(
  "normal BUY execution remains valid",
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

    assert.equal(
      result.valid,
      true
    );

    assert.equal(
      result.executionPrice,
      100
    );

    assert.equal(
      result.grossNotional,
      1000
    );
  }
);


test(
  "normal SELL execution remains valid",
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

    assert.equal(
      result.valid,
      true
    );

    assert.equal(
      result.executionPrice,
      100
    );

    assert.equal(
      result.grossNotional,
      1000
    );
  }
);


/*
========================================================
SPREAD / SLIPPAGE INTERACTION
========================================================
*/

test(
  "BUY execution price increases with spread and slippage",
  () => {
    const result =
      estimateExecution(
        order({
          quantity: 10,
          price: 100,
          side: "BUY"
        }),
        {
          spreadBps: 20,
          slippageBps: 10
        }
      );

    assert.equal(
      result.valid,
      true
    );

    assert.ok(
      result.executionPrice >
        100
    );

    assert.ok(
      result.estimatedNotional >
        1000
    );

    assert.ok(
      result.estimatedCost >
        0
    );
  }
);


test(
  "SELL execution price decreases with spread and slippage",
  () => {
    const result =
      estimateExecution(
        order({
          quantity: 10,
          price: 100,
          side: "SELL"
        }),
        {
          spreadBps: 20,
          slippageBps: 10
        }
      );

    assert.equal(
      result.valid,
      true
    );

    assert.ok(
      result.executionPrice <
        100
    );

    assert.ok(
      result.estimatedNotional <
        1000
    );

    assert.ok(
      result.estimatedCost >
        0
    );
  }
);


/*
========================================================
EXTREME NUMERIC VALUES
========================================================
*/

test(
  "risk rejects a finite order whose notional overflows",
  () => {
    const risk =
      evaluateRisk(
        order({
          quantity: 1000000000000000000,
          price: 1e308
        }),
        state(),
        limits({
          maxOrderNotional: 1e308,
          maxPositionNotional: 1e308
        })
      );

    assert.equal(
      risk.allowed,
      false
    );

    assert.ok(
      risk.reasons.includes(
        "RISK_CALCULATION_OVERFLOW"
      )
    );

    assert.equal(
      Number.isFinite(
        risk.orderNotional
      ),
      false
    );
  }
);


test(
  "execution rejects a finite order whose notional overflows",
  () => {
    const result =
      estimateExecution(
        order({
          quantity: 1000000000000000000,
          price: 1e308
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
EXECUTION MARKET EXTREMES
========================================================
*/

test(
  "infinite spread fails closed",
  () => {
    const result =
      estimateExecution(
        order(),
        {
          spreadBps: Infinity
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
  "infinite slippage fails closed",
  () => {
    const result =
      estimateExecution(
        order(),
        {
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
  "negative latency fails closed",
  () => {
    const result =
      estimateExecution(
        order(),
        {
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
INVALID ORDER INTERACTIONS
========================================================
*/

test(
  "risk rejects zero quantity",
  () => {
    const risk =
      evaluateRisk(
        order({
          quantity: 0
        }),
        state(),
        limits()
      );

    assert.equal(
      risk.allowed,
      false
    );

    assert.ok(
      risk.reasons.includes(
        "INVALID_QUANTITY"
      )
    );
  }
);


test(
  "execution rejects zero quantity",
  () => {
    const result =
      estimateExecution(
        order({
          quantity: 0
        }),
        {}
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
  "risk rejects invalid side",
  () => {
    const risk =
      evaluateRisk(
        order({
          side: "HOLD"
        }),
        state(),
        limits()
      );

    assert.equal(
      risk.allowed,
      false
    );

    assert.ok(
      risk.reasons.includes(
        "INVALID_SIDE"
      )
    );
  }
);


test(
  "execution rejects invalid side",
  () => {
    const result =
      estimateExecution(
        order({
          side: "HOLD"
        }),
        {}
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
CORRUPTED RISK STATE
========================================================
*/

test(
  "NaN position blocks the risk decision",
  () => {
    const risk =
      evaluateRisk(
        order(),
        state({
          currentPosition: NaN
        }),
        limits()
      );

    assert.equal(
      risk.allowed,
      false
    );

    assert.ok(
      risk.reasons.includes(
        "INVALID_RISK_STATE"
      )
    );
  }
);


test(
  "infinite position blocks the risk decision",
  () => {
    const risk =
      evaluateRisk(
        order(),
        state({
          currentPosition: Infinity
        }),
        limits()
      );

    assert.equal(
      risk.allowed,
      false
    );

    assert.ok(
      risk.reasons.includes(
        "INVALID_RISK_STATE"
      )
    );
  }
);


/*
========================================================
CORRUPTED RISK LIMITS
========================================================
*/

test(
  "NaN max order notional blocks trading",
  () => {
    const risk =
      evaluateRisk(
        order(),
        state(),
        limits({
          maxOrderNotional: NaN
        })
      );

    assert.equal(
      risk.allowed,
      false
    );

    assert.ok(
      risk.reasons.includes(
        "INVALID_RISK_LIMIT_MAXORDERNOTIONAL"
      )
    );
  }
);


test(
  "infinite max position notional blocks trading",
  () => {
    const risk =
      evaluateRisk(
        order(),
        state(),
        limits({
          maxPositionNotional: Infinity
        })
      );

    assert.equal(
      risk.allowed,
      false
    );

    assert.ok(
      risk.reasons.includes(
        "INVALID_RISK_LIMIT_MAXPOSITIONNOTIONAL"
      )
    );
  }
);


test(
  "negative max absolute position blocks trading",
  () => {
    const risk =
      evaluateRisk(
        order(),
        state(),
        limits({
          maxAbsolutePosition: -1
        })
      );

    assert.equal(
      risk.allowed,
      false
    );

    assert.ok(
      risk.reasons.includes(
        "INVALID_RISK_LIMIT_MAXABSOLUTEPOSITION"
      )
    );
  }
);


/*
========================================================
RISK / EXECUTION CONSISTENCY
========================================================
*/

test(
  "risk notional matches execution gross notional",
  () => {
    const o =
      order({
        quantity: 25,
        price: 80
      });

    const risk =
      evaluateRisk(
        o,
        state(),
        limits({
          maxOrderNotional: 5000
        })
      );

    const execution =
      estimateExecution(
        o,
        {}
      );

    assert.equal(
      risk.allowed,
      true
    );

    assert.equal(
      execution.valid,
      true
    );

    assert.equal(
      risk.orderNotional,
      execution.grossNotional
    );
  }
);


test(
  "execution impact does not change gross order notional",
  () => {
    const o =
      order({
        quantity: 20,
        price: 50
      });

    const risk =
      evaluateRisk(
        o,
        state(),
        limits({
          maxOrderNotional: 1000
        })
      );

    const execution =
      estimateExecution(
        o,
        {
          spreadBps: 50,
          slippageBps: 25
        }
      );

    assert.equal(
      risk.allowed,
      true
    );

    assert.equal(
      execution.valid,
      true
    );

    assert.equal(
      risk.orderNotional,
      1000
    );

    assert.equal(
      execution.grossNotional,
      1000
    );
  }
);


/*
========================================================
FAIL-CLOSED COMPOSITION
========================================================
*/

test(
  "risk rejection must prevent authorization",
  () => {
    const o =
      order({
        quantity: 100,
        price: 100
      });

    const risk =
      evaluateRisk(
        o,
        state(),
        limits({
          maxOrderNotional: 5000
        })
      );

    assert.equal(
      risk.allowed,
      false
    );

    /*
     * This test intentionally does not call an execution
     * API after risk rejection. The risk result is the
     * authorization gate.
     */
    assert.notEqual(
      risk.allowed,
      true
    );
  }
);


test(
  "valid risk decision can proceed to execution estimation",
  () => {
    const o =
      order({
        quantity: 25,
        price: 100
      });

    const risk =
      evaluateRisk(
        o,
        state(),
        limits({
          maxOrderNotional: 5000
        })
      );

    assert.equal(
      risk.allowed,
      true
    );

    const execution =
      estimateExecution(
        o,
        {
          spreadBps: 10,
          slippageBps: 5
        }
      );

    assert.equal(
      execution.valid,
      true
    );
  }
);


/*
========================================================
FINAL SAFETY INVARIANTS
========================================================
*/

test(
  "accepted risk result always has finite derived values",
  () => {
    const risk =
      evaluateRisk(
        order(),
        state(),
        limits()
      );

    if (risk.allowed) {
      assert.equal(
        Number.isFinite(
          risk.orderNotional
        ),
        true
      );

      assert.equal(
        Number.isFinite(
          risk.projectedPosition
        ),
        true
      );

      assert.equal(
        Number.isFinite(
          risk.projectedNotional
        ),
        true
      );
    }
  }
);


test(
  "accepted execution result always has finite derived values",
  () => {
    const execution =
      estimateExecution(
        order(),
        {
          spreadBps: 10,
          slippageBps: 5
        }
      );

    if (execution.valid) {
      assert.equal(
        Number.isFinite(
          execution.executionPrice
        ),
        true
      );

      assert.equal(
        Number.isFinite(
          execution.grossNotional
        ),
        true
      );

      assert.equal(
        Number.isFinite(
          execution.estimatedNotional
        ),
        true
      );

      assert.equal(
        Number.isFinite(
          execution.estimatedCost
        ),
        true
      );
    }
  }
);