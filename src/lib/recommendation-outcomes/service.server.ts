import { semanticHash } from "../recommendation-evaluation/evaluator";
import { evaluateOutcomeMeasure, outcomeDeadline } from "./model";
import * as repository from "./repository.server";
import {
  OUTCOME_EVALUATOR_VERSION,
  OUTCOME_POLICY_VERSION,
  type OutcomeDirection,
  type OutcomeMeasureRecord,
  type OutcomeMeasureVersion,
  type OutcomeObservation,
  type OutcomeValue,
  type RecommendationActionOutcome,
} from "./types";

export class RecommendationOutcomeServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface RecommendationOutcomeRepository {
  getOutcomeByAction(
    actionId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationActionOutcome | null>;
  createOutcome(input: Record<string, unknown>): Promise<RecommendationActionOutcome>;
  listMeasureVersions(
    outcomeId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<OutcomeMeasureVersion[]>;
  listMeasurementCandidates(limit?: number): Promise<OutcomeMeasureVersion[]>;
  getMeasureVersion(
    measureVersionId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<OutcomeMeasureVersion | null>;
  listAllObservations(
    measureVersionId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<OutcomeObservation[]>;
  listObservations(
    measureVersionId: string,
    tenant: { organisationId: string; workspaceId: string },
    options?: { limit?: number; beforeRecordedAt?: string },
  ): Promise<{ items: OutcomeObservation[]; nextCursor: string | null }>;
  listStatusEvents(
    measureVersionId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): ReturnType<typeof repository.listStatusEvents>;
  getObservationByIdempotency(
    idempotencyKey: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<OutcomeObservation | null>;
  createMeasureVersion(input: Record<string, unknown>): Promise<OutcomeMeasureVersion>;
  recordObservation(input: Record<string, unknown>): Promise<OutcomeObservation>;
  appendStatusEvent(
    input: Record<string, unknown>,
  ): ReturnType<typeof repository.appendStatusEvent>;
}

export interface ConfigureOutcomeMeasureInput {
  actionId: string;
  organisationId: string;
  workspaceId: string;
  actorUserId: string;
  measureId?: string;
  expectedVersion: number;
  direction: OutcomeDirection;
  unit: string;
  decimalScale: number;
  baselineValue: OutcomeValue | null;
  baselineEffectiveAt: string | null;
  targetValue: OutcomeValue | null;
  tolerance: string | null;
  targetDate: string | null;
  targetTimezone: string | null;
  sourceDescription: string;
  sourceReference: string | null;
  cadence: string;
  accountableOwnerId: string;
  retire?: boolean;
  traceId?: string;
}

export interface RecordOutcomeObservationInput {
  measureVersionId: string;
  organisationId: string;
  workspaceId: string;
  actorUserId: string;
  value: OutcomeValue;
  effectiveAt: string;
  sourceDescription: string;
  sourceReference: string | null;
  idempotencyKey: string;
  supersedesObservationId?: string | null;
  correctionReason?: string | null;
  traceId?: string;
}

function knownError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("OUTCOME_ACCESS_DENIED")) {
    return new RecommendationOutcomeServiceError(
      "OUTCOME_ACCESS_DENIED",
      404,
      "The outcome measure is not available.",
    );
  }
  if (message.includes("OUTCOME_VERSION_CONFLICT")) {
    return new RecommendationOutcomeServiceError(
      "OUTCOME_VERSION_CONFLICT",
      409,
      "This measure changed. Refresh and try again.",
    );
  }
  if (message.includes("OUTCOME_IDEMPOTENCY_CONFLICT")) {
    return new RecommendationOutcomeServiceError(
      "OUTCOME_IDEMPOTENCY_CONFLICT",
      409,
      "That request key has already been used for different outcome evidence.",
    );
  }
  if (message.includes("OUTCOME_SUPERSESSION_INVALID")) {
    return new RecommendationOutcomeServiceError(
      "OUTCOME_SUPERSESSION_INVALID",
      409,
      "The correction could not be applied to this observation.",
    );
  }
  if (message.includes("OUTCOME_CONFIGURATION_INVALID")) {
    return new RecommendationOutcomeServiceError(
      "OUTCOME_CONFIGURATION_INVALID",
      400,
      "The outcome measure configuration is invalid.",
    );
  }
  return null;
}

function envelope(idempotencyKey: string) {
  if (idempotencyKey.length < 16 || idempotencyKey.length > 160) {
    throw new RecommendationOutcomeServiceError(
      "OUTCOME_OBSERVATION_INVALID",
      400,
      "A valid idempotency key is required.",
    );
  }
}

function facts(measure: OutcomeMeasureVersion, observationCount: number) {
  return {
    measureId: measure.measureId,
    measureVersion: measure.version,
    direction: measure.direction,
    decimalScale: measure.decimalScale,
    targetDeadlineAt: measure.targetDeadlineAt,
    observationCount,
  };
}

export class RecommendationOutcomeService {
  constructor(
    private readonly repo: RecommendationOutcomeRepository = repository,
    private readonly clock: () => string = () => new Date().toISOString(),
    private readonly uuid: () => string = () => crypto.randomUUID(),
  ) {}

  private tenant(input: { organisationId: string; workspaceId: string }) {
    return { organisationId: input.organisationId, workspaceId: input.workspaceId };
  }

  async ensureOutcome(input: {
    actionId: string;
    organisationId: string;
    workspaceId: string;
    actorUserId: string;
  }) {
    const tenant = this.tenant(input);
    const existing = await this.repo.getOutcomeByAction(input.actionId, tenant);
    if (existing) return existing;
    try {
      return await this.repo.createOutcome({
        action_id: input.actionId,
        organisation_id: input.organisationId,
        workspace_id: input.workspaceId,
        actor_user_id: input.actorUserId,
      });
    } catch (error) {
      throw knownError(error) ?? error;
    }
  }

  private async recordFor(
    measure: OutcomeMeasureVersion,
    tenant: { organisationId: string; workspaceId: string },
  ) {
    const [observations, history] = await Promise.all([
      this.repo.listAllObservations(measure.id, tenant),
      this.repo.listStatusEvents(measure.id, tenant),
    ]);
    const current = evaluateOutcomeMeasure(measure, observations, this.clock());
    const latest = history.at(-1);
    if (
      !latest ||
      latest.status !== current.status ||
      latest.reasonCode !== current.reasonCode ||
      latest.decisiveObservationId !== current.decisiveObservationId ||
      latest.satisfactionTiming !== current.satisfactionTiming ||
      latest.deadlineWasMissed !== current.deadlineWasMissed ||
      latest.recordedLate !== current.recordedLate
    ) {
      const appended = await this.repo.appendStatusEvent({
        measure_version_id: measure.id,
        organisation_id: measure.organisationId,
        workspace_id: measure.workspaceId,
        projection: current,
        facts: facts(measure, observations.length),
        trace_id: `outcome-status:${this.uuid()}`,
      });
      history.push(appended);
    }
    return { measure, observations, current, history } satisfies OutcomeMeasureRecord;
  }

  async reconcile(limit = 500) {
    const candidates = await this.repo.listMeasurementCandidates(Math.min(Math.max(limit, 1), 500));
    let reconciled = 0;
    for (const measure of candidates) {
      await this.recordFor(measure, {
        organisationId: measure.organisationId,
        workspaceId: measure.workspaceId,
      });
      reconciled += 1;
    }
    return { scanned: candidates.length, reconciled };
  }

  async observations(
    measureVersionId: string,
    tenant: { organisationId: string; workspaceId: string },
    options: { limit?: number; beforeRecordedAt?: string } = {},
  ) {
    const measure = await this.repo.getMeasureVersion(measureVersionId, tenant);
    if (!measure) {
      throw new RecommendationOutcomeServiceError(
        "OUTCOME_ACCESS_DENIED",
        404,
        "The outcome measure is not available.",
      );
    }
    return this.repo.listObservations(measureVersionId, tenant, options);
  }

  async getActionOutcome(
    actionId: string,
    tenant: { organisationId: string; workspaceId: string },
  ) {
    const outcome = await this.repo.getOutcomeByAction(actionId, tenant);
    if (!outcome) return null;
    const versions = await this.repo.listMeasureVersions(outcome.id, tenant);
    const current = new Map<string, OutcomeMeasureVersion>();
    for (const version of versions)
      if (!current.has(version.measureId)) current.set(version.measureId, version);
    const records = await Promise.all(
      [...current.values()].map((version) => this.recordFor(version, tenant)),
    );
    return { outcome, records, versions };
  }

  async configure(input: ConfigureOutcomeMeasureInput) {
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
      throw new RecommendationOutcomeServiceError(
        "OUTCOME_VERSION_CONFLICT",
        409,
        "This measure changed. Refresh and try again.",
      );
    }
    const tenant = this.tenant(input);
    const outcome = await this.ensureOutcome(input);
    if (input.measureId) {
      const current = (await this.repo.listMeasureVersions(outcome.id, tenant)).find(
        (version) => version.measureId === input.measureId,
      );
      if (!current || current.version !== input.expectedVersion || current.retiredAt) {
        throw new RecommendationOutcomeServiceError(
          current ? "OUTCOME_VERSION_CONFLICT" : "OUTCOME_ACCESS_DENIED",
          current ? 409 : 404,
          current
            ? "This measure changed or is retired. Refresh and try again."
            : "The outcome measure is not available.",
        );
      }
    }
    const targetDeadlineAt =
      input.targetDate && input.targetTimezone
        ? outcomeDeadline(input.targetDate, input.targetTimezone)
        : null;
    const now = this.clock();
    const traceId = input.traceId?.trim() || `outcome:${this.uuid()}`;
    const draft: OutcomeMeasureVersion = {
      id: this.uuid(),
      outcomeId: outcome.id,
      measureId: input.measureId ?? this.uuid(),
      version: input.expectedVersion + 1,
      organisationId: input.organisationId,
      workspaceId: input.workspaceId,
      actionId: input.actionId,
      sourceRecommendationId: outcome.recommendationId,
      sourceRecommendationVersion: outcome.recommendationVersion,
      sourceCatalogueVersionId: outcome.catalogueVersionId,
      sourceCatalogueVersion: outcome.catalogueVersion,
      sourceCatalogueDigest: outcome.catalogueDigest,
      direction: input.direction,
      unit: input.unit.trim(),
      decimalScale: input.decimalScale,
      baselineValue: input.baselineValue,
      baselineEffectiveAt: input.baselineEffectiveAt,
      targetValue: input.targetValue,
      tolerance: input.tolerance,
      targetDate: input.targetDate,
      targetTimezone: input.targetTimezone,
      targetDeadlineAt,
      sourceDescription: input.sourceDescription.trim(),
      sourceReference: input.sourceReference?.trim() || null,
      cadence: input.cadence.trim(),
      accountableOwnerId: input.accountableOwnerId,
      retiredAt: input.retire ? now : null,
      supersedesMeasureVersionId: null,
      policyVersion: OUTCOME_POLICY_VERSION,
      evaluatorVersion: OUTCOME_EVALUATOR_VERSION,
      createdByUserId: input.actorUserId,
      createdAt: now,
    };
    const current = evaluateOutcomeMeasure(draft, [], now);
    try {
      const persisted = await this.repo.createMeasureVersion({
        outcome_id: outcome.id,
        measure_id: input.measureId ?? "",
        expected_version: input.expectedVersion,
        organisation_id: input.organisationId,
        workspace_id: input.workspaceId,
        actor_user_id: input.actorUserId,
        direction: draft.direction,
        unit: draft.unit,
        decimal_scale: draft.decimalScale,
        baseline_kind: draft.baselineValue?.kind ?? "",
        baseline_value: draft.baselineValue?.value ?? "",
        baseline_effective_at: draft.baselineEffectiveAt ?? "",
        target_kind: draft.targetValue?.kind ?? "",
        target_value: draft.targetValue?.value ?? "",
        absolute_tolerance: draft.tolerance ?? "",
        target_date: draft.targetDate ?? "",
        target_timezone: draft.targetTimezone ?? "",
        target_deadline_at: draft.targetDeadlineAt ?? "",
        source_description: draft.sourceDescription,
        source_reference: draft.sourceReference ?? "",
        cadence: draft.cadence,
        accountable_owner_id: draft.accountableOwnerId,
        retired_at: draft.retiredAt ?? "",
        projection: current,
        facts: facts(draft, 0),
        trace_id: traceId,
      });
      return this.recordFor(persisted, tenant);
    } catch (error) {
      throw knownError(error) ?? error;
    }
  }

  async retire(input: {
    measureVersionId: string;
    expectedVersion: number;
    organisationId: string;
    workspaceId: string;
    actorUserId: string;
    traceId?: string;
  }) {
    const tenant = this.tenant(input);
    const current = await this.repo.getMeasureVersion(input.measureVersionId, tenant);
    if (!current || current.version !== input.expectedVersion) {
      throw new RecommendationOutcomeServiceError(
        current ? "OUTCOME_VERSION_CONFLICT" : "OUTCOME_ACCESS_DENIED",
        current ? 409 : 404,
        current
          ? "This measure changed. Refresh and try again."
          : "The outcome measure is not available.",
      );
    }
    return this.configure({
      actionId: current.actionId,
      organisationId: input.organisationId,
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      measureId: current.measureId,
      expectedVersion: current.version,
      direction: current.direction,
      unit: current.unit,
      decimalScale: current.decimalScale,
      baselineValue: current.baselineValue,
      baselineEffectiveAt: current.baselineEffectiveAt,
      targetValue: current.targetValue,
      tolerance: current.tolerance,
      targetDate: current.targetDate,
      targetTimezone: current.targetTimezone,
      sourceDescription: current.sourceDescription,
      sourceReference: current.sourceReference,
      cadence: current.cadence,
      accountableOwnerId: current.accountableOwnerId,
      retire: true,
      traceId: input.traceId,
    });
  }

  async observe(input: RecordOutcomeObservationInput) {
    envelope(input.idempotencyKey);
    const tenant = this.tenant(input);
    const requestHash = await semanticHash({
      measureVersionId: input.measureVersionId,
      organisationId: input.organisationId,
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      value: input.value,
      effectiveAt: input.effectiveAt,
      sourceDescription: input.sourceDescription,
      sourceReference: input.sourceReference,
      supersedesObservationId: input.supersedesObservationId ?? null,
      correctionReason: input.correctionReason ?? null,
    });
    const replay = await this.repo.getObservationByIdempotency(input.idempotencyKey, tenant);
    if (replay) {
      if (
        replay.measureVersionId !== input.measureVersionId ||
        replay.payloadHash !== requestHash
      ) {
        throw new RecommendationOutcomeServiceError(
          "OUTCOME_IDEMPOTENCY_CONFLICT",
          409,
          "That request key has already been used for different outcome evidence.",
        );
      }
      const measure = await this.repo.getMeasureVersion(input.measureVersionId, tenant);
      if (!measure) throw knownError(new Error("OUTCOME_ACCESS_DENIED"));
      return this.recordFor(measure, tenant);
    }
    const measure = await this.repo.getMeasureVersion(input.measureVersionId, tenant);
    if (!measure) throw knownError(new Error("OUTCOME_ACCESS_DENIED"));
    if (measure.retiredAt) {
      throw new RecommendationOutcomeServiceError(
        "OUTCOME_VERSION_CONFLICT",
        409,
        "Observations cannot be added to a retired measure.",
      );
    }
    const versions = await this.repo.listMeasureVersions(measure.outcomeId, tenant);
    if (versions.find((version) => version.measureId === measure.measureId)?.id !== measure.id) {
      throw new RecommendationOutcomeServiceError(
        "OUTCOME_VERSION_CONFLICT",
        409,
        "Observations can only be recorded against the current measure version.",
      );
    }
    const observationId = this.uuid();
    const recordedAt = this.clock();
    const traceId = input.traceId?.trim() || `outcome:${this.uuid()}`;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const observations = await this.repo.listAllObservations(measure.id, tenant);
      const next: OutcomeObservation = {
        id: observationId,
        measureVersionId: measure.id,
        organisationId: input.organisationId,
        workspaceId: input.workspaceId,
        value: input.value,
        effectiveAt: input.effectiveAt,
        recordedAt,
        sourceDescription: input.sourceDescription.trim(),
        sourceReference: input.sourceReference?.trim() || null,
        actorUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
        payloadHash: requestHash,
        supersedesObservationId: input.supersedesObservationId ?? null,
        correctionReason: input.correctionReason?.trim() || null,
        traceId,
      };
      const current = evaluateOutcomeMeasure(measure, [...observations, next], recordedAt);
      try {
        await this.repo.recordObservation({
          observation_id: observationId,
          measure_version_id: measure.id,
          organisation_id: input.organisationId,
          workspace_id: input.workspaceId,
          actor_user_id: input.actorUserId,
          value_kind: input.value.kind,
          value: input.value.value,
          effective_at: input.effectiveAt,
          source_description: next.sourceDescription,
          source_reference: next.sourceReference ?? "",
          idempotency_key: input.idempotencyKey,
          payload_hash: requestHash,
          supersedes_observation_id: next.supersedesObservationId ?? "",
          correction_reason: next.correctionReason ?? "",
          trace_id: traceId,
          expected_observation_count: observations.length,
          projection: current,
          facts: facts(measure, observations.length + 1),
        });
        return this.recordFor(measure, tenant);
      } catch (error) {
        if (error instanceof Error && error.message.includes("OUTCOME_PROJECTION_STALE")) continue;
        throw knownError(error) ?? error;
      }
    }
    throw new RecommendationOutcomeServiceError(
      "OUTCOME_VERSION_CONFLICT",
      409,
      "Outcome evidence changed concurrently. Refresh and try again.",
    );
  }
}

export const recommendationOutcomeService = new RecommendationOutcomeService();
