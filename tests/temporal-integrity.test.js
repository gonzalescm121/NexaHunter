import test from "node:test";
import assert from "node:assert/strict";

import {
  validateBar,
  validateSeries
} from "../src/core.js";


const BASE_BAR = {
  symbol: "AAPL",
  timestamp: 100000,
  open: 100,
  high: 105,
  low: 95,
  close: 102,
  volume: 1000
};


/*
========================================================
TIMESTAMP INTEGRITY
========================================================
*/

test(
  "future timestamp is rejected",
  () => {
    const result =
      validateBar(
        {
          ...BASE_BAR,
          timestamp: 200000
        },
        {
          nowMs: 100000
        }
      );

    assert.equal(
      result.status,
      "REJECT"
    );

    assert.equal(
      result.valid,
      false
    );

    assert.ok(
      result.reasons.includes(
        "FUTURE_TIMESTAMP"
      )
    );
  }
);


test(
  "stale timestamp is quarantined",
  () => {
    const result =
      validateBar(
        BASE_BAR,
        {
          nowMs: 300000,
          staleAfterMs: 1000
        }
      );

    assert.equal(
      result.status,
      "QUARANTINE"
    );

    assert.equal(
      result.valid,
      false
    );

    assert.ok(
      result.warnings.includes(
        "STALE_FEED"
      )
    );
  }
);


test(
  "timestamp exactly at stale boundary is accepted",
  () => {
    const result =
      validateBar(
        BASE_BAR,
        {
          nowMs: 101000,
          staleAfterMs: 1000
        }
      );

    assert.equal(
      result.status,
      "ACCEPT"
    );

    assert.equal(
      result.valid,
      true
    );
  }
);


test(
  "duplicate timestamp is rejected",
  () => {
    const result =
      validateBar(
        BASE_BAR,
        {
          nowMs: 100000,
          previousTimestamp: 100000
        }
      );

    assert.equal(
      result.status,
      "REJECT"
    );

    assert.equal(
      result.valid,
      false
    );

    assert.ok(
      result.reasons.includes(
        "DUPLICATE_TIMESTAMP"
      )
    );
  }
);


test(
  "out of order timestamp is rejected",
  () => {
    const result =
      validateBar(
        {
          ...BASE_BAR,
          timestamp: 99999
        },
        {
          nowMs: 100000,
          previousTimestamp: 100000
        }
      );

    assert.equal(
      result.status,
      "REJECT"
    );

    assert.equal(
      result.valid,
      false
    );

    assert.ok(
      result.reasons.includes(
        "OUT_OF_ORDER_TIMESTAMP"
      )
    );
  }
);


test(
  "timestamp exactly at allowed interval is accepted",
  () => {
    const result =
      validateBar(
        {
          ...BASE_BAR,
          timestamp: 160000
        },
        {
          nowMs: 160000,
          previousTimestamp: 100000,
          intervalMs: 60000,
          maxGapIntervals: 1
        }
      );

    assert.equal(
      result.status,
      "ACCEPT"
    );

    assert.equal(
      result.valid,
      true
    );

    assert.deepEqual(
      result.warnings,
      []
    );
  }
);


test(
  "timestamp gap is quarantined",
  () => {
    const result =
      validateBar(
        {
          ...BASE_BAR,
          timestamp: 220000
        },
        {
          nowMs: 220000,
          previousTimestamp: 100000,
          intervalMs: 60000,
          maxGapIntervals: 1
        }
      );

    assert.equal(
      result.status,
      "QUARANTINE"
    );

    assert.equal(
      result.valid,
      false
    );

    assert.ok(
      result.warnings.includes(
        "DATA_GAP"
      )
    );
  }
);


/*
========================================================
OHLC INTEGRITY
========================================================
*/

test(
  "impossible high is rejected",
  () => {
    const result =
      validateBar(
        {
          ...BASE_BAR,
          high: 90
        },
        {
          nowMs: 100000
        }
      );

    assert.equal(
      result.status,
      "REJECT"
    );

    assert.equal(
      result.valid,
      false
    );

    assert.ok(
      result.reasons.includes(
        "IMPOSSIBLE_HIGH"
      )
    );
  }
);


test(
  "impossible low is rejected",
  () => {
    const result =
      validateBar(
        {
          ...BASE_BAR,
          low: 110
        },
        {
          nowMs: 100000
        }
      );

    assert.equal(
      result.status,
      "REJECT"
    );

    assert.equal(
      result.valid,
      false
    );

    assert.ok(
      result.reasons.includes(
        "IMPOSSIBLE_LOW"
      )
    );
  }
);


test(
  "valid OHLC relationship is accepted",
  () => {
    const result =
      validateBar(
        BASE_BAR,
        {
          nowMs: 100000
        }
      );

    assert.equal(
      result.status,
      "ACCEPT"
    );

    assert.equal(
      result.valid,
      true
    );

    assert.deepEqual(
      result.reasons,
      []
    );

    assert.deepEqual(
      result.warnings,
      []
    );
  }
);


/*
========================================================
VOLUME INTEGRITY
========================================================
*/

test(
  "negative volume is rejected",
  () => {
    const result =
      validateBar(
        {
          ...BASE_BAR,
          volume: -1
        },
        {
          nowMs: 100000
        }
      );

    assert.equal(
      result.status,
      "REJECT"
    );

    assert.equal(
      result.valid,
      false
    );

    assert.ok(
      result.reasons.includes(
        "INVALID_VOLUME"
      )
    );
  }
);


test(
  "zero volume remains valid",
  () => {
    const result =
      validateBar(
        {
          ...BASE_BAR,
          volume: 0
        },
        {
          nowMs: 100000
        }
      );

    assert.equal(
      result.status,
      "ACCEPT"
    );

    assert.equal(
      result.valid,
      true
    );
  }
);


/*
========================================================
SYMBOL INTEGRITY
========================================================
*/

test(
  "symbol mismatch is rejected",
  () => {
    const result =
      validateBar(
        BASE_BAR,
        {
          nowMs: 100000,
          symbol: "MSFT"
        }
      );

    assert.equal(
      result.status,
      "REJECT"
    );

    assert.equal(
      result.valid,
      false
    );

    assert.ok(
      result.reasons.includes(
        "SYMBOL_MISMATCH"
      )
    );
  }
);


test(
  "lowercase symbol is normalized",
  () => {
    const result =
      validateBar(
        {
          ...BASE_BAR,
          symbol: "aapl"
        },
        {
          nowMs: 100000,
          symbol: "AAPL"
        }
      );

    assert.equal(
      result.status,
      "ACCEPT"
    );

    assert.equal(
      result.valid,
      true
    );
  }
);


/*
========================================================
SERIES INTEGRITY
========================================================
*/

test(
  "ordered series is accepted",
  () => {
    const result =
      validateSeries(
        [
          {
            ...BASE_BAR,
            timestamp: 100000
          },
          {
            ...BASE_BAR,
            timestamp: 160000
          },
          {
            ...BASE_BAR,
            timestamp: 220000
          }
        ],
        {
          nowMs: 220000,
          intervalMs: 60000,
          maxGapIntervals: 1
        }
      );

    assert.equal(
      result.status,
      "ACCEPT"
    );

    assert.equal(
      result.valid,
      true
    );

    assert.equal(
      result.accepted.length,
      3
    );

    assert.equal(
      result.rejected.length,
      0
    );

    assert.equal(
      result.quarantined.length,
      0
    );
  }
);


test(
  "duplicate series timestamp is rejected",
  () => {
    const result =
      validateSeries(
        [
          {
            ...BASE_BAR,
            timestamp: 100000
          },
          {
            ...BASE_BAR,
            timestamp: 100000
          }
        ],
        {
          nowMs: 100000
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.accepted.length,
      1
    );

    assert.equal(
      result.rejected.length,
      1
    );

    assert.ok(
      result.rejected[0].reasons.includes(
        "DUPLICATE_TIMESTAMP"
      )
    );
  }
);


test(
  "out of order series timestamp is rejected",
  () => {
    const result =
      validateSeries(
        [
          {
            ...BASE_BAR,
            timestamp: 100000
          },
          {
            ...BASE_BAR,
            timestamp: 90000
          }
        ],
        {
          nowMs: 100000
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.accepted.length,
      1
    );

    assert.equal(
      result.rejected.length,
      1
    );

    assert.ok(
      result.rejected[0].reasons.includes(
        "OUT_OF_ORDER_TIMESTAMP"
      )
    );
  }
);


test(
  "series data gap is quarantined",
  () => {
    const result =
      validateSeries(
        [
          {
            ...BASE_BAR,
            timestamp: 100000
          },
          {
            ...BASE_BAR,
            timestamp: 220000
          }
        ],
        {
          nowMs: 220000,
          intervalMs: 60000,
          maxGapIntervals: 1
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.accepted.length,
      1
    );

    assert.equal(
      result.quarantined.length,
      1
    );

    assert.ok(
      result.quarantined[0].warnings.includes(
        "DATA_GAP"
      )
    );
  }
);


test(
  "series preserves rejected bars separately",
  () => {
    const result =
      validateSeries(
        [
          {
            ...BASE_BAR,
            timestamp: 100000
          },
          {
            ...BASE_BAR,
            timestamp: 160000,
            high: 50
          },
          {
            ...BASE_BAR,
            timestamp: 220000
          }
        ],
        {
          nowMs: 220000,
          intervalMs: 60000,
          maxGapIntervals: 1
        }
      );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.accepted.length,
      2
    );

    assert.equal(
      result.rejected.length,
      1
    );

    assert.equal(
      result.quarantined.length,
      0
    );

    assert.ok(
      result.rejected[0].reasons.includes(
        "IMPOSSIBLE_HIGH"
      )
    );
  }
);