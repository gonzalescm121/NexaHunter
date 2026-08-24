import test from "node:test";
import assert from "node:assert/strict";

import {
  validateSeries
} from "../src/core.js";

const BAR = {
  symbol: "AAPL",
  timestamp: 100000,
  open: 100,
  high: 105,
  low: 95,
  close: 102,
  volume: 1000
};


/* =====================================================
   BASIC ACCEPTANCE
   ===================================================== */

test("valid series is accepted", () => {
  const result = validateSeries(
    [
      { ...BAR, timestamp: 100000 },
      { ...BAR, timestamp: 160000 },
      { ...BAR, timestamp: 220000 }
    ],
    {
      nowMs: 220000,
      intervalMs: 60000,
      maxGapIntervals: 1
    }
  );

  assert.equal(result.status, "ACCEPT");
  assert.equal(result.valid, true);
  assert.equal(result.accepted.length, 3);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.quarantined.length, 0);
});


/* =====================================================
   EMPTY SERIES
   ===================================================== */

test("empty series is accepted", () => {
  const result = validateSeries([]);

  assert.equal(result.status, "ACCEPT");
  assert.equal(result.valid, true);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.quarantined.length, 0);
});


/* =====================================================
   NON-ARRAY
   ===================================================== */

test("non-array series is rejected safely", () => {
  const result = validateSeries(null);

  assert.equal(result.status, "REJECT");
  assert.equal(result.valid, false);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.quarantined.length, 1);

  assert.ok(
    result.quarantined[0].reasons.includes(
      "SERIES_NOT_ARRAY"
    )
  );
});


/* =====================================================
   DUPLICATE TIMESTAMP
   ===================================================== */

test("duplicate timestamp is rejected", () => {
  const result = validateSeries(
    [
      { ...BAR, timestamp: 100000 },
      { ...BAR, timestamp: 100000 }
    ],
    {
      nowMs: 100000,
      intervalMs: 60000
    }
  );

  assert.equal(result.valid, false);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.quarantined.length, 0);

  assert.ok(
    result.rejected[0].reasons.includes(
      "DUPLICATE_TIMESTAMP"
    )
  );
});


/* =====================================================
   OUT OF ORDER
   ===================================================== */

test("out of order timestamp is rejected", () => {
  const result = validateSeries(
    [
      { ...BAR, timestamp: 100000 },
      { ...BAR, timestamp: 90000 }
    ],
    {
      nowMs: 100000,
      intervalMs: 60000
    }
  );

  assert.equal(result.valid, false);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.rejected.length, 1);

  assert.ok(
    result.rejected[0].reasons.includes(
      "OUT_OF_ORDER_TIMESTAMP"
    )
  );
});


/* =====================================================
   DATA GAP
   ===================================================== */

test("data gap is quarantined", () => {
  const result = validateSeries(
    [
      { ...BAR, timestamp: 100000 },
      { ...BAR, timestamp: 220000 }
    ],
    {
      nowMs: 220000,
      intervalMs: 60000,
      maxGapIntervals: 1
    }
  );

  assert.equal(result.valid, false);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.quarantined.length, 1);

  assert.ok(
    result.quarantined[0].warnings.includes(
      "DATA_GAP"
    )
  );
});


/* =====================================================
   INVALID BAR
   ===================================================== */

test("invalid bar is rejected safely", () => {
  const result = validateSeries(
    [
      { ...BAR, timestamp: 100000 },
      null
    ],
    {
      nowMs: 100000
    }
  );

  assert.equal(result.valid, false);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.rejected.length, 1);

  assert.ok(
    result.rejected[0].reasons.includes(
      "BAR_NOT_OBJECT"
    )
  );
});


/* =====================================================
   INVALID VOLUME
   ===================================================== */

test("negative volume is rejected", () => {
  const result = validateSeries(
    [
      { ...BAR, timestamp: 100000 },
      {
        ...BAR,
        timestamp: 160000,
        volume: -1
      }
    ],
    {
      nowMs: 160000,
      intervalMs: 60000
    }
  );

  assert.equal(result.valid, false);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.rejected.length, 1);

  assert.ok(
    result.rejected[0].reasons.includes(
      "INVALID_VOLUME"
    )
  );
});


/* =====================================================
   FUTURE TIMESTAMP
   ===================================================== */

test("future timestamp is rejected", () => {
  const result = validateSeries(
    [
      { ...BAR, timestamp: 100000 },
      { ...BAR, timestamp: 200000 }
    ],
    {
      nowMs: 100000,
      maxClockSkewMs: 0,
      intervalMs: 60000
    }
  );

  assert.equal(result.valid, false);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.rejected.length, 1);

  assert.ok(
    result.rejected[0].reasons.includes(
      "FUTURE_TIMESTAMP"
    )
  );
});


/* =====================================================
   IMPOSSIBLE HIGH
   ===================================================== */

test("impossible high is rejected", () => {
  const result = validateSeries(
    [
      {
        ...BAR,
        high: 90
      }
    ],
    {
      nowMs: 100000
    }
  );

  assert.equal(result.valid, false);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected.length, 1);

  assert.ok(
    result.rejected[0].reasons.includes(
      "IMPOSSIBLE_HIGH"
    )
  );
});


/* =====================================================
   IMPOSSIBLE LOW
   ===================================================== */

test("impossible low is rejected", () => {
  const result = validateSeries(
    [
      {
        ...BAR,
        low: 110
      }
    ],
    {
      nowMs: 100000
    }
  );

  assert.equal(result.valid, false);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected.length, 1);

  assert.ok(
    result.rejected[0].reasons.includes(
      "IMPOSSIBLE_LOW"
    )
  );
});


/* =====================================================
   REJECTED BAR DOES NOT UPDATE BASELINE
   ===================================================== */

test("rejected bar does not update timestamp baseline", () => {
  const result = validateSeries(
    [
      {
        ...BAR,
        timestamp: 100000
      },

      {
        ...BAR,
        timestamp: 160000,
        high: 50
      },

      {
        ...BAR,
        timestamp: 220000
      }
    ],
    {
      nowMs: 220000,
      intervalMs: 60000,
      maxGapIntervals: 1
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
});


/* =====================================================
   QUARANTINED BAR DOES NOT UPDATE BASELINE
   ===================================================== */

test("quarantined bar does not update timestamp baseline", () => {
  const result = validateSeries(
    [
      {
        ...BAR,
        timestamp: 100000
      },

      {
        ...BAR,
        timestamp: 220000
      },

      {
        ...BAR,
        timestamp: 280000
      }
    ],
    {
      nowMs: 280000,
      intervalMs: 60000,
      maxGapIntervals: 1,

      /*
       * Prevent the first bar from being quarantined
       * for STALE_FEED. This test is specifically testing
       * whether a DATA_GAP quarantine updates the
       * timestamp baseline.
       */
      staleAfterMs: 1000000
    }
  );

  assert.equal(result.valid, false);

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
    result.accepted[0].index,
    0
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
    result.quarantined.every(
      item =>
        item.warnings.includes(
          "DATA_GAP"
        )
    )
  );
});


/* =====================================================
   SERIES STATUS
   ===================================================== */

test("degraded series is not valid", () => {
  const result = validateSeries(
    [
      { ...BAR, timestamp: 100000 },
      {
        ...BAR,
        timestamp: 160000,
        volume: -1
      }
    ],
    {
      nowMs: 160000,
      intervalMs: 60000
    }
  );

  assert.equal(result.status, "DEGRADED");
  assert.equal(result.valid, false);
});