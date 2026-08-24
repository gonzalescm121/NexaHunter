import test from "node:test";
import assert from "node:assert/strict";

import {
  pointInTimeGuard,
  validateUniverseMembership
} from "../src/core.js";


/*
========================================================
POINT-IN-TIME GUARD
========================================================
*/

test(
  "feature timestamp before decision timestamp is accepted",
  () => {
    const result =
      pointInTimeGuard(
        90000,
        100000
      );

    assert.equal(
      result.allowed,
      true
    );

    assert.equal(
      result.reason,
      undefined
    );
  }
);


test(
  "feature timestamp exactly equal to decision timestamp is accepted with zero lag",
  () => {
    const result =
      pointInTimeGuard(
        100000,
        100000
      );

    assert.equal(
      result.allowed,
      true
    );
  }
);


test(
  "future feature timestamp is rejected",
  () => {
    const result =
      pointInTimeGuard(
        100001,
        100000
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.reason,
      "FUTURE_FEATURE"
    );
  }
);


test(
  "minimum lag boundary is accepted",
  () => {
    const result =
      pointInTimeGuard(
        90000,
        100000,
        {
          minimumLagMs: 10000
        }
      );

    assert.equal(
      result.allowed,
      true
    );
  }
);


test(
  "feature inside minimum lag is rejected",
  () => {
    const result =
      pointInTimeGuard(
        90001,
        100000,
        {
          minimumLagMs: 10000
        }
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.reason,
      "FUTURE_FEATURE"
    );
  }
);


test(
  "feature far enough before decision is accepted with minimum lag",
  () => {
    const result =
      pointInTimeGuard(
        50000,
        100000,
        {
          minimumLagMs: 25000
        }
      );

    assert.equal(
      result.allowed,
      true
    );
  }
);


test(
  "nonfinite feature timestamp is rejected",
  () => {
    const result =
      pointInTimeGuard(
        NaN,
        100000
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.reason,
      "INVALID_TIMESTAMP"
    );
  }
);


test(
  "infinite decision timestamp is rejected",
  () => {
    const result =
      pointInTimeGuard(
        100000,
        Infinity
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.reason,
      "INVALID_TIMESTAMP"
    );
  }
);


test(
  "negative minimum lag is rejected",
  () => {
    const result =
      pointInTimeGuard(
        90000,
        100000,
        {
          minimumLagMs: -1
        }
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.reason,
      "INVALID_TIMESTAMP_CONFIG"
    );
  }
);


test(
  "NaN minimum lag is rejected",
  () => {
    const result =
      pointInTimeGuard(
        90000,
        100000,
        {
          minimumLagMs: NaN
        }
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.reason,
      "INVALID_TIMESTAMP_CONFIG"
    );
  }
);


test(
  "infinite minimum lag is rejected",
  () => {
    const result =
      pointInTimeGuard(
        90000,
        100000,
        {
          minimumLagMs: Infinity
        }
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.reason,
      "INVALID_TIMESTAMP_CONFIG"
    );
  }
);


/*
========================================================
UNIVERSE MEMBERSHIP
========================================================
*/

test(
  "symbol in historical universe is accepted",
  () => {
    const result =
      validateUniverseMembership(
        "AAPL",
        "2026-08-24T15:30:00Z",
        {
          "2026-08-24": [
            "AAPL",
            "MSFT",
            "NVDA"
          ]
        }
      );

    assert.equal(
      result.allowed,
      true
    );

    assert.equal(
      result.reason,
      undefined
    );
  }
);


test(
  "symbol absent from historical universe is rejected",
  () => {
    const result =
      validateUniverseMembership(
        "TSLA",
        "2026-08-24T15:30:00Z",
        {
          "2026-08-24": [
            "AAPL",
            "MSFT",
            "NVDA"
          ]
        }
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.reason,
      "SYMBOL_NOT_IN_UNIVERSE"
    );
  }
);


test(
  "missing historical universe snapshot is rejected",
  () => {
    const result =
      validateUniverseMembership(
        "AAPL",
        "2026-08-24T15:30:00Z",
        {}
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.reason,
      "UNIVERSE_SNAPSHOT_MISSING"
    );
  }
);


test(
  "null universe history is rejected",
  () => {
    const result =
      validateUniverseMembership(
        "AAPL",
        "2026-08-24T15:30:00Z",
        null
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.reason,
      "UNIVERSE_SNAPSHOT_MISSING"
    );
  }
);


test(
  "non-array universe snapshot is rejected",
  () => {
    const result =
      validateUniverseMembership(
        "AAPL",
        "2026-08-24T15:30:00Z",
        {
          "2026-08-24": "AAPL"
        }
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.reason,
      "UNIVERSE_SNAPSHOT_MISSING"
    );
  }
);


test(
  "decision time uses only the calendar date",
  () => {
    const result =
      validateUniverseMembership(
        "AAPL",
        "2026-08-24T23:59:59.999Z",
        {
          "2026-08-24": [
            "AAPL"
          ]
        }
      );

    assert.equal(
      result.allowed,
      true
    );
  }
);


test(
  "different calendar date does not reuse previous snapshot",
  () => {
    const result =
      validateUniverseMembership(
        "AAPL",
        "2026-08-25T00:00:00Z",
        {
          "2026-08-24": [
            "AAPL"
          ]
        }
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.reason,
      "UNIVERSE_SNAPSHOT_MISSING"
    );
  }
);


test(
  "empty universe snapshot is valid but symbol is rejected",
  () => {
    const result =
      validateUniverseMembership(
        "AAPL",
        "2026-08-24T12:00:00Z",
        {
          "2026-08-24": []
        }
      );

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.reason,
      "SYMBOL_NOT_IN_UNIVERSE"
    );
  }
);