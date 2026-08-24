/*
========================================================
NEXAHUNTER CORE ENGINE
Version: 1.3.0
Mode: Validation / Paper Trading Support

IMPORTANT:
This module contains validation and risk logic only.
It does NOT enable live trading.
========================================================
*/

export const CORE_VERSION = "1.3.0";

export const DEFAULT_MAX_CLOCK_SKEW_MS = 5000;
export const DEFAULT_STALE_AFTER_MS = 120000;
export const DEFAULT_INTERVAL_MS = 60000;

const SYMBOL_REGEX = /^[A-Z][A-Z0-9./-]{0,9}$/;

function finitePositive(value) {
  return Number.isFinite(value) && value > 0;
}

function finiteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function finiteNumber(value) {
  return Number.isFinite(value);
}

/*
========================================================
CONFIGURATION VALIDATION
========================================================
*/

export function validateCoreConfig(config = {}) {
  const errors = [];

  const maxClockSkewMs =
    Number(
      config.maxClockSkewMs ??
        DEFAULT_MAX_CLOCK_SKEW_MS
    );

  const staleAfterMs =
    Number(
      config.staleAfterMs ??
        DEFAULT_STALE_AFTER_MS
    );

  const intervalMs =
    Number(
      config.intervalMs ??
        DEFAULT_INTERVAL_MS
    );

  const maxGapIntervals =
    Number(
      config.maxGapIntervals ?? 1
    );

  if (
    !finiteNonNegative(maxClockSkewMs)
  ) {
    errors.push(
      "INVALID_MAX_CLOCK_SKEW_MS"
    );
  }

  if (
    !finiteNonNegative(staleAfterMs)
  ) {
    errors.push(
      "INVALID_STALE_AFTER_MS"
    );
  }

  if (
    !finitePositive(intervalMs)
  ) {
    errors.push(
      "INVALID_INTERVAL_MS"
    );
  }

  if (
    !Number.isInteger(maxGapIntervals) ||
    maxGapIntervals <= 0
  ) {
    errors.push(
      "INVALID_MAX_GAP_INTERVALS"
    );
  }

  return {
    valid: errors.length === 0,
    errors,

    values: {
      maxClockSkewMs,
      staleAfterMs,
      intervalMs,
      maxGapIntervals
    }
  };
}

/*
========================================================
MARKET DATA VALIDATION
========================================================
*/

export function validateBar(
  bar,
  options = {}
) {
  const nowMs =
    options.nowMs ??
    Date.now();

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
    options.maxGapIntervals ??
    1;

  const previousTimestamp =
    options.previousTimestamp;

  const expectedSymbol =
    options.symbol;

  const config =
    validateCoreConfig({
      nowMs,
      maxClockSkewMs,
      staleAfterMs,
      intervalMs,
      maxGapIntervals
    });

  if (!config.valid) {
    return {
      status: "REJECT",
      valid: false,
      reasons: [
        "INVALID_VALIDATION_CONFIG"
      ],
      warnings: []
    };
  }

  if (
    !bar ||
    typeof bar !== "object" ||
    Array.isArray(bar)
  ) {
    return {
      status: "REJECT",
      valid: false,
      reasons: [
        "BAR_NOT_OBJECT"
      ],
      warnings: []
    };
  }

  const symbol =
    String(
      bar.symbol ?? ""
    )
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

  const reasons = [];
  const warnings = [];

  /*
  ------------------------------------------------------
  SYMBOL
  ------------------------------------------------------
  */

  if (
    !SYMBOL_REGEX.test(symbol)
  ) {
    reasons.push(
      "INVALID_SYMBOL"
    );
  }

  if (
    expectedSymbol &&
    symbol !==
      String(expectedSymbol)
        .trim()
        .toUpperCase()
  ) {
    reasons.push(
      "SYMBOL_MISMATCH"
    );
  }

  /*
  ------------------------------------------------------
  TIMESTAMP
  ------------------------------------------------------
  */

  if (
    !Number.isFinite(timestamp) ||
    timestamp <= 0
  ) {
    reasons.push(
      "INVALID_TIMESTAMP"
    );
  }

  /*
  ------------------------------------------------------
  PRICE
  ------------------------------------------------------
  */

  if (
    [open, high, low, close].some(
      value =>
        !finitePositive(value)
    )
  ) {
    reasons.push(
      "INVALID_PRICE"
    );
  }

  /*
  ------------------------------------------------------
  VOLUME
  ------------------------------------------------------
  */

  if (
    !Number.isFinite(volume) ||
    volume < 0
  ) {
    reasons.push(
      "INVALID_VOLUME"
    );
  }

  /*
  ------------------------------------------------------
  CLOCK / STALENESS
  ------------------------------------------------------
  */

  if (
    Number.isFinite(timestamp)
  ) {
    if (
      timestamp >
      nowMs +
        maxClockSkewMs
    ) {
      reasons.push(
        "FUTURE_TIMESTAMP"
      );
    }

    if (
      nowMs -
        timestamp >
      staleAfterMs
    ) {
      warnings.push(
        "STALE_FEED"
      );
    }
  }

  /*
  ------------------------------------------------------
  SEQUENCE
  ------------------------------------------------------
  */

  if (
    Number.isFinite(
      previousTimestamp
    ) &&
    Number.isFinite(
      timestamp
    )
  ) {
    if (
      timestamp ===
      previousTimestamp
    ) {
      reasons.push(
        "DUPLICATE_TIMESTAMP"
      );
    }

    if (
      timestamp <
      previousTimestamp
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
      warnings.push(
        "DATA_GAP"
      );
    }
  }

  /*
  ------------------------------------------------------
  OHLC CONSISTENCY
  ------------------------------------------------------
  */

  if (
    [
      open,
      high,
      low,
      close
    ].every(
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

  /*
  ------------------------------------------------------
  FINAL STATUS
  ------------------------------------------------------
  */

  if (
    reasons.length > 0
  ) {
    return {
      status: "REJECT",
      valid: false,
      reasons,
      warnings
    };
  }

  if (
    warnings.length > 0
  ) {
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

/*
========================================================
SERIES VALIDATION
========================================================
*/

export function validateSeries(
  bars,
  options = {}
) {
  if (
    !Array.isArray(bars)
  ) {
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

  bars.forEach(
    (bar, index) => {
      const result =
        validateBar(
          bar,
          {
            ...options,
            previousTimestamp
          }
        );

      if (
        result.status ===
        "ACCEPT"
      ) {
        accepted.push({
          index,
          bar
        });

        previousTimestamp =
          Number(
            bar.timestamp
          );
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
    }
  );

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

/*
========================================================
POINT-IN-TIME GUARD
========================================================
*/

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
      reason:
        "INVALID_TIMESTAMP"
    };
  }

  if (
    !finiteNonNegative(
      minimumLagMs
    )
  ) {
    return {
      allowed: false,
      reason:
        "INVALID_TIMESTAMP_CONFIG"
    };
  }

  if (
    feature >
    decision -
      minimumLagMs
  ) {
    return {
      allowed: false,
      reason:
        "FUTURE_FEATURE"
    };
  }

  return {
    allowed: true
  };
}

/*
========================================================
UNIVERSE MEMBERSHIP
========================================================
*/

export function validateUniverseMembership(
  symbol,
  decisionDate,
  universeHistory
) {
  const normalizedSymbol =
    String(
      symbol ?? ""
    )
      .trim()
      .toUpperCase();

  const date =
    String(
      decisionDate
    ).slice(0, 10);

  const active =
    universeHistory?.[date];

  if (
    !Array.isArray(active)
  ) {
    return {
      allowed: false,
      reason:
        "UNIVERSE_SNAPSHOT_MISSING"
    };
  }

  return active.includes(
    normalizedSymbol
  )
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
    Number(
      order?.quantity
    );

  const price =
    Number(
      order?.price
    );

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
  INTERNAL STATE
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

  /*
  ------------------------------------------------------
  CALCULATION SAFETY
  ------------------------------------------------------
  */

  if (
    !Number.isFinite(
      orderNotional
    ) ||
    !Number.isFinite(
      projectedPosition
    ) ||
    !Number.isFinite(
      projectedNotional
    )
  ) {
    reasons.push(
      "RISK_CALCULATION_OVERFLOW"
    );
  }

  /*
  ------------------------------------------------------
  LIMIT CONFIGURATION
  ------------------------------------------------------
  */

  const riskLimits = [
    [
      "maxOrderNotional",
      limits.maxOrderNotional
    ],
    [
      "maxPositionNotional",
      limits.maxPositionNotional
    ],
    [
      "maxAbsolutePosition",
      limits.maxAbsolutePosition
    ],
    [
      "maxDailyLoss",
      limits.maxDailyLoss
    ]
  ];

  for (
    const [name, value]
    of riskLimits
  ) {
    if (
      value !== undefined &&
      (
        !Number.isFinite(value) ||
        value < 0
      )
    ) {
      reasons.push(
        `INVALID_RISK_LIMIT_${name.toUpperCase()}`
      );
    }
  }

  /*
  ------------------------------------------------------
  ORDER VALIDATION
  ------------------------------------------------------
  */

  if (
    !Number.isInteger(
      quantity
    ) ||
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
    ![
      "BUY",
      "SELL"
    ].includes(side)
  ) {
    reasons.push(
      "INVALID_SIDE"
    );
  }

  /*
  ------------------------------------------------------
  ORDER LIMIT
  ------------------------------------------------------
  */

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

  /*
  ------------------------------------------------------
  POSITION LIMIT
  ------------------------------------------------------
  */

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

  /*
  ------------------------------------------------------
  DAILY LOSS
  ------------------------------------------------------
  */

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
    Number(
      order?.price
    );

  const quantity =
    Number(
      order?.quantity
    );

  const spreadBps =
    Number(
      market.spreadBps ?? 0
    );

  const slippageBps =
    Number(
      market.slippageBps ?? 0
    );

  const latencyMs =
    Number(
      market.latencyMs ?? 0
    );

  const side =
    String(
      order?.side ?? ""
    ).toUpperCase();

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
    !finiteNonNegative(
      spreadBps
    ) ||
    !finiteNonNegative(
      slippageBps
    ) ||
    !finiteNonNegative(
      latencyMs
    )
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

  const grossNotional =
    price * quantity;

  const estimatedNotional =
    executionPrice *
    quantity;

  const estimatedCost =
    Math.abs(
      executionPrice -
        price
    ) * quantity;

  if (
    !Number.isFinite(
      executionPrice
    ) ||
    executionPrice <= 0 ||
    !Number.isFinite(
      grossNotional
    ) ||
    !Number.isFinite(
      estimatedNotional
    ) ||
    !Number.isFinite(
      estimatedCost
    )
  ) {
    return {
      valid: false,
      error:
        "EXECUTION_CALCULATION_OVERFLOW"
    };
  }

  return {
    valid: true,

    executionPrice,

    grossNotional,

    estimatedNotional,

    estimatedCost,

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
  if (
    !order ||
    typeof order !== "object"
  ) {
    return "";
  }

  return [
    order.symbol,
    order.quantity,
    order.price,
    String(
      order.side ?? ""
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

  const internalPosition =
    Number(
      internal.position ?? 0
    );

  const externalPosition =
    Number(
      external.position ?? 0
    );

  if (
    !Number.isFinite(
      internalPosition
    ) ||
    !Number.isFinite(
      externalPosition
    )
  ) {
    mismatches.push(
      "INVALID_POSITION_STATE"
    );
  } else if (
    internalPosition !==
    externalPosition
  ) {
    mismatches.push(
      "POSITION_MISMATCH"
    );
  }

  const internalOrders =
    Number(
      internal.openOrders ?? 0
    );

  const externalOrders =
    Number(
      external.openOrders ?? 0
    );

  if (
    !Number.isFinite(
      internalOrders
    ) ||
    !Number.isFinite(
      externalOrders
    )
  ) {
    mismatches.push(
      "INVALID_OPEN_ORDER_STATE"
    );
  } else if (
    internalOrders !==
    externalOrders
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
      .map(String)
      .sort()
      .join(",");

    const externalIds = [
      ...external.knownOrderIds
    ]
      .map(String)
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
    !Number.isInteger(trainSize) ||
    !Number.isInteger(testSize) ||
    !Number.isInteger(step) ||
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