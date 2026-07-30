import * as assessmentRepo from "../assessment/repository.server";
import { resolveEngine } from "../assessment/engines/registry.server";
import type { EngineContext } from "../assessment/engines/contract.server";
import type {
  AssessmentResults,
  AssessmentSession,
  EngineStageId,
} from "../assessment/types";
import { scheduleGraphRefresh } from "../audit/runtime-audit.server";
import type { PipelineEngineId } from "./types";

/**
 * Engine adapters.
 *
 * The orchestrator invokes engines exclusively through this uniform
 * `run(context)` boundary, so no orchestration code imports engine internals
 * and any engine can be replaced or extended independently.
 */

export interface StageExecutionContext {
  session: AssessmentSession;
  ownerKey: string;
}

export interface StageAdapter {
  engine: PipelineEngineId;
  run(context: StageExecutionContext): Promise<{ produced: number | null }>;
}

function produced(output: unknown): number | null {
  if (Array.isArray(output)) return output.length;
  if (output && typeof output === "object") return 1;
  return null;
}

/** Adapter around an intelligence engine registered in the engine registry. */
function intelligenceEngineAdapter(stage: EngineStageId): StageAdapter {
  return {
    engine: stage,
    async run({ session }) {
      const rows = await assessmentRepo.getStageRows(session.id);
      const context: EngineContext = {
        session,
        responses: await assessmentRepo.getResponses(session.id),
        artifacts: Object.fromEntries(
          rows.filter((row) => row.status === "completed").map((row) => [row.stage, row.output]),
        ) as EngineContext["artifacts"],
      };

      const startedAt = Date.now();
      await assessmentRepo.updateStageRun(session.id, stage, {
        status: "running",
        started_at: new Date().toISOString(),
        error: null,
      });

      try {
        const output = await resolveEngine(stage).run(context);
        await assessmentRepo.updateStageRun(session.id, stage, {
          status: "completed",
          output: output ?? null,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
        });
        return { produced: produced(output) };
      } catch (error) {
        await assessmentRepo.updateStageRun(session.id, stage, {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown engine failure",
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
        });
        throw error;
      }
    },
  };
}

function outputOf<T>(rows: { stage: EngineStageId; output: unknown }[], stage: EngineStageId): T {
  return rows.find((row) => row.stage === stage)?.output as T;
}

export function assembleResults(
  rows: { stage: EngineStageId; output: unknown }[],
): AssessmentResults {
  return {
    generatedAt: new Date().toISOString(),
    observations: outputOf(rows, "observations") ?? [],
    signals: outputOf(rows, "signals") ?? [],
    rules: outputOf(rows, "rules") ?? [],
    patterns: outputOf(rows, "patterns") ?? [],
    scores: outputOf(rows, "scores") ?? { overall: 0, band: "at-risk", sections: [] },
    recommendations: outputOf(rows, "recommendations") ?? [],
    narrative: outputOf(rows, "narrative") ?? { headline: "", summary: "", paragraphs: [] },
  } as AssessmentResults;
}

/**
 * Terminal runtime stage: publishes assembled results so the Executive
 * Dashboard and Report Engine can serve them, then refreshes the evidence
 * graph in the background.
 */
const dashboardRefreshAdapter: StageAdapter = {
  engine: "dashboard_refresh",
  async run({ session }) {
    const rows = await assessmentRepo.getStageRows(session.id);
    const missing = rows.filter((row) => row.status !== "completed").map((row) => row.stage);
    if (missing.length > 0) {
      throw new Error(`Cannot publish results — incomplete stages: ${missing.join(", ")}`);
    }

    await assessmentRepo.updateSession(session.id, {
      status: "completed",
      results: assembleResults(rows),
      completed_at: new Date().toISOString(),
      failure_reason: null,
    });

    scheduleGraphRefresh(session.id);
    return { produced: rows.length };
  },
};

const ADAPTERS = new Map<PipelineEngineId, StageAdapter>([
  ["dashboard_refresh", dashboardRefreshAdapter],
]);

export function resolveStageAdapter(engine: PipelineEngineId): StageAdapter {
  const registered = ADAPTERS.get(engine);
  if (registered) return registered;
  const adapter = intelligenceEngineAdapter(engine as EngineStageId);
  ADAPTERS.set(engine, adapter);
  return adapter;
}

/** Extension point: register a custom stage adapter for a future pipeline. */
export function registerStageAdapter(adapter: StageAdapter): void {
  ADAPTERS.set(adapter.engine, adapter);
}

export function isEngineAvailable(engine: PipelineEngineId): boolean {
  if (ADAPTERS.has(engine)) return true;
  try {
    resolveEngine(engine as EngineStageId);
    return true;
  } catch {
    return false;
  }
}
