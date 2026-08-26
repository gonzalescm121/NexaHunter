/*
========================================================
NEXAHUNTER RESEARCH INTEGRITY
========================================================

Deterministic guards for historical research/backtesting.
These helpers do not place or authorize live orders.
========================================================
*/

export const RESEARCH_VERSION = "1.0.0";

function finite(value) {
  return Number.isFinite(Number(value));
}

export function walkForwardWindows(
  data,
  trainSize,
  testSize,
  step = testSize
) {
  if (!Array.isArray(data)) return [];

  const train = Number(trainSize);
  const test = Number(testSize);
  const stride = Number(step);

  if (
    !Number.isInteger(train) || train <= 0 ||
    !Number.isInteger(test) || test <= 0 ||
    !Number.isInteger(stride) || stride <= 0
  ) {
    return [];
  }

  const windows = [];

  for (
    let start = 0;
    start + train + test <= data.length;
    start += stride
  ) {
    const trainEnd = start + train;
    const testEnd = trainEnd + test;

    windows.push({
      trainStart: start,
      trainEnd,
      testStart: trainEnd,
      testEnd,
      train: data.slice(start, trainEnd),
      test: data.slice(trainEnd, testEnd)
    });
  }

  return windows;
}

export function parameterStability(
  scores,
  options = {}
) {
  if (!Array.isArray(scores) || scores.length === 0) {
    return {
      stable: false,
      reason: "NO_SCORES",
      spread: null,
      mean: null
    };
  }

  const values = scores
    .map(Number)
    .filter(Number.isFinite);

  if (values.length !== scores.length) {
    return {
      stable: false,
      reason: "NONFINITE_SCORE",
      spread: null,
      mean: null
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean =
    values.reduce((sum, value) => sum + value, 0) /
    values.length;
  const spread = max - min;
  const maxSpread =
    Number(options.maxSpread ?? 0.20);

  if (!finite(maxSpread) || maxSpread < 0) {
    return {
      stable: false,
      reason: "INVALID_MAX_SPREAD",
      spread,
      mean
    };
  }

  return {
    stable: spread <= maxSpread,
    reason:
      spread <= maxSpread
        ? "STABLE"
        : "PARAMETER_INSTABILITY",
    spread,
    mean,
    min,
    max
  };
}

export function regimeShiftGuard(
  baseline,
  current,
  options = {}
) {
  const baselineVol = Number(baseline?.volatility);
  const currentVol = Number(current?.volatility);
  const baselineReturn = Number(baseline?.return);
  const currentReturn = Number(current?.return);
  const maxVolRatio = Number(
    options.maxVolRatio ?? 2.0
  );
  const maxReturnDelta = Number(
    options.maxReturnDelta ?? 0.25
  );

  if (
    !finite(baselineVol) || baselineVol <= 0 ||
    !finite(currentVol) || currentVol < 0 ||
    !finite(baselineReturn) ||
    !finite(currentReturn) ||
    !finite(maxVolRatio) || maxVolRatio < 1 ||
    !finite(maxReturnDelta) || maxReturnDelta < 0
  ) {
    return {
      allowed: false,
      reason: "INVALID_REGIME_INPUT"
    };
  }

  const volRatio = currentVol / baselineVol;
  const returnDelta = Math.abs(
    currentReturn - baselineReturn
  );

  if (volRatio > maxVolRatio) {
    return {
      allowed: false,
      reason: "VOLATILITY_REGIME_SHIFT",
      volRatio,
      returnDelta
    };
  }

  if (returnDelta > maxReturnDelta) {
    return {
      allowed: false,
      reason: "RETURN_REGIME_SHIFT",
      volRatio,
      returnDelta
    };
  }

  return {
    allowed: true,
    reason: "REGIME_WITHIN_BOUNDS",
    volRatio,
    returnDelta
  };
}

export function executionCostStress(
  order,
  market,
  options = {}
) {
  const price = Number(order?.price);
  const quantity = Number(order?.quantity);
  const spreadBps = Number(market?.spreadBps ?? 0);
  const slippageBps = Number(market?.slippageBps ?? 0);
  const latencyMs = Number(market?.latencyMs ?? 0);
  const maxCostRatio = Number(
    options.maxCostRatio ?? 0.10
  );

  if (
    !finite(price) || price <= 0 ||
    !finite(quantity) || quantity <= 0 ||
    !finite(spreadBps) || spreadBps < 0 ||
    !finite(slippageBps) || slippageBps < 0 ||
    !finite(latencyMs) || latencyMs < 0 ||
    !finite(maxCostRatio) || maxCostRatio < 0
  ) {
    return {
      allowed: false,
      reason: "INVALID_EXECUTION_STRESS"
    };
  }

  const notional = price * quantity;
  const costRatio =
    (spreadBps + slippageBps) / 10000;
  const estimatedCost = notional * costRatio;

  return {
    allowed: costRatio <= maxCostRatio,
    reason:
      costRatio <= maxCostRatio
        ? "EXECUTION_COST_WITHIN_BOUNDS"
        : "EXECUTION_COST_TOO_HIGH",
    notional,
    costRatio,
    estimatedCost,
    latencyMs
  };
}
