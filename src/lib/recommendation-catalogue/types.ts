export type CatalogueLifecycleState =
  "draft" | "in_review" | "approved" | "active" | "retired" | "superseded";

export interface VersionedRecommendationReference {
  id: string;
  version: string;
}

export interface CatalogueDefinition {
  id: string;
  version: string;
  order: number;
  title: string;
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  dedupeGroup: string;
  triggers: { any: Array<Record<string, string>> };
  exclusions: Array<Record<string, string>>;
  dependencies: string[];
  conflicts: string[];
  conflictPriority?: number;
  canonicalRecommendation?: VersionedRecommendationReference;
  supersedes?: VersionedRecommendationReference[];
  outcome: string;
  successMeasures: string[];
}

export interface CatalogueSnapshot {
  catalogueId: string;
  version: string;
  sourceConfigurationSetId: string;
  definitions: CatalogueDefinition[];
}

export interface CatalogueVersionRecord {
  id: string;
  catalogueId: string;
  version: string;
  sourceConfigurationSetId: string;
  contentDigest: string;
  snapshot: CatalogueSnapshot;
  state: CatalogueLifecycleState;
  authoredBy: string;
  createdAt: string;
}

export type CatalogueCommand = "submit" | "approve" | "activate" | "retire" | "rollback";
