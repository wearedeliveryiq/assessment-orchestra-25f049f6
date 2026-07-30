import { getNarrative } from "../narrative/repository.server";
import { getObservation } from "../observations/repository.server";
import { getPattern } from "../patterns/repository.server";
import { getRuleResult } from "../rules/repository.server";
import { getScore } from "../scores/repository.server";
import { getSignal } from "../signals/repository.server";
import type { EvidenceEntityType } from "./types";

/**
 * Resolves which assessment an entity belongs to, so explainability APIs can be
 * called with nothing but an entity type and id.
 */
export async function resolveEntitySession(
  entityType: EvidenceEntityType,
  entityId: string,
): Promise<string | null> {
  switch (entityType) {
    case "observation":
      return (await getObservation(entityId))?.sessionId ?? null;
    case "signal":
      return (await getSignal(entityId))?.sessionId ?? null;
    case "rule":
      return (await getRuleResult(entityId))?.sessionId ?? null;
    case "pattern":
      return (await getPattern(entityId))?.sessionId ?? null;
    case "score":
      return (await getScore(entityId))?.sessionId ?? null;
    case "narrative":
      return (await getNarrative(entityId))?.sessionId ?? null;
    default:
      // `response` and `recommendation` ids are only unique within a session.
      return null;
  }
}
