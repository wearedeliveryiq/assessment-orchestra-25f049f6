import { knowledgePackLoader } from "../../knowledge-packs/loader.server";
import { ruleEngine } from "../../rules/engine.server";
import { replaceRuleResults } from "../../rules/repository.server";
import { listSignals } from "../../signals/repository.server";
import type { ObservationItem, RuleHit, SignalItem } from "../types";
import { artifact, type EngineService } from "./contract.server";

interface RuleDefinition {
  id: string;
  severity: RuleHit["severity"];
  title: string;
  detail: string;
  when: (input: { observations: ObservationItem[]; signals: SignalItem[] }) => boolean;
}

const value = (observations: ObservationItem[], id: string) =>
  observations.find((o) => o.id === id)?.value ?? 0;

/** Rule base is data, not control flow — extend by adding entries. */
const RULES: RuleDefinition[] = [
  {
    id: "rule.deploy_manual",
    severity: "critical",
    title: "Release process is a delivery bottleneck",
    detail: "Deployment automation is below the level required for safe, frequent release.",
    when: ({ observations }) => value(observations, "eng.deploy") <= 2,
  },
  {
    id: "rule.no_tests",
    severity: "high",
    title: "Change confidence depends on manual verification",
    detail: "Automated coverage is insufficient to support rapid change.",
    when: ({ observations }) => value(observations, "eng.tests") <= 2,
  },
  {
    id: "rule.wip_overload",
    severity: "high",
    title: "Work in progress is uncontrolled",
    detail: "Unlimited WIP combined with unmanaged cycle time suppresses throughput.",
    when: ({ observations }) =>
      value(observations, "flow.wip") <= 2 && value(observations, "flow.cycle_time") <= 3,
  },
  {
    id: "rule.outcome_gap",
    severity: "high",
    title: "Delivery is disconnected from outcomes",
    detail: "Initiatives lack named outcomes, so prioritisation cannot be evidence-led.",
    when: ({ observations }) => value(observations, "value.outcomes") <= 2,
  },
  {
    id: "rule.manual_reporting",
    severity: "medium",
    title: "Reporting is hand-assembled",
    detail: "Manual reporting introduces lag and erodes trust in delivery data.",
    when: ({ observations }) => value(observations, "gov.reporting") <= 2,
  },
  {
    id: "rule.debt_accrual",
    severity: "medium",
    title: "Technical debt is accruing silently",
    detail: "Debt is not captured or prioritised, so remediation never competes for capacity.",
    when: ({ observations }) => value(observations, "eng.debt") <= 2,
  },
  {
    id: "rule.dependency_drag",
    severity: "low",
    title: "Cross-team dependencies are discovered late",
    detail: "Dependencies are not mapped ahead of commitment, creating schedule volatility.",
    when: ({ observations }) => value(observations, "flow.dependencies") <= 3,
  },
  {
    id: "rule.systemic_lag",
    severity: "high",
    title: "Multiple capabilities trail the benchmark",
    detail: "Two or more capability areas show a strong negative signal against the benchmark.",
    when: ({ signals }) =>
      signals.filter((s) => s.direction === "negative" && s.strength === "strong").length >= 2,
  },
];

export const rulesEngine: EngineService<RuleHit[]> = {
  id: "rules",
  async run(context) {
    const observations = artifact<ObservationItem[]>(context, "observations");
    const signals = artifact<SignalItem[]>(context, "signals");
    return RULES.filter((rule) => rule.when({ observations, signals })).map(
      ({ id, severity, title, detail }) => ({ id, severity, title, detail }),
    );
  },
};
