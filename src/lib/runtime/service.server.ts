import { AssessmentRuntimeEngine, RuntimeError, subscribeToRuntimeEvents } from "./engine";
import { SupabaseRuntimeStore } from "./repository.server";
import { listAssessments, loadDefinition } from "./loader.server";

export { RuntimeError, subscribeToRuntimeEvents, listAssessments };

/** Process-wide runtime instance bound to Postgres persistence. */
export const assessmentRuntime = new AssessmentRuntimeEngine({
  store: new SupabaseRuntimeStore(),
  loadDefinition,
});
