import test from "node:test";
import assert from "node:assert/strict";

import {
  validateBar,
  pointInTimeGuard
} from "../src/core.js";

const BAR = {
  symbol: "AAPL",
  timestamp: 1000,
  open: 100,
  high: 101,
  low: 99,
  close: 100,
  volume: 10
};

function assertConfigRejected(result) {
  assert.equal(result.status, "REJECT");
  assert.equal(result.valid, false);

  assert.ok(
    result.reasons.includes(
      "INVALID_VALIDATION_CONFIG"
    )
  );
}

test(
  "NaN maxClockSkewMs fails closed",
  () => {
    assertConfigRejected(
      validateBar(BAR, {
        nowMs: 1000,
        maxClockSkewMs: NaN
      })
    );
  }
);

test(
  "Infinity staleAfterMs fails closed",
  () => {
    assertConfigRejected(
      validateBar(BAR, {
        nowMs: 1000,
        staleAfterMs: Infinity
      })
    );
  }
);

test(
  "negative intervalMs fails closed",
  () => {
    assertConfigRejected(
      validateBar(BAR, {
        nowMs: 1000,
        intervalMs: -1
      })
    );
  }
);

test(
  "zero maxGapIntervals fails closed",
  () => {
    assertConfigRejected(
      validateBar(BAR, {
        nowMs: 1000,
        maxGapIntervals: 0
      })
    );
  }
);

test(
  "fractional maxGapIntervals fails closed",
  () => {
    assertConfigRejected(
      validateBar(BAR, {
        nowMs: 1000,
        maxGapIntervals: 1.5
      })
    );
  }
);

test(
  "NaN minimumLagMs fails closed",
  () => {
    const result = pointInTimeGuard(
      2000,
      1000,
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
  "negative minimumLagMs fails closed",
  () => {
    const result = pointInTimeGuard(
      1000,
      1000,
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
  "valid temporal configuration remains accepted",
  () => {
    const result = validateBar(
      BAR,
      {
        nowMs: 1000,
        maxClockSkewMs: 5000,
        staleAfterMs: 120000,
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
  }
);