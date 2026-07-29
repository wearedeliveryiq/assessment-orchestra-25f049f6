import type { PatternItem, RecommendationItem, RuleHit, ScoreSummary } from "../types";
import { artifact, type EngineService } from "./contract.server";

const HORIZON: Record<RuleHit["severity"], RecommendationItem["horizon"]> = {
  critical: "now",
  high: "now",
  medium: "next",
  low: "later",
};

const IMPACT: Record<RuleHit["severity"], RecommendationItem["impact"]> = {
  critical: "high",
  high: "high",
  medium: "medium",
  low: "low",
};

const PLAYBOOK: Record<string, string> = {
  "rule.deploy_manual":
    "Stand up a single automated deployment pipeline for the highest-traffic service and make it the only release path.",
  "rule.no_tests":
    "Introduce a contract and smoke test suite gating the pipeline, starting with the top three critical journeys.",
  "rule.wip_overload":
    "Set explicit WIP limits per team and publish cycle-time trend on the delivery wall.",
  "rule.outcome_gap":
    "Attach a named outcome and a single measure to every initiative before it enters the backlog.",
  "rule.manual_reporting":
    "Replace hand-built reporting with a live view sourced directly from delivery tooling.",
  "rule.debt_accrual":
    "Reserve a fixed share of each iteration for prioritised debt remediation and track it like feature work.",
  "rule.dependency_drag":
    "Run a fortnightly dependency mapping session before commitment, not after.",
  "rule.systemic_lag":
    "Charter a focused improvement team with a 90-day mandate across the trailing capability areas.",
};

export const recommendationsEngine: EngineService<RecommendationItem[]> = {
  id: "recommendations",
  async run(context) {
    const rules = artifact<RuleHit[]>(context, "rules");
    const patterns = artifact<PatternItem[]>(context, "patterns");
    const scores = artifact<ScoreSummary>(context, "scores");

    const fromRules = rules.map<RecommendationItem>((rule) => ({
      id: `rec.${rule.id}`,
      horizon: HORIZON[rule.severity],
      impact: IMPACT[rule.severity],
      title: PLAYBOOK[rule.id] ?? rule.title,
      rationale: rule.detail,
    }));

    const weakest = [...scores.sections].sort((a, b) => a.score - b.score)[0];
    const fromPattern = patterns
      .filter((p) => p.confidence >= 0.5 && p.id !== "pattern.balanced_delivery")
      .slice(0, 2)
      .map<RecommendationItem>((pattern) => ({
        id: `rec.${pattern.id}`,
        horizon: "next",
        impact: "medium",
        title: `Run a targeted intervention against the ${pattern.name} pattern`,
        rationale: pattern.description,
      }));

    const baseline: RecommendationItem[] = weakest
      ? [
          {
            id: "rec.baseline",
            horizon: "later",
            impact: "medium",
            title: `Re-baseline ${weakest.title} in 90 days`,
            rationale: `${weakest.title} is the lowest scoring capability at ${weakest.score.toFixed(1)}/5.`,
          },
        ]
      : [];

    return [...fromRules, ...fromPattern, ...baseline];
  },
};
