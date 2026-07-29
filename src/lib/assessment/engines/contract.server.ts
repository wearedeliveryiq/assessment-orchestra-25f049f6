import type { AssessmentResponse, AssessmentSession, EngineStageId } from "../types";

export interface KnowledgePack {
  version: string;
  bands: { min: number; band: "leading" | "performing" | "developing" | "at-risk" }[];
  weights: Record<string, number>;
  benchmark: Record<string, number>;
}

/**
 * Everything an engine may read. Engines never touch the database directly —
 * the runtime controller owns persistence, engines own computation.
 */
export interface EngineContext {
  session: AssessmentSession;
  responses: AssessmentResponse[];
  /** Outputs of previously completed stages, keyed by stage id. */
  artifacts: Partial<Record<EngineStageId, unknown>>;
}

/**
 * An engine is an independent, replaceable service. Swapping an implementation
 * (e.g. an LLM-backed narrative engine) requires no change to the controller.
 */
export interface EngineService<TOutput = unknown> {
  id: EngineStageId;
  run(context: EngineContext): Promise<TOutput>;
}

export function artifact<T>(context: EngineContext, stage: EngineStageId): T {
  const value = context.artifacts[stage];
  if (value === undefined) {
    throw new Error(`Missing upstream artifact for stage "${stage}"`);
  }
  return value as T;
}

export function averageScore(responses: AssessmentResponse[]): number {
  const scored = responses.filter((r) => typeof r.score === "number");
  if (scored.length === 0) return 0;
  return scored.reduce((sum, r) => sum + (r.score ?? 0), 0) / scored.length;
}
