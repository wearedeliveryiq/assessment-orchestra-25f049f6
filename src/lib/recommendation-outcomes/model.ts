import {
  OUTCOME_EVALUATOR_VERSION,
  OUTCOME_POLICY_VERSION,
  type OutcomeMeasureVersion,
  type OutcomeObservation,
  type OutcomeProjection,
  type OutcomeReasonCode,
  type OutcomeValue,
} from "./types";

export class OutcomeMeasurementError extends Error {
  constructor(
    readonly code:
      | "OUTCOME_CONFIGURATION_INVALID"
      | "OUTCOME_OBSERVATION_INVALID"
      | "OUTCOME_SUPERSESSION_INVALID",
    message: string,
  ) {
    super(message);
  }
}

const customerCopy: Record<OutcomeReasonCode, string> = {
  measure_configuration_incomplete:
    "This outcome cannot be measured until its measure is fully configured.",
  baseline_missing: "This outcome cannot be measured until a baseline is recorded.",
  baseline_only: "A baseline is recorded. No qualifying later observation is available yet.",
  target_satisfied: "The latest recorded observation meets the target.",
  target_satisfied_late: "The target was met after the target date.",
  target_pending: "The latest recorded observation does not yet meet the target.",
  target_not_met_by_date:
    "The latest recorded observation did not meet the target by the target date.",
  no_observation_by_target_date: "No qualifying observation was recorded by the target date.",
  measure_retired: "This measure has been retired and is no longer tracking progress.",
};

function fail(code: OutcomeMeasurementError["code"], message: string): never {
  throw new OutcomeMeasurementError(code, message);
}

function decimal(value: string, scale: number): bigint {
  if (!Number.isInteger(scale) || scale < 0 || scale > 18) {
    return fail("OUTCOME_CONFIGURATION_INVALID", "Decimal scale must be between 0 and 18.");
  }
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    return fail(
      "OUTCOME_OBSERVATION_INVALID",
      "Numeric values must use canonical decimal notation.",
    );
  }
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = unsigned.split(".");
  if (fraction.length > scale && /[1-9]/.test(fraction.slice(scale))) {
    return fail(
      "OUTCOME_OBSERVATION_INVALID",
      `Numeric values may have at most ${scale} decimal places.`,
    );
  }
  const digits = `${whole}${fraction.slice(0, scale).padEnd(scale, "0")}`.replace(/^0+(?=\d)/, "");
  const result = BigInt(digits || "0");
  return negative ? -result : result;
}

export function canonicalDecimal(value: string, scale: number): string {
  const scaled = decimal(value, scale);
  const negative = scaled < 0n;
  const digits = (negative ? -scaled : scaled).toString().padStart(scale + 1, "0");
  if (scale === 0) return `${negative ? "-" : ""}${digits}`;
  return `${negative ? "-" : ""}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

function validateTime(value: string | null, label: string) {
  if (value !== null && !Number.isFinite(Date.parse(value))) {
    fail("OUTCOME_CONFIGURATION_INVALID", `${label} must be an ISO timestamp.`);
  }
}

function validateValue(value: OutcomeValue | null, scale: number, direction: string) {
  if (value === null) return;
  if (direction === "binary" && value.kind !== "binary") {
    fail("OUTCOME_CONFIGURATION_INVALID", "Binary measures require binary values.");
  }
  if (direction !== "binary" && value.kind !== "numeric") {
    fail("OUTCOME_CONFIGURATION_INVALID", "Numeric measures require numeric values.");
  }
  if (value.kind === "numeric") decimal(value.value, scale);
}

export function validateOutcomeMeasure(measure: OutcomeMeasureVersion) {
  validateValue(measure.baselineValue, measure.decimalScale, measure.direction);
  validateValue(measure.targetValue, measure.decimalScale, measure.direction);
  validateTime(measure.baselineEffectiveAt, "Baseline effective time");
  validateTime(measure.targetDeadlineAt, "Target deadline");
  if (measure.direction === "maintain") {
    if (measure.tolerance === null) {
      fail("OUTCOME_CONFIGURATION_INVALID", "Maintain measures require an absolute tolerance.");
    }
    if (decimal(measure.tolerance, measure.decimalScale) < 0n) {
      fail("OUTCOME_CONFIGURATION_INVALID", "Tolerance cannot be negative.");
    }
  } else if (measure.tolerance !== null) {
    fail("OUTCOME_CONFIGURATION_INVALID", "Tolerance is only valid for maintain measures.");
  }
  if ((measure.targetDate === null) !== (measure.targetTimezone === null)) {
    fail(
      "OUTCOME_CONFIGURATION_INVALID",
      "Target date and snapshotted timezone must be configured together.",
    );
  }
  if (measure.targetDate !== null && measure.targetDeadlineAt === null) {
    fail("OUTCOME_CONFIGURATION_INVALID", "Target date requires a stored deadline instant.");
  }
}

function terminalObservations(observations: OutcomeObservation[], measure: OutcomeMeasureVersion) {
  const ids = new Set<string>();
  const supersededBy = new Map<string, string>();
  for (const observation of observations) {
    if (
      observation.measureVersionId !== measure.id ||
      observation.organisationId !== measure.organisationId ||
      observation.workspaceId !== measure.workspaceId
    ) {
      fail("OUTCOME_SUPERSESSION_INVALID", "Observation scope does not match the measure.");
    }
    if (ids.has(observation.id)) {
      fail("OUTCOME_SUPERSESSION_INVALID", "Observation IDs must be unique.");
    }
    ids.add(observation.id);
  }
  for (const observation of observations) {
    if (!observation.supersedesObservationId) continue;
    if (!ids.has(observation.supersedesObservationId)) {
      fail("OUTCOME_SUPERSESSION_INVALID", "A correction must supersede an existing observation.");
    }
    if (!observation.correctionReason?.trim()) {
      fail("OUTCOME_SUPERSESSION_INVALID", "A correction reason is required.");
    }
    if (supersededBy.has(observation.supersedesObservationId)) {
      fail("OUTCOME_SUPERSESSION_INVALID", "Correction branches are not permitted.");
    }
    supersededBy.set(observation.supersedesObservationId, observation.id);
  }
  for (const start of ids) {
    const seen = new Set<string>();
    let cursor: string | undefined = start;
    while (cursor) {
      if (seen.has(cursor))
        fail("OUTCOME_SUPERSESSION_INVALID", "Correction cycles are not permitted.");
      seen.add(cursor);
      cursor = supersededBy.get(cursor);
    }
  }
  return observations.filter((observation) => !supersededBy.has(observation.id));
}

function decisiveObservation(measure: OutcomeMeasureVersion, observations: OutcomeObservation[]) {
  const terminal = terminalObservations(observations, measure).filter((observation) => {
    validateTime(observation.effectiveAt, "Observation effective time");
    validateTime(observation.recordedAt, "Observation recorded time");
    validateValue(observation.value, measure.decimalScale, measure.direction);
    return (
      measure.direction === "binary" ||
      measure.baselineEffectiveAt === null ||
      Date.parse(observation.effectiveAt) > Date.parse(measure.baselineEffectiveAt)
    );
  });
  terminal.sort((left, right) => {
    const effective = Date.parse(right.effectiveAt) - Date.parse(left.effectiveAt);
    if (effective) return effective;
    const recorded = Date.parse(right.recordedAt) - Date.parse(left.recordedAt);
    if (recorded) return recorded;
    return left.id.localeCompare(right.id);
  });
  return terminal[0] ?? null;
}

function satisfies(measure: OutcomeMeasureVersion, observation: OutcomeObservation) {
  if (!measure.targetValue) return false;
  if (measure.direction === "binary") {
    return (
      observation.value.kind === "binary" &&
      measure.targetValue.kind === "binary" &&
      observation.value.value === measure.targetValue.value
    );
  }
  if (observation.value.kind !== "numeric" || measure.targetValue.kind !== "numeric") return false;
  const observed = decimal(observation.value.value, measure.decimalScale);
  const target = decimal(measure.targetValue.value, measure.decimalScale);
  if (measure.direction === "increase") return observed >= target;
  if (measure.direction === "decrease") return observed <= target;
  const tolerance = decimal(measure.tolerance ?? "0", measure.decimalScale);
  return observed >= target - tolerance && observed <= target + tolerance;
}

function projection(
  status: OutcomeProjection["status"],
  reasonCode: OutcomeReasonCode,
  observation: OutcomeObservation | null,
  extras: Partial<
    Pick<OutcomeProjection, "satisfactionTiming" | "deadlineWasMissed" | "recordedLate">
  > = {},
): OutcomeProjection {
  return {
    status,
    reasonCode,
    policyVersion: OUTCOME_POLICY_VERSION,
    evaluatorVersion: OUTCOME_EVALUATOR_VERSION,
    decisiveObservationId: observation?.id ?? null,
    decisiveEffectiveAt: observation?.effectiveAt ?? null,
    decisiveRecordedAt: observation?.recordedAt ?? null,
    satisfactionTiming: extras.satisfactionTiming ?? "not_applicable",
    deadlineWasMissed: extras.deadlineWasMissed ?? false,
    recordedLate: extras.recordedLate ?? false,
    customerCopy: customerCopy[reasonCode],
  };
}

export function evaluateOutcomeMeasure(
  measure: OutcomeMeasureVersion,
  observations: OutcomeObservation[],
  now: string,
): OutcomeProjection {
  validateOutcomeMeasure(measure);
  validateTime(now, "Evaluation time");
  if (measure.retiredAt) return projection("retired", "measure_retired", null);

  const baselineMissing = measure.direction !== "binary" && !measure.baselineValue;
  if (baselineMissing) return projection("not_measured", "baseline_missing", null);
  if (!measure.targetValue || !measure.sourceDescription.trim() || !measure.cadence.trim()) {
    return projection("not_measured", "measure_configuration_incomplete", null);
  }

  const observation = decisiveObservation(measure, observations);
  const deadline = measure.targetDeadlineAt ? Date.parse(measure.targetDeadlineAt) : null;
  const deadlinePassed = deadline !== null && Date.parse(now) > deadline;
  if (!observation) {
    return deadlinePassed
      ? projection("target_not_met", "no_observation_by_target_date", null, {
          satisfactionTiming: "late",
          deadlineWasMissed: true,
        })
      : projection("baseline_recorded", "baseline_only", null);
  }

  const targetSatisfied = satisfies(measure, observation);
  const effectiveLate = deadline !== null && Date.parse(observation.effectiveAt) > deadline;
  const recordedLate =
    deadline !== null &&
    Date.parse(observation.recordedAt) > deadline &&
    Date.parse(observation.effectiveAt) <= deadline;
  if (targetSatisfied) {
    return projection(
      "target_met",
      effectiveLate ? "target_satisfied_late" : "target_satisfied",
      observation,
      {
        satisfactionTiming:
          deadline === null ? "not_applicable" : effectiveLate ? "late" : "on_time",
        deadlineWasMissed: effectiveLate,
        recordedLate,
      },
    );
  }
  const missed = deadlinePassed
    ? projection("target_not_met", "target_not_met_by_date", observation, {
        satisfactionTiming: "late",
        deadlineWasMissed: true,
      })
    : projection("tracking", "target_pending", observation, {
        satisfactionTiming: deadline === null ? "not_applicable" : "on_time",
      });
  return measure.direction === "maintain"
    ? { ...missed, customerCopy: "The latest observation is outside the agreed range." }
    : missed;
}

function localParts(epoch: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(epoch));
  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]),
  );
}

function localMidnightUtc(date: string, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) fail("OUTCOME_CONFIGURATION_INVALID", "Target date is invalid.");
  let candidate = Date.UTC(year, month - 1, day, 0, 0, 0);
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const actual = localParts(candidate, timezone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const wantedAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
    candidate += wantedAsUtc - actualAsUtc;
  }
  return candidate;
}

export function outcomeDeadline(targetDate: string, timezone: string) {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone }).format(new Date(0));
  } catch {
    return fail("OUTCOME_CONFIGURATION_INVALID", "Target timezone must be a valid IANA timezone.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return fail("OUTCOME_CONFIGURATION_INVALID", "Target date must use ISO date notation.");
  }
  const [year, month, day] = targetDate.split("-").map(Number);
  const candidateDate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidateDate.getUTCFullYear() !== year ||
    candidateDate.getUTCMonth() !== month - 1 ||
    candidateDate.getUTCDate() !== day
  ) {
    return fail("OUTCOME_CONFIGURATION_INVALID", "Target date is invalid.");
  }
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDate = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  return new Date(localMidnightUtc(nextDate, timezone) - 1).toISOString();
}
