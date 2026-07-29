import type { EngineStageId } from "./types";

export interface StageDescriptor {
  id: EngineStageId;
  sequence: number;
  label: string;
  description: string;
}

/**
 * Canonical, ordered engine pipeline. The runtime controller reads this list
 * only for ordering/labels — each engine implementation is registered
 * independently in `engines/registry.server.ts`.
 */
export const ENGINE_STAGES: StageDescriptor[] = [
  {
    id: "knowledge_pack",
    sequence: 1,
    label: "Knowledge Pack",
    description: "Loading domain model, benchmarks and scoring weights",
  },
  {
    id: "observations",
    sequence: 2,
    label: "Observations",
    description: "Normalising raw responses into structured observations",
  },
  {
    id: "signals",
    sequence: 3,
    label: "Signals",
    description: "Detecting directional strengths and weaknesses",
  },
  {
    id: "rules",
    sequence: 4,
    label: "Rules",
    description: "Evaluating the delivery rule base against signals",
  },
  {
    id: "patterns",
    sequence: 5,
    label: "Patterns",
    description: "Matching known delivery patterns and anti-patterns",
  },
  {
    id: "scores",
    sequence: 6,
    label: "Scores",
    description: "Computing weighted section and overall maturity scores",
  },
  {
    id: "recommendations",
    sequence: 7,
    label: "Recommendations",
    description: "Sequencing interventions across now, next and later",
  },
  {
    id: "narrative",
    sequence: 8,
    label: "Narrative",
    description: "Composing the executive narrative for the report",
  },
];

export const STAGE_LABELS: Record<EngineStageId, string> = ENGINE_STAGES.reduce(
  (acc, stage) => ({ ...acc, [stage.id]: stage.label }),
  {} as Record<EngineStageId, string>,
);
