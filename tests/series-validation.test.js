import test from "node:test";
import assert from "node:assert/strict";

import {
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
TEST 1
VALID CHRONOLOGICAL SERIES
========================================================
*/

test(
  "valid chronological series is accepted",
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
          maxGapIntervals: 1,
          staleAfterMs: 120000
        }
      );

    assert.equal(result.status, "ACCEPT");
    assert.equal(result.valid, true);
    assert.equal(result.accepted.length, 3);
    assert.equal(result.rejected.length, 0);
    assert.equal(result.quarantined.length, 0);
  }
);


/*
========================================================
TEST 2
EMPTY SERIES
========================================================
*/

test(
  "empty series is accepted",
  () => {
    const result =
      validateSeries(
        [],
        {
          nowMs: 100000
        }
      );

    assert.equal(result.status, "ACCEPT");
    assert.equal(result.valid, true);
    assert.deepEqual(result.accepted, []);
    assert.deepEqual(result.rejected, []);
    assert.deepEqual(result.quarantined, []);
  }
);


/*
========================================================
TEST 3
NON-ARRAY SERIES
========================================================
*/

test(
  "non-array series is rejected safely",
  () => {
    const result =
      validateSeries(
        null
      );

    assert.equal(result.status, "REJECT");
    assert.equal(result.valid, false);

    assert.equal(
      result.accepted.length,
      0
    );

    assert.equal(
      result.rejected.length,
      0
    );

    assert.equal(
      result.quarantined.length,
      1
    );

    assert.equal(
      result.quarantined[0].index,
      -1
    );

    assert.ok(
      result.quarantined[0].reasons.includes(
        "SERIES_NOT_ARRAY"
      )
    );
  }
);


/*
========================================================
TEST 4
DUPLICATE TIMESTAMP
========================================================
*/

test(
  "duplicate timestamp is rejected",
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
          nowMs: 100000,
          intervalMs: 60000
        }
      );

    assert.equal(result.valid, false);

    assert.equal(
      result.accepted.length,
      1
    );

    assert.equal(
      result.rejected.length,
      1
    );

    assert.equal(
      result.quarantined.length,
      0
    );

    assert.equal(
      result.rejected[0].index,
      1
    );

    assert.ok(
      result.rejected[0].reasons.includes(
        "DUPLICATE_TIMESTAMP"
      )
    );
  }
);


/*
========================================================
TEST 5
OUT OF ORDER
========================================================
*/

test(
  "out of order timestamp is rejected",
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
          nowMs: 100000,
          intervalMs: 60000
        }
      );

    assert.equal(result.valid, false);

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


/*
========================================================
TEST 6
DATA GAP
========================================================
*/

test(
  "data gap is quarantined",
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
      result.status,
      "DEGRADED"
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
      0
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


/*
========================================================
TEST 7
MAXIMUM ALLOWED GAP
========================================================
*/

test(
  "maximum allowed interval gap is accepted",
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
          }
        ],
        {
          nowMs: 160000,
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
      2
    );

    assert.equal(
      result.quarantined.length,
      0
    );
  }
);


/*
========================================================
TEST 8
INVALID BAR
========================================================
*/

test(
  "invalid bar is rejected without crashing",
  () => {
    const result =
      validateSeries(
        [
          {
            ...BASE_BAR,
            timestamp: 100000
          },
          null
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
        "BAR_NOT_OBJECT"
      )
    );
  }
);


/*
========================================================
TEST 9
INVALID PRICE
========================================================
*/

test(
  "invalid price is rejected",
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
            close: 0
          }
        ],
        {
          nowMs: 160000,
          intervalMs: 60000
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
        "INVALID_PRICE"
      )
    );
  }
);


/*
========================================================
TEST 10
INVALID VOLUME
========================================================
*/

test(
  "negative volume is rejected",
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
            volume: -1
          }
        ],
        {
          nowMs: 160000,
          intervalMs: 60000
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
        "INVALID_VOLUME"
      )
    );
  }
);


/*
========================================================
TEST 11
FUTURE TIMESTAMP
========================================================
*/

test(
  "future timestamp is rejected",
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
            timestamp: 200000
          }
        ],
        {
          nowMs: 100000,
          maxClockSkewMs: 0,
          intervalMs: 60000
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
        "FUTURE_TIMESTAMP"
      )
    );
  }
);


/*
========================================================
TEST 12
REJECTED BAR DOES NOT BECOME BASELINE
========================================================
*/

test(
  "rejected bar does not become timestamp baseline",
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
      1
    );

    assert.equal(
      result.rejected.length,
      1
    );

    assert.equal(
      result.quarantined.length,
      1
    );

    assert.equal(
      result.rejected[0].index,
      1
    );

    assert.equal(
      result.quarantined[0].index,
      2
    );

    assert.ok(
      result.rejected[0].reasons.includes(
        "IMPOSSIBLE_HIGH"
      )
    );

    assert.ok(
      result.quarantined[0].warnings.includes(
        "DATA_GAP"
      )
    );
  }
);


/*
========================================================
TEST 13
QUARANTINED BAR DOES NOT BECOME BASELINE
========================================================
*/

test(
  "quarantined bar does not become timestamp baseline",
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
          },

          {
            ...BASE_BAR,
            timestamp: 280000
          }
        ],
        {
          nowMs: 280000,
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
      result.rejected.length,
      0
    );

    assert.equal(
      result.quarantined.length,
      2
    );

    assert.ok(
      result.quarantined[0].warnings.includes(
        "DATA_GAP"
      )
    );

    assert.ok(
      result.quarantined[1].warnings.includes(
        "DATA_GAP"
      )
    );
  }
);


/*
========================================================
TEST 14
IMPOSSIBLE HIGH
========================================================
*/

test(
  "impossible high is rejected",
  () => {
    const result =
      validateSeries(
        [
          {
            ...BASE_BAR,
            high: 90
          }
        ],
        {
          nowMs: 100000
        }
      );

    assert.equal(
      result.status,
      "DEGRADED"
    );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.accepted.length,
      0
    );

    assert.equal(
      result.rejected.length,
      1
    );

    assert.ok(
      result.rejected[0].reasons.includes(
        "IMPOSSIBLE_HIGH"
      )
    );
  }
);


/*
========================================================
TEST 15
IMPOSSIBLE LOW
========================================================
*/

test(
  "impossible low is rejected",
  () => {
    const result =
      validateSeries(
        [
          {
            ...BASE_BAR,
            low: 110
          }
        ],
        {
          nowMs: 100000
        }
      );

    assert.equal(
      result.status,
      "DEGRADED"
    );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.accepted.length,
      0
    );

    assert.equal(
      result.rejected.length,
      1
    );

    assert.ok(
      result.rejected[0].reasons.includes(
        "IMPOSSIBLE_LOW"
      )
    );
  }
);


/*
========================================================
TEST 16
MIXED VALIDATION
========================================================
*/

test(
  "mixed series separates accepted rejected and quarantined bars",
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
      result.status,
      "DEGRADED"
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

    assert.equal(
      result.quarantined.length,
      1
    );

    assert.equal(
      result.accepted[0].index,
      0
    );

    assert.equal(
      result.rejected[0].index,
      1
    );

    assert.equal(
      result.quarantined[0].index,
      2
    );
  }
);


/*
========================================================
TEST 17
SERIES STATUS
========================================================
*/

test(
  "clean series returns ACCEPT",
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
          }
        ],
        {
          nowMs: 160000,
          intervalMs: 60000
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
  "degraded series returns DEGRADED",
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
            volume: -1
          }
        ],
        {
          nowMs: 160000,
          intervalMs: 60000
        }
      );

    assert.equal(
      result.status,
      "DEGRADED"
    );

    assert.equal(
      result.valid,
      false
    );
  }
);