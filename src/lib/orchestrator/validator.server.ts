import * as assessmentRepo from "../assessment/repository.server";
import { TOTAL_QUESTIONS } from "../assessment/questionnaire";
import { knowledgePackLoader } from "../knowledge-packs/loader.server";
import { isEngineAvailable } from "./engine-adapters.server";
import { validatePipeline } from "./pipeline";
import * as repo from "./repository.server";
import { OrchestratorError, type PipelineDefinition } from "./types";
import type { AssessmentSession } from "../assessment/types";

/**
 * PipelineValidator — every precondition an execution must satisfy before the
 * orchestrator will accept it. Invalid executions are rejected rather than
 * started, so a run never leaves the assessment in an inconsistent state.
 */

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  knowledgePackId: string;
  knowledgePackVersion: string;
}

export async function validateExecutionRequest(input: {
  session: AssessmentSession;
  pipeline: PipelineDefinition;
  allowActive?: boolean;
}): Promise<ValidationResult> {
  const issues: string[] = [];
  const { session, pipeline } = input;

  // 1. Pipeline is structurally executable.
  issues.push(...validatePipeline(pipeline));

  // 2. Every engine referenced by the pipeline is available.
  for (const stage of pipeline.stages) {
    if (!isEngineAvailable(stage.engine)) {
      issues.push(`No engine registered for stage "${stage.id}" (${stage.engine})`);
    }
  }

  // 3. Knowledge Pack resolves and is valid.
  let knowledgePackId = "";
  let knowledgePackVersion = "";
  try {
    const pack = knowledgePackLoader.loadActive();
    knowledgePackId = pack.manifest.id;
    knowledgePackVersion = pack.manifest.version;
  } catch (error) {
    issues.push(
      `Active Knowledge Pack is unavailable: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }

  // 4. Assessment is complete and eligible.
  if (session.status === "archived") {
    issues.push("An archived assessment cannot be executed");
  }
  const responses = await assessmentRepo.getResponses(session.id);
  const answered = responses.filter((r) => r.value !== null).length;
  if (answered < TOTAL_QUESTIONS) {
    issues.push(
      `Assessment is incomplete — ${answered} of ${TOTAL_QUESTIONS} questions answered`,
    );
  }

  // 5. No execution is already in flight for this assessment.
  if (!input.allowActive) {
    const active = await repo.findActiveExecution(session.id);
    if (active) {
      issues.push(`Execution ${active.id} is already ${active.status} for this assessment`);
    }
  }

  return { valid: issues.length === 0, issues, knowledgePackId, knowledgePackVersion };
}

export function assertValid(result: ValidationResult): void {
  if (!result.valid) {
    throw new OrchestratorError(result.issues.join("; "), 422, "pipeline_validation_failed");
  }
}
