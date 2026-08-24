import test from "node:test";
import assert from "node:assert/strict";

import {
  validateBar,
  validateSeries,
  pointInTimeGuard,
  validateUniverseMembership,
  evaluateRisk,
  estimateExecution
} from "../src/core.js";

test("validateBar rejects null", () => {
  const result = validateBar(null);

  assert.equal(result.status, "REJECT");
  assert.equal(result.valid, false);
  assert.ok(result.reasons.includes("BAR_NOT_OBJECT"));
});

test("validateBar rejects undefined", () => {
  const result = validateBar(undefined);

  assert.equal(result.status, "REJECT");
  assert.equal(result.valid, false);
  assert.ok(result.reasons.includes("BAR_NOT_OBJECT"));
});

test("validateBar rejects primitive string", () => {
  const result = validateBar("AAPL");

  assert.equal(result.status, "REJECT");
  assert.equal(result.valid, false);
  assert.ok(result.reasons.includes("BAR_NOT_OBJECT"));
});

test("validateBar rejects primitive number", () => {
  const result = validateBar(123);

  assert.equal(result.status, "REJECT");
  assert.equal(result.valid, false);
  assert.ok(result.reasons.includes("BAR_NOT_OBJECT"));
});

test("validateBar rejects array input", () => {
  const result = validateBar([]);

  assert.equal(result.status, "REJECT");
  assert.equal(result.valid, false);
  assert.ok(result.reasons.includes("INVALID_SYMBOL"));
});

test("validateSeries rejects null", () => {
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

test("validateSeries rejects object input", () => {
  const result = validateSeries({});

  assert.equal(result.status, "REJECT");
  assert.equal(result.valid, false);
  assert.ok(
    result.quarantined[0].reasons.includes(
      "SERIES_NOT_ARRAY"
    )
  );
});

test("validateSeries handles empty array safely", () => {
  const result = validateSeries([]);

  assert.equal(result.status, "ACCEPT");
  assert.equal(result.valid, true);
  assert.deepEqual(result.accepted, []);
  assert.deepEqual(result.rejected, []);
  assert.deepEqual(result.quarantined, []);
});

test("pointInTimeGuard rejects null feature timestamp", () => {
  const result = pointInTimeGuard(
    null,
    Date.now()
  );

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "INVALID_TIMESTAMP"
  );
});

test("pointInTimeGuard rejects invalid decision timestamp", () => {
  const result = pointInTimeGuard(
    Date.now(),
    "not-a-time"
  );

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "INVALID_TIMESTAMP"
  );
});

test("pointInTimeGuard rejects future feature", () => {
  const now = Date.now();

  const result = pointInTimeGuard(
    now + 1000,
    now
  );

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "FUTURE_FEATURE"
  );
});

test("pointInTimeGuard accepts historical feature", () => {
  const now = Date.now();

  const result = pointInTimeGuard(
    now - 1000,
    now
  );

  assert.equal(result.allowed, true);
});

test("validateUniverseMembership rejects missing snapshot", () => {
  const result = validateUniverseMembership(
    "AAPL",
    "2026-08-24",
    {}
  );

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "UNIVERSE_SNAPSHOT_MISSING"
  );
});

test("validateUniverseMembership rejects non-array snapshot", () => {
  const result = validateUniverseMembership(
    "AAPL",
    "2026-08-24",
    {
      "2026-08-24": {}
    }
  );

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "UNIVERSE_SNAPSHOT_MISSING"
  );
});

test("validateUniverseMembership rejects symbol absent from snapshot", () => {
  const result = validateUniverseMembership(
    "AAPL",
    "2026-08-24",
    {
      "2026-08-24": ["MSFT", "GOOG"]
    }
  );

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "SYMBOL_NOT_IN_UNIVERSE"
  );
});

test("validateUniverseMembership accepts symbol in snapshot", () => {
  const result = validateUniverseMembership(
    "AAPL",
    "2026-08-24",
    {
      "2026-08-24": ["AAPL", "MSFT"]
    }
  );

  assert.equal(result.allowed, true);
});

test("evaluateRisk rejects null order", () => {
  const result = evaluateRisk(
    null,
    {},
    {}
  );

  assert.equal(result.allowed, false);
  assert.ok(
    result.reasons.includes("INVALID_QUANTITY")
  );
  assert.ok(
    result.reasons.includes("INVALID_PRICE")
  );
  assert.ok(
    result.reasons.includes("INVALID_SIDE")
  );
});

test("evaluateRisk rejects malformed state", () => {
  const result = evaluateRisk(
    {
      quantity: 1,
      price: 100,
      side: "BUY"
    },
    {
      currentPosition: {},
      dailyLoss: []
    },
    {}
  );

  assert.equal(result.allowed, false);
  assert.ok(
    result.reasons.includes("INVALID_RISK_STATE")
  );
});

test("estimateExecution rejects null order", () => {
  const result = estimateExecution(
    null,
    {}
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_ORDER"
  );
});

test("estimateExecution rejects malformed market", () => {
  const result = estimateExecution(
    {
      quantity: 1,
      price: 100,
      side: "BUY"
    },
    {
      spreadBps: {}
    }
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.error,
    "INVALID_EXECUTION_MARKET"
  );
});

test("estimateExecution remains valid with omitted market", () => {
  const result = estimateExecution(
    {
      quantity: 1,
      price: 100,
      side: "BUY"
    },
    {}
  );

  assert.equal(result.valid, true);
  assert.ok(
    Number.isFinite(result.executionPrice)
  );
});