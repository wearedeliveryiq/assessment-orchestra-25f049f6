import { notify } from "@/lib/tenancy/notifications.server";

import { semanticHash } from "../recommendation-evaluation/evaluator";
import {
  incompleteRequiredActionDependencies,
  RecommendationActionError,
  transitionRecommendationAction,
  type RecommendationActionCommand,
  type RecommendationActionFields,
} from "./model";
import * as repository from "./repository.server";
import type {
  RecommendationActionEventRecord,
  RecommendationActionRecord,
  RecommendationActionSource,
} from "./types";

export class RecommendationActionServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface RecommendationActionRepository {
  getActionSource(
    portfolioItemId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationActionSource | null>;
  getActionById(
    actionId: string,
    tenant: { organisationId: string; workspaceId: string },
    includeHistory?: boolean,
  ): Promise<RecommendationActionRecord | null>;
  getActionForItem(
    portfolioItemId: string,
    planVersion: number,
    tenant: { organisationId: string; workspaceId: string },
    includeHistory?: boolean,
  ): Promise<RecommendationActionRecord | null>;
  getActionsForPortfolio(
    portfolioId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationActionRecord[] | null>;
  getDependencyActionStates(
    portfolioId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<Map<string, RecommendationActionRecord["status"]>>;
  getActionEventByIdempotency(
    idempotencyKey: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationActionEventRecord | null>;
  recordAction(input: Record<string, unknown>): Promise<Record<string, unknown>>;
}

type ActionNotifier = typeof notify;

export interface CreateRecommendationActionInput {
  portfolioItemId: string;
  organisationId: string;
  workspaceId: string;
  actorUserId: string;
  planVersion: number;
  expectedVersion: 0;
  idempotencyKey: string;
}

export interface UpdateRecommendationActionInput {
  actionId: string;
  organisationId: string;
  workspaceId: string;
  actorUserId: string;
  command: Exclude<RecommendationActionCommand, "created">;
  expectedVersion: number;
  idempotencyKey: string;
  accountableOwnerId?: string | null;
  contributorIds?: string[];
  targetDate?: string | null;
  note?: string | null;
  completionNote?: string | null;
  evidenceReferences?: string[];
  evidenceNotAvailableReason?: string | null;
  dependencyOverride?: boolean;
  dependencyOverrideReason?: string | null;
  dependencyOverrideAcknowledged?: boolean;
  cancelAcknowledged?: boolean;
}

function knownDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("RECOMMENDATION_ACTION_VERSION_CONFLICT")) {
    return new RecommendationActionServiceError(
      "RECOMMENDATION_ACTION_VERSION_CONFLICT",
      409,
      "This action changed. Refresh and try again.",
    );
  }
  if (message.includes("ACTION_DEPENDENCY_BLOCKED")) {
    return new RecommendationActionServiceError(
      "ACTION_DEPENDENCY_BLOCKED",
      409,
      "A required action must be completed first, unless you explicitly accept the override risk.",
    );
  }
  if (message.includes("RECOMMENDATION_ACCESS_DENIED")) {
    return new RecommendationActionServiceError(
      "RECOMMENDATION_ACCESS_DENIED",
      404,
      "The improvement action is not available.",
    );
  }
  if (message.includes("RECOMMENDATION_ACTION_INVALID")) {
    return new RecommendationActionServiceError(
      "RECOMMENDATION_ACTION_INVALID",
      400,
      "The improvement action could not be changed.",
    );
  }
  return null;
}

function fields(record: RecommendationActionRecord): RecommendationActionFields {
  return {
    accountableOwnerId: record.accountableOwnerId,
    contributorIds: record.contributorIds,
    targetDate: record.targetDate,
    note: record.note,
    completionNote: record.completionNote,
    evidenceReferences: record.evidenceReferences,
    evidenceNotAvailableReason: record.evidenceNotAvailableReason,
    dependencyOverride: false,
    dependencyOverrideReason: null,
    dependencyOverrideAcknowledged: false,
  };
}

function validateCommandEnvelope(expectedVersion: number, idempotencyKey: string) {
  if (
    !Number.isInteger(expectedVersion) ||
    expectedVersion < 0 ||
    idempotencyKey.length < 16 ||
    idempotencyKey.length > 160
  ) {
    throw new RecommendationActionServiceError(
      "RECOMMENDATION_ACTION_INVALID",
      400,
      "A valid action version and idempotency key are required.",
    );
  }
}

export class RecommendationActionService {
  constructor(
    private readonly repo: RecommendationActionRepository = repository,
    private readonly notifier: ActionNotifier = notify,
  ) {}

  async get(
    actionId: string,
    tenant: { organisationId: string; workspaceId: string },
    includeHistory = false,
  ) {
    const record = await this.repo.getActionById(actionId, tenant, includeHistory);
    if (!record) {
      throw new RecommendationActionServiceError(
        "RECOMMENDATION_ACCESS_DENIED",
        404,
        "The improvement action is not available.",
      );
    }
    return record;
  }

  async list(portfolioId: string, tenant: { organisationId: string; workspaceId: string }) {
    const records = await this.repo.getActionsForPortfolio(portfolioId, tenant);
    if (!records) {
      throw new RecommendationActionServiceError(
        "RECOMMENDATION_ACCESS_DENIED",
        404,
        "The recommendation portfolio is not available.",
      );
    }
    return records;
  }

  async create(input: CreateRecommendationActionInput) {
    validateCommandEnvelope(input.expectedVersion, input.idempotencyKey);
    if (!Number.isInteger(input.planVersion) || input.planVersion < 1) {
      throw new RecommendationActionServiceError(
        "RECOMMENDATION_ACTION_INVALID",
        400,
        "A valid improvement-plan version is required.",
      );
    }
    const tenant = { organisationId: input.organisationId, workspaceId: input.workspaceId };
    const requestHash = await semanticHash({
      portfolioItemId: input.portfolioItemId,
      organisationId: input.organisationId,
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      planVersion: input.planVersion,
      expectedVersion: input.expectedVersion,
      command: "created",
    });
    const replay = await this.repo.getActionEventByIdempotency(input.idempotencyKey, tenant);
    if (replay) {
      if (replay.portfolioItemId !== input.portfolioItemId || replay.payloadHash !== requestHash) {
        throw new RecommendationActionServiceError(
          "RECOMMENDATION_ACTION_INVALID",
          409,
          "That request key has already been used for another action change.",
        );
      }
      const replayedAction = await this.repo.getActionById(replay.actionId, tenant, true);
      if (replayedAction) return replayedAction;
    }
    const source = await this.repo.getActionSource(input.portfolioItemId, tenant);
    if (!source) {
      throw new RecommendationActionServiceError(
        "RECOMMENDATION_ACCESS_DENIED",
        404,
        "Only accepted advice can become an improvement action.",
      );
    }
    const existingAction = await this.repo.getActionForItem(
      source.portfolioItemId,
      input.planVersion,
      tenant,
      true,
    );
    if (existingAction) return existingAction;
    if (source.decisionState !== "accepted" || !source.decisionId) {
      throw new RecommendationActionServiceError(
        "RECOMMENDATION_ACCESS_DENIED",
        404,
        "Only accepted advice can become an improvement action.",
      );
    }
    const actionFields: RecommendationActionFields = {
      accountableOwnerId: input.actorUserId,
      contributorIds: [],
      targetDate: null,
      note: null,
      completionNote: null,
      evidenceReferences: [],
      evidenceNotAvailableReason: null,
      dependencyOverride: false,
      dependencyOverrideReason: null,
      dependencyOverrideAcknowledged: false,
    };
    const transition = transitionRecommendationAction({
      currentState: null,
      command: "created",
      ...actionFields,
    });
    try {
      const persisted = await this.repo.recordAction({
        portfolio_item_id: source.portfolioItemId,
        organisation_id: source.organisationId,
        workspace_id: source.workspaceId,
        actor_user_id: input.actorUserId,
        plan_version: input.planVersion,
        command: "created",
        expected_version: 0,
        idempotency_key: input.idempotencyKey,
        payload_hash: requestHash,
        accountable_owner_id: transition.accountableOwnerId,
        contributor_ids: transition.contributorIds,
        target_date: null,
        note: null,
        completion_note: null,
        evidence_references: [],
        evidence_not_available_reason: null,
        dependency_override: false,
        dependency_override_reason: null,
        dependency_override_acknowledged: false,
        cancel_acknowledged: false,
      });
      const result = await this.repo.getActionById(String(persisted.id), tenant, true);
      if (!result) throw new Error("RECOMMENDATION_ACTION_INVALID: action was not readable");
      const recorded = await this.repo.getActionEventByIdempotency(input.idempotencyKey, tenant);
      if (recorded?.actionId === result.id) {
        this.notifier({
          recipients: [input.actorUserId],
          module: "improvement-plan",
          eventType: "recommendation.action_created",
          title: "You are accountable for an improvement action",
          body: source.title,
          organisationId: source.organisationId,
          workspaceId: source.workspaceId,
          metadata: { actionId: result.id, portfolioItemId: source.portfolioItemId },
        });
      }
      return result;
    } catch (error) {
      throw knownDatabaseError(error) ?? error;
    }
  }

  async update(input: UpdateRecommendationActionInput) {
    validateCommandEnvelope(input.expectedVersion, input.idempotencyKey);
    const tenant = { organisationId: input.organisationId, workspaceId: input.workspaceId };
    const requestHash = await semanticHash({
      actionId: input.actionId,
      organisationId: input.organisationId,
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      command: input.command,
      expectedVersion: input.expectedVersion,
      accountableOwnerId: input.accountableOwnerId,
      contributorIds: input.contributorIds,
      targetDate: input.targetDate,
      note: input.note,
      completionNote: input.completionNote,
      evidenceReferences: input.evidenceReferences,
      evidenceNotAvailableReason: input.evidenceNotAvailableReason,
      dependencyOverride: input.dependencyOverride,
      dependencyOverrideReason: input.dependencyOverrideReason,
      dependencyOverrideAcknowledged: input.dependencyOverrideAcknowledged,
      cancelAcknowledged: input.cancelAcknowledged,
    });
    const replay = await this.repo.getActionEventByIdempotency(input.idempotencyKey, tenant);
    if (replay) {
      if (replay.actionId !== input.actionId || replay.payloadHash !== requestHash) {
        throw new RecommendationActionServiceError(
          "RECOMMENDATION_ACTION_INVALID",
          409,
          "That request key has already been used for another action change.",
        );
      }
      return this.get(input.actionId, tenant, true);
    }
    const current = await this.get(input.actionId, tenant, false);
    const source = await this.repo.getActionSource(current.portfolioItemId, tenant);
    if (!source) {
      throw new RecommendationActionServiceError(
        "RECOMMENDATION_ACCESS_DENIED",
        404,
        "The improvement action is not available.",
      );
    }
    const nextFields = {
      ...fields(current),
      ...(input.accountableOwnerId !== undefined
        ? { accountableOwnerId: input.accountableOwnerId }
        : {}),
      ...(input.contributorIds !== undefined ? { contributorIds: input.contributorIds } : {}),
      ...(input.targetDate !== undefined ? { targetDate: input.targetDate } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
      ...(input.completionNote !== undefined ? { completionNote: input.completionNote } : {}),
      ...(input.evidenceReferences !== undefined
        ? { evidenceReferences: input.evidenceReferences }
        : {}),
      ...(input.evidenceNotAvailableReason !== undefined
        ? { evidenceNotAvailableReason: input.evidenceNotAvailableReason }
        : {}),
      dependencyOverride: input.dependencyOverride === true,
      dependencyOverrideReason: input.dependencyOverrideReason ?? null,
      dependencyOverrideAcknowledged: input.dependencyOverrideAcknowledged === true,
    };
    const states = await this.repo.getDependencyActionStates(source.portfolioId, tenant);
    const blockingDependencyIds = incompleteRequiredActionDependencies(source.dependencies, states);
    let transition;
    try {
      transition = transitionRecommendationAction({
        currentState: current.status,
        command: input.command,
        ...nextFields,
        cancelAcknowledged: input.cancelAcknowledged,
        blockingDependencyIds,
      });
    } catch (error) {
      if (error instanceof RecommendationActionError) {
        throw new RecommendationActionServiceError(
          error.code,
          error.code === "ACTION_DEPENDENCY_BLOCKED" ? 409 : 400,
          error.message,
        );
      }
      throw error;
    }
    if (input.command === "started" && source.decisionState !== "accepted") {
      throw new RecommendationActionServiceError(
        "RECOMMENDATION_ACTION_INVALID",
        409,
        "This recommendation is no longer accepted and cannot be started.",
      );
    }
    try {
      await this.repo.recordAction({
        action_id: current.id,
        portfolio_item_id: current.portfolioItemId,
        organisation_id: current.organisationId,
        workspace_id: current.workspaceId,
        actor_user_id: input.actorUserId,
        plan_version: current.planVersion,
        command: transition.command,
        expected_version: input.expectedVersion,
        idempotency_key: input.idempotencyKey,
        payload_hash: requestHash,
        accountable_owner_id: transition.accountableOwnerId,
        contributor_ids: transition.contributorIds,
        target_date: transition.targetDate,
        note: transition.note,
        completion_note: transition.completionNote,
        evidence_references: transition.evidenceReferences,
        evidence_not_available_reason: transition.evidenceNotAvailableReason,
        dependency_override: transition.dependencyOverride,
        dependency_override_reason: transition.dependencyOverrideReason,
        dependency_override_acknowledged: transition.dependencyOverrideAcknowledged,
        cancel_acknowledged: input.cancelAcknowledged === true,
      });
      const result = await this.get(current.id, tenant, true);
      if (result.accountableOwnerId && result.accountableOwnerId !== current.accountableOwnerId) {
        this.notifier({
          recipients: [result.accountableOwnerId],
          module: "improvement-plan",
          eventType: "recommendation.action_assigned",
          title: "You are accountable for an improvement action",
          body: source.title,
          organisationId: result.organisationId,
          workspaceId: result.workspaceId,
          metadata: { actionId: result.id, portfolioItemId: result.portfolioItemId },
        });
      }
      return result;
    } catch (error) {
      throw knownDatabaseError(error) ?? error;
    }
  }
}

export const recommendationActionService = new RecommendationActionService();
