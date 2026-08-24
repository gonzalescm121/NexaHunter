export const DEFAULT_MAX_CLOCK_SKEW_MS = 5000;
export const DEFAULT_STALE_AFTER_MS = 120000;
export const DEFAULT_INTERVAL_MS = 60000;

const SYMBOL_REGEX = /^[A-Z][A-Z0-9./-]{0,9}$/;

function finitePositive(value) {
  return Number.isFinite(value) && value > 0;
}

export function validateBar(bar, options = {}) {
  const nowMs = options.nowMs ?? Date.now();

  const maxClockSkewMs =
    options.maxClockSkewMs ??
    DEFAULT_MAX_CLOCK_SKEW_MS;

  const staleAfterMs =
    options.staleAfterMs ??
    DEFAULT_STALE_AFTER_MS;

  const intervalMs =
    options.intervalMs ??
    DEFAULT_INTERVAL_MS;

  const maxGapIntervals =
    options.maxGapIntervals ?? 1;

  const previousTimestamp =
    options.previousTimestamp;

  const expectedSymbol =
    options.symbol;

  const reasons = [];
  const warnings = [];

  if (!bar || typeof bar !== "object") {
    return {
      status: "REJECT",
      valid: false,
      reasons: ["BAR_NOT_OBJECT"],
      warnings
    };
  }

  const symbol =
    String(bar.symbol ?? "")
      .trim()
      .toUpperCase();

  const timestamp =
    Number(bar.timestamp);

  const open =
    Number(bar.open);

  const high =
    Number(bar.high);

  const low =
    Number(bar.low);

  const close =
    Number(bar.close);

  const volume =
    Number(bar.volume);

  if (!SYMBOL_REGEX.test(symbol)) {
    reasons.push("INVALID_SYMBOL");
  }

  if (
    expectedSymbol &&
    symbol !==
      String(expectedSymbol)
        .trim()
        .toUpperCase()
  ) {
    reasons.push("SYMBOL_MISMATCH");
  }

  if (
    !Number.isFinite(timestamp) ||
    timestamp <= 0
  ) {
    reasons.push("INVALID_TIMESTAMP");
  }

  if (
    [open, high, low, close].some(
      value => !finitePositive(value)
    )
  ) {
    reasons.push("INVALID_PRICE");
  }

  if (
    !Number.isFinite(volume) ||
    volume < 0
  ) {
    reasons.push("INVALID_VOLUME");
  }

  if (Number.isFinite(timestamp)) {
    if (
      timestamp >
      nowMs + maxClockSkewMs
    ) {
      reasons.push("FUTURE_TIMESTAMP");
    }

    if (
      nowMs - timestamp >
      staleAfterMs
    ) {
      warnings.push("STALE_FEED");
    }
  }

  if (
    Number.isFinite(previousTimestamp) &&
    Number.isFinite(timestamp)
  ) {
    if (
      timestamp === previousTimestamp
    ) {
      reasons.push(
        "DUPLICATE_TIMESTAMP"
      );
    }

    if (
      timestamp < previousTimestamp
    ) {
      reasons.push(
        "OUT_OF_ORDER_TIMESTAMP"
      );
    }

    if (
      timestamp >
      previousTimestamp +
        intervalMs *
          maxGapIntervals
    ) {
      warnings.push("DATA_GAP");
    }
  }

  if (
    [open, high, low, close].every(
      Number.isFinite
    )
  ) {
    if (
      high <
      Math.max(
        open,
        close,
        low
      )
    ) {
      reasons.push(
        "IMPOSSIBLE_HIGH"
      );
    }

    if (
      low >
      Math.min(
        open,
        close,
        high
      )
    ) {
      reasons.push(
        "IMPOSSIBLE_LOW"
      );
    }
  }

  if (reasons.length > 0) {
    return {
      status: "REJECT",
      valid: false,
      reasons,
      warnings
    };
  }

  if (warnings.length > 0) {
    return {
      status: "QUARANTINE",
      valid: false,
      reasons,
      warnings
    };
  }

  return {
    status: "ACCEPT",
    valid: true,
    reasons,
    warnings
  };
}

export function validateSeries(
  bars,
  options = {}
) {
  if (!Array.isArray(bars)) {
    return {
      status: "REJECT",
      valid: false,
      accepted: [],
      rejected: [],
      quarantined: [
        {
          index: -1,
          reasons: [
            "SERIES_NOT_ARRAY"
          ]
        }
      ]
    };
  }

  const accepted = [];
  const rejected = [];
  const quarantined = [];

  let previousTimestamp;

  bars.forEach((bar, index) => {
    const result =
      validateBar(bar, {
        ...options,
        previousTimestamp
      });

    if (
      result.status ===
      "ACCEPT"
    ) {
      accepted.push({
        index,
        bar
      });

      previousTimestamp =
        Number(bar.timestamp);

    } else if (
      result.status ===
      "QUARANTINE"
    ) {
      quarantined.push({
        index,
        ...result
      });

    } else {
      rejected.push({
        index,
        ...result
      });
    }
  });

  const valid =
    rejected.length === 0 &&
    quarantined.length === 0;

  return {
    status: valid
      ? "ACCEPT"
      : "DEGRADED",

    valid,

    accepted,
    rejected,
    quarantined
  };
}

export function pointInTimeGuard(
  featureTimestamp,
  decisionTimestamp,
  options = {}
) {
  const feature =
    Number(featureTimestamp);

  const decision =
    Number(decisionTimestamp);

  const minimumLagMs =
    options.minimumLagMs ?? 0;

  if (
    !Number.isFinite(feature) ||
    !Number.isFinite(decision)
  ) {
    return {
      allowed: false,
      reason: "INVALID_TIMESTAMP"
    };
  }

  if (
    feature >
    decision - minimumLagMs
  ) {
    return {
      allowed: false,
      reason: "FUTURE_FEATURE"
    };
  }

  return {
    allowed: true
  };
}

export function validateUniverseMembership(
  symbol,
  decisionDate,
  universeHistory
) {
  const date =
    String(decisionDate)
      .slice(0, 10);

  const active =
    universeHistory?.[date];

  if (!Array.isArray(active)) {
    return {
      allowed: false,
      reason:
        "UNIVERSE_SNAPSHOT_MISSING"
    };
  }

  return active.includes(symbol)
    ? {
        allowed: true
      }
    : {
        allowed: false,
        reason:
          "SYMBOL_NOT_IN_UNIVERSE"
      };
}

/*
========================================================
RISK ENGINE
========================================================
*/

export function evaluateRisk(
  order,
  state = {},
  limits = {}
) {
  const quantity =
    Number(order?.quantity);

  const price =
    Number(order?.price);

  const currentPosition =
    Number(
      state.currentPosition ?? 0
    );

  const dailyLoss =
    Number(
      state.dailyLoss ?? 0
    );

  const side =
    String(
      order?.side ?? ""
    ).toUpperCase();

  const signedQuantity =
    side === "SELL"
      ? -quantity
      : quantity;

  const projectedPosition =
    currentPosition +
    signedQuantity;

  const orderNotional =
    quantity * price;

  const projectedNotional =
    Math.abs(
      projectedPosition *
        price
    );

  const reasons = [];

  /*
  ------------------------------------------------------
  HARDENING:
  Corrupted internal state must fail closed.

  Without this check:

    NaN
    Infinity
    -Infinity

  could flow through calculations and make
  risk-limit comparisons unreliable.
  ------------------------------------------------------
  */

  if (
    !Number.isFinite(
      currentPosition
    ) ||
    !Number.isFinite(
      dailyLoss
    )
  ) {
    reasons.push(
      "INVALID_RISK_STATE"
    );
  }

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    reasons.push(
      "INVALID_QUANTITY"
    );
  }

  if (
    !finitePositive(price)
  ) {
    reasons.push(
      "INVALID_PRICE"
    );
  }

  if (
    !["BUY", "SELL"].includes(
      side
    )
  ) {
    reasons.push(
      "INVALID_SIDE"
    );
  }

  if (
    Number.isFinite(
      limits.maxOrderNotional
    ) &&
    orderNotional >
      limits.maxOrderNotional
  ) {
    reasons.push(
      "ORDER_NOTIONAL_LIMIT"
    );
  }

  if (
    Number.isFinite(
      limits.maxPositionNotional
    ) &&
    projectedNotional >
      limits.maxPositionNotional
  ) {
    reasons.push(
      "POSITION_NOTIONAL_LIMIT"
    );
  }

  if (
    Number.isFinite(
      limits.maxAbsolutePosition
    ) &&
    Math.abs(
      projectedPosition
    ) >
      limits.maxAbsolutePosition
  ) {
    reasons.push(
      "POSITION_LIMIT"
    );
  }

  if (
    Number.isFinite(
      limits.maxDailyLoss
    ) &&
    dailyLoss <=
      -Math.abs(
        limits.maxDailyLoss
      )
  ) {
    reasons.push(
      "DAILY_LOSS_LIMIT"
    );
  }

  return {
    allowed:
      reasons.length === 0,

    reasons,

    orderNotional,

    projectedPosition,

    projectedNotional
  };
}

/*
========================================================
EXECUTION ESTIMATOR
========================================================
*/

export function estimateExecution(
  order,
  market = {}
) {
  const price =
    Number(order?.price);

  const quantity =
    Number(order?.quantity);

  const spreadBps =
    Math.max(
      0,
      Number(
        market.spreadBps ?? 0
      )
    );

  const slippageBps =
    Math.max(
      0,
      Number(
        market.slippageBps ?? 0
      )
    );

  const latencyMs =
    Math.max(
      0,
      Number(
        market.latencyMs ?? 0
      )
    );

  const side =
    String(
      order?.side ?? ""
    ).toUpperCase();

  /*
  ------------------------------------------------------
  HARDENING:
  Invalid execution inputs fail closed.
  ------------------------------------------------------
  */

  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    return {
      valid: false,
      error:
        "INVALID_EXECUTION_ORDER"
    };
  }

  if (
    !Number.isFinite(
      Number(
        market.spreadBps ?? 0
      )
    ) ||
    Number(
      market.spreadBps ?? 0
    ) < 0 ||
    !Number.isFinite(
      Number(
        market.slippageBps ?? 0
      )
    ) ||
    Number(
      market.slippageBps ?? 0
    ) < 0 ||
    !Number.isFinite(
      Number(
        market.latencyMs ?? 0
      )
    ) ||
    Number(
      market.latencyMs ?? 0
    ) < 0
  ) {
    return {
      valid: false,
      error:
        "INVALID_EXECUTION_MARKET"
    };
  }

  if (
    side !== "BUY" &&
    side !== "SELL"
  ) {
    return {
      valid: false,
      error:
        "INVALID_EXECUTION_SIDE"
    };
  }

  const impact =
    (
      spreadBps / 2 +
      slippageBps
    ) / 10000;

  const executionPrice =
    side === "SELL"
      ? price *
        (1 - impact)
      : price *
        (1 + impact);

  return {
    valid: true,

    executionPrice,

    grossNotional:
      price * quantity,

    estimatedNotional:
      executionPrice *
      quantity,

    estimatedCost:
      Math.abs(
        executionPrice -
          price
      ) * quantity,

    spreadBps,
    slippageBps,
    latencyMs
  };
}

/*
========================================================
IDEMPOTENCY
========================================================
*/

export function createIdempotencyKey(
  order
) {
  return [
    order.symbol,
    order.quantity,
    order.price,
    String(
      order.side
    ).toUpperCase(),
    order.timestamp ?? ""
  ].join("|");
}

/*
========================================================
STATE RECONCILIATION
========================================================
*/

export function reconcileState(
  internal = {},
  external = {}
) {
  const mismatches = [];

  if (
    Number(
      internal.position ?? 0
    ) !==
    Number(
      external.position ?? 0
    )
  ) {
    mismatches.push(
      "POSITION_MISMATCH"
    );
  }

  if (
    Number(
      internal.openOrders ?? 0
    ) !==
    Number(
      external.openOrders ?? 0
    )
  ) {
    mismatches.push(
      "OPEN_ORDER_MISMATCH"
    );
  }

  if (
    internal.knownOrderIds &&
    external.knownOrderIds
  ) {
    const internalIds = [
      ...internal.knownOrderIds
    ]
      .sort()
      .join(",");

    const externalIds = [
      ...external.knownOrderIds
    ]
      .sort()
      .join(",");

    if (
      internalIds !==
      externalIds
    ) {
      mismatches.push(
        "ORDER_ID_MISMATCH"
      );
    }
  }

  return {
    reconciled:
      mismatches.length === 0,

    tradingAllowed:
      mismatches.length === 0,

    mismatches
  };
}

/*
========================================================
RECOVERY
========================================================
*/

export function recoveryDecision(
  state
) {
  const value =
    String(
      state ?? ""
    ).toUpperCase();

  if (
    value === "RUNNING"
  ) {
    return {
      state: "RUNNING",
      tradingAllowed: true
    };
  }

  if (
    value === "RECOVERED"
  ) {
    return {
      state: "RECOVERED",
      tradingAllowed: true
    };
  }

  return {
    state:
      value || "UNKNOWN",

    tradingAllowed:
      false
  };
}

/*
========================================================
WALK-FORWARD WINDOWS
========================================================
*/

export function walkForwardWindows(
  data,
  trainSize,
  testSize,
  step = testSize
) {
  if (
    !Array.isArray(data) ||
    trainSize <= 0 ||
    testSize <= 0 ||
    step <= 0
  ) {
    return [];
  }

  const windows = [];

  for (
    let start = 0;

    start +
      trainSize +
      testSize <=
      data.length;

    start += step
  ) {
    windows.push({
      train:
        data.slice(
          start,
          start +
            trainSize
        ),

      test:
        data.slice(
          start +
            trainSize,

          start +
            trainSize +
            testSize
        )
    });
  }

  return windows;
}