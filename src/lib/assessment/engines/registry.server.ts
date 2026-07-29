import type { EngineStageId } from "../types";
import type { EngineService } from "./contract.server";
import { knowledgePackEngine } from "./knowledge-pack.server";
import { observationsEngine } from "./observations.server";
import { signalsEngine } from "./signals.server";
import { rulesEngine } from "./rules.server";
import { patternsEngine } from "./patterns.server";
import { scoresEngine } from "./scores.server";
import { recommendationsEngine } from "./recommendations.server";
import { narrativeEngine } from "./narrative.server";

/**
 * Engine registry. The runtime controller resolves engines through this map
 * only, so any stage can be replaced or extended without touching the
 * orchestration code.
 */
const REGISTRY = new Map<EngineStageId, EngineService>([
  [knowledgePackEngine.id, knowledgePackEngine as EngineService],
  [observationsEngine.id, observationsEngine as EngineService],
  [signalsEngine.id, signalsEngine as EngineService],
  [rulesEngine.id, rulesEngine as EngineService],
  [patternsEngine.id, patternsEngine as EngineService],
  [scoresEngine.id, scoresEngine as EngineService],
  [recommendationsEngine.id, recommendationsEngine as EngineService],
  [narrativeEngine.id, narrativeEngine as EngineService],
]);

export function resolveEngine(stage: EngineStageId): EngineService {
  const engine = REGISTRY.get(stage);
  if (!engine) throw new Error(`No engine registered for stage "${stage}"`);
  return engine;
}

export function registerEngine(engine: EngineService): void {
  REGISTRY.set(engine.id, engine);
}
