import { knowledgePackLoader } from "../../knowledge-packs/loader.server";
import { patternEngine } from "../../patterns/engine.server";
import { replacePatterns } from "../../patterns/repository.server";
import { listRuleResults } from "../../rules/repository.server";
import type { PatternItem, RuleHit, SignalItem } from "../types";
import { artifact, type EngineService } from "./contract.server";

/**
 * Patterns stage.
 *
 * Runs the pack-driven Pattern Engine over the persisted RuleResults and stores
 * immutable Patterns for the Pattern Explorer and downstream Scoring Engine.
 * The legacy in-memory patterns are retained so the existing scoring/narrative
 * stages stay backward compatible while they migrate to the new entity.
 */

interface LegacyPatternDefinition {
  id: string;
  name: string;
  description: string;
  match: (input: { rules: RuleHit[]; signals: SignalItem[] }) => number;
}

const hasRule = (rules: RuleHit[], id: string) => rules.some((r) => r.id === id);

const PATTERNS: LegacyPatternDefinition[] = [
  {
    id: "pattern.release_train_jam",
    name: "Release Train Jam",
    description:
      "Batch releases and manual verification combine to push risk to the end of the cycle.",
    match: ({ rules }) =>
      (hasRule(rules, "rule.deploy_manual") ? 0.55 : 0) + (hasRule(rules, "rule.no_tests") ? 0.35 : 0),
  },
  {
    id: "pattern.feature_factory",
    name: "Feature Factory",
    description: "Output is measured instead of outcomes, so learning loops never close.",
    match: ({ rules }) =>
      (hasRule(rules, "rule.outcome_gap") ? 0.6 : 0) +
      (hasRule(rules, "rule.manual_reporting") ? 0.25 : 0),
  },
  {
    id: "pattern.hidden_queue",
    name: "Hidden Queue",
    description: "Unlimited WIP and late dependency discovery create invisible waiting time.",
    match: ({ rules }) =>
      (hasRule(rules, "rule.wip_overload") ? 0.5 : 0) +
      (hasRule(rules, "rule.dependency_drag") ? 0.3 : 0),
  },
  {
    id: "pattern.compounding_drag",
    name: "Compounding Drag",
    description: "Unmanaged debt slowly consumes delivery capacity across every initiative.",
    match: ({ rules }) => (hasRule(rules, "rule.debt_accrual") ? 0.65 : 0),
  },
  {
    id: "pattern.balanced_delivery",
    name: "Balanced Delivery System",
    description: "Capabilities are broadly aligned and no single area is dragging the system.",
    match: ({ signals, rules }) =>
      rules.length === 0 && signals.every((s) => s.direction === "positive") ? 0.9 : 0,
  },
];

export const patternsEngine: EngineService<PatternItem[]> = {
  id: "patterns",
  async run(context) {
    const rules = artifact<RuleHit[]>(context, "rules");
    const signals = artifact<SignalItem[]>(context, "signals");

    // Pack-driven Pattern Engine: consumes RuleResults only.
    let packPatterns: PatternItem[] = [];
    try {
      const pack = knowledgePackLoader.loadActive();
      const ruleResults = await listRuleResults(context.session.id);
      const { patterns, summary } = await patternEngine.run({
        session: context.session,
        rules: ruleResults,
        pack,
      });
      await replacePatterns(context.session.id, patterns);
      if (summary.errored.length > 0) {
        console.error("[patterns-stage] patterns failed", summary.errored);
      }
      packPatterns = patterns.map((pattern) => ({
        id: pattern.patternCode,
        name: pattern.name,
        description: pattern.businessImpact,
        confidence: pattern.confidence,
      }));
    } catch (error) {
      // Pattern generation must not break the legacy scoring pipeline.
      console.error("[patterns-stage] pattern engine failed", error);
    }

    const legacy = PATTERNS.map((pattern) => ({
      id: pattern.id,
      name: pattern.name,
      description: pattern.description,
      confidence: Math.min(1, Number(pattern.match({ rules, signals }).toFixed(2))),
    })).filter((pattern) => pattern.confidence > 0);

    return [...packPatterns, ...legacy].sort((a, b) => b.confidence - a.confidence);
  },
};
