import { sprint03Configuration } from "./config";

export interface FindingCapability {
  id: string;
  order: number;
  score: number;
  confidence: number;
}

const strengthSort = (a: FindingCapability, b: FindingCapability) =>
  b.score - a.score || b.confidence - a.confidence || a.order - b.order || a.id.localeCompare(b.id);
const opportunitySort = (a: FindingCapability, b: FindingCapability) =>
  a.score - b.score || b.confidence - a.confidence || a.order - b.order || a.id.localeCompare(b.id);

export function classifyFindings(
  capabilities: FindingCapability[],
  audience: "workspace" | "public" = "workspace",
) {
  const { findings } = sprint03Configuration;
  const insufficientEvidence = capabilities
    .filter(
      (item) =>
        item.confidence < findings.insufficientEvidence.capabilityConfidenceMaximumExclusive,
    )
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const eligible = capabilities.filter(
    (item) => item.confidence >= findings.strength.capabilityConfidenceMinimumInclusive,
  );
  const strengthLimit =
    audience === "public" ? findings.strength.maximumPublic : findings.strength.maximumWorkspace;
  const opportunityLimit =
    audience === "public"
      ? findings.priorityOpportunity.maximumPublic
      : findings.priorityOpportunity.maximumWorkspace;
  return {
    strengths: eligible
      .filter((item) => item.score >= findings.strength.scoreMinimumInclusive)
      .sort(strengthSort)
      .slice(0, strengthLimit),
    priorityOpportunities: eligible
      .filter((item) => item.score < findings.priorityOpportunity.scoreMaximumExclusive)
      .sort(opportunitySort)
      .slice(0, opportunityLimit),
    insufficientEvidence,
  };
}
