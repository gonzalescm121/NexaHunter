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


const OPTIONS = {
  nowMs: 220000,
  intervalMs: 60000,
  maxGapIntervals: 1,
  staleAfterMs: 120000
};


/*
========================================================
BASIC SERIES ACCEPTANCE
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
        OPTIONS
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


/*
========================================================
EMPTY SERIES
========================================================
*/

test(
  "empty series is accepted",
  () => {
    const result =
      validateSeries(
        [],
        OPTIONS
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
      result.accepted,
      []
    );

    assert.deepEqual(
      result.rejected,
      []
    );

    assert.deepEqual(
      result.quarantined,
      []
    );
  }
);


/*
========================================================
INVALID SERIES CONTAINER
========================================================
*/

test(
  "non-array series is rejected",
  () => {
    const result =
      validateSeries(
        null,
        OPTIONS
      );

    assert.equal(
      result.status,
      "REJECT"
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


test(
  "object series is rejected",
  () => {
    const result =
      validateSeries(
        {},
        OPTIONS
      );

    assert.equal(
      result.status,
      "REJECT"
    );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.quarantined.length,
      1
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
DUPLICATE TIMESTAMPS
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
          ...OPTIONS,
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
OUT OF ORDER DATA
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
          ...OPTIONS,
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
        "OUT_OF_ORDER_TIMESTAMP"
      )
    );
  }
);


/*
========================================================
DATA GAPS
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
        OPTIONS
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

    assert.equal(
      result.quarantined[0].index,
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
  "maximum allowed gap is accepted",
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
          ...OPTIONS,
          nowMs: 160000
        }
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
REJECTED BAR DOES NOT BECOME BASELINE
========================================================
*/

test(
  "rejected bar does not advance timestamp baseline",
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
        OPTIONS
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
QUARANTINED BAR DOES NOT BECOME BASELINE
========================================================
*/

test(
  "quarantined bar does not advance timestamp baseline",
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
          ...OPTIONS,
          nowMs: 280000
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

    assert.equal(
      result.quarantined[0].index,
      1
    );

    assert.equal(
      result.quarantined[1].index,
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
INVALID BAR INSIDE SERIES
========================================================
*/

test(
  "invalid bar is rejected without crashing series validation",
  () => {
    const result =
      validateSeries(
        [
          {
            ...BASE_BAR,
            timestamp: 100000
          },
          null,
          {
            ...BASE_BAR,
            timestamp: 160000
          }
        ],
        {
          ...OPTIONS,
          nowMs: 160000
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

    assert.equal(
      result.rejected[0].index,
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
INVALID PRICE INSIDE SERIES
========================================================
*/

test(
  "invalid price bar is rejected",
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
          },
          {
            ...BASE_BAR,
            timestamp: 220000
          }
        ],
        OPTIONS
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

    assert.equal(
      result.rejected[0].index,
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
INVALID VOLUME INSIDE SERIES
========================================================
*/

test(
  "negative volume bar is rejected",
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
          },
          {
            ...BASE_BAR,
            timestamp: 220000
          }
        ],
        OPTIONS
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

    assert.ok(
      result.rejected[0].reasons.includes(
        "INVALID_VOLUME"
      )
    );
  }
);


/*
========================================================
FUTURE TIMESTAMP INSIDE SERIES
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
          ...OPTIONS,
          nowMs: 100000,
          maxClockSkewMs: 0
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
MULTIPLE REJECTIONS
========================================================
*/

test(
  "series preserves multiple independent rejected bars",
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
            timestamp: 220000,
            volume: -1
          },
          {
            ...BASE_BAR,
            timestamp: 280000
          }
        ],
        {
          ...OPTIONS,
          nowMs: 280000
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
      2
    );

    assert.equal(
      result.quarantined.length,
      0
    );

    assert.equal(
      result.rejected[0].index,
      1
    );

    assert.equal(
      result.rejected[1].index,
      2
    );

    assert.ok(
      result.rejected[0].reasons.includes(
        "IMPOSSIBLE_HIGH"
      )
    );

    assert.ok(
      result.rejected[1].reasons.includes(
        "INVALID_VOLUME"
      )
    );
  }
);


/*
========================================================
MIXED SERIES
========================================================
*/

test(
  "mixed accepted rejected and quarantined bars remain separated",
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
          },
          {
            ...BASE_BAR,
            timestamp: 280000,
            volume: -1
          },
          {
            ...BASE_BAR,
            timestamp: 340000
          }
        ],
        {
          ...OPTIONS,
          nowMs: 340000
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
      2
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
      result.accepted[1].index,
      4
    );

    assert.equal(
      result.rejected[0].index,
      1
    );

    assert.equal(
      result.rejected[1].index,
      3
    );

    assert.equal(
      result.quarantined[0].index,
      2
    );
  }
);


/*
========================================================
RESULT STATUS
========================================================
*/

test(
  "any rejected bar changes series status to DEGRADED",
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
          }
        ],
        {
          ...OPTIONS,
          nowMs: 160000
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


test(
  "any quarantined bar changes series status to DEGRADED",
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
        OPTIONS
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