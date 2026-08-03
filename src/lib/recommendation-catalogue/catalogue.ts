import { z } from "zod";

import {
  SPRINT03_CONFIGURATION_SET_ID,
  sprint03Configuration,
} from "../delivery-intelligence/config";
import type {
  CatalogueCommand,
  CatalogueDefinition,
  CatalogueLifecycleState,
  CatalogueSnapshot,
} from "./types";

const semver = /^\d+\.\d+\.\d+$/;
const reference = z.record(z.string(), z.string().min(1));
const versionedRecommendationReference = z.object({
  id: z.string().regex(/^rec_[a-z0-9_]+$/),
  version: z.string().regex(semver),
});
const definitionSchema = z.object({
  id: z.string().regex(/^rec_[a-z0-9_]+$/),
  version: z.string().regex(semver),
  order: z.number().int().positive(),
  title: z.string().trim().min(1).max(160),
  impact: z.enum(["low", "medium", "high"]),
  effort: z.enum(["low", "medium", "high"]),
  dedupeGroup: z.string().trim().min(1).max(100),
  triggers: z.object({ any: z.array(reference).min(1) }),
  exclusions: z.array(reference),
  dependencies: z.array(z.string()),
  conflicts: z.array(z.string()),
  conflictPriority: z.number().int().nonnegative().optional(),
  canonicalRecommendation: versionedRecommendationReference.optional(),
  supersedes: z.array(versionedRecommendationReference).optional(),
  outcome: z.string().trim().min(1).max(500),
  successMeasures: z.array(z.string().trim().min(1).max(300)).min(1),
});

export class CatalogueValidationError extends Error {
  readonly code = "CATALOGUE_VERSION_INVALID";
}

export function nextCatalogueState(
  current: CatalogueLifecycleState,
  command: CatalogueCommand,
): CatalogueLifecycleState {
  const transition: Partial<
    Record<CatalogueLifecycleState, Partial<Record<CatalogueCommand, CatalogueLifecycleState>>>
  > = {
    draft: { submit: "in_review" },
    in_review: { approve: "approved" },
    approved: { activate: "active", rollback: "active" },
    active: { retire: "retired" },
    retired: { rollback: "active" },
    superseded: { rollback: "active" },
  };
  const target = transition[current]?.[command];
  if (!target) throw new CatalogueValidationError(`Invalid ${current}:${command} transition`);
  return target;
}

function assertUnique(values: string[], label: string) {
  if (new Set(values).size !== values.length) {
    throw new CatalogueValidationError(`${label} must be unique`);
  }
}

function assertAcyclic(definitions: CatalogueDefinition[]) {
  const graph = new Map(definitions.map((item) => [item.id, item.dependencies]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string, path: string[]) => {
    if (visiting.has(id)) {
      throw new CatalogueValidationError(`Dependency cycle: ${[...path, id].join(" -> ")}`);
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of graph.get(id) ?? []) visit(dependency, [...path, id]);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of graph.keys()) visit(id, []);
}

function referenceKey(value: { id: string; version: string }) {
  return `${value.id}@${value.version}`;
}

function validateConflictMetadata(definitions: CatalogueDefinition[]) {
  const byId = new Map(definitions.map((item) => [item.id, item]));
  for (const item of definitions) {
    if (item.conflicts.length && item.conflictPriority === undefined) {
      throw new CatalogueValidationError(`${item.id} conflict priority is required`);
    }
    for (const conflictId of item.conflicts) {
      const conflict = byId.get(conflictId);
      if (!conflict?.conflicts.includes(item.id)) {
        throw new CatalogueValidationError(`${item.id} conflict with ${conflictId} must be mutual`);
      }
    }
  }
}

function validateSupersessionMetadata(definitions: CatalogueDefinition[]) {
  const byId = new Map(definitions.map((item) => [item.id, item]));
  const supersederByTarget = new Map<string, string>();
  const graph = new Map<string, string[]>();
  for (const item of definitions) {
    const supersedes = item.supersedes ?? [];
    assertUnique(supersedes.map(referenceKey), `${item.id} supersedes`);
    graph.set(
      item.id,
      supersedes.map((target) => target.id),
    );
    for (const target of supersedes) {
      const definition = byId.get(target.id);
      if (!definition || definition.version !== target.version || definition.id === item.id) {
        throw new CatalogueValidationError(`${item.id} contains an invalid supersession`);
      }
      if (item.dependencies.includes(target.id)) {
        throw new CatalogueValidationError(`${item.id} cannot supersede its dependency`);
      }
      const existing = supersederByTarget.get(referenceKey(target));
      if (existing && existing !== item.id) {
        throw new CatalogueValidationError(`${target.id} has multiple superseding definitions`);
      }
      supersederByTarget.set(referenceKey(target), item.id);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new CatalogueValidationError(`Supersession cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const target of graph.get(id) ?? []) visit(target);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of graph.keys()) visit(id);
}

function validateCanonicalMetadata(definitions: CatalogueDefinition[]) {
  const byId = new Map(definitions.map((item) => [item.id, item]));
  const groups = new Map<string, CatalogueDefinition[]>();
  for (const item of definitions) {
    groups.set(item.dedupeGroup, [...(groups.get(item.dedupeGroup) ?? []), item]);
  }
  for (const [group, members] of groups) {
    const references = new Map(
      members
        .filter((item) => item.canonicalRecommendation)
        .map((item) => [
          referenceKey(item.canonicalRecommendation!),
          item.canonicalRecommendation!,
        ]),
    );
    if (references.size > 1) {
      throw new CatalogueValidationError(`${group} has conflicting canonical recommendations`);
    }
    const canonicalReference = [...references.values()][0];
    const canonical = canonicalReference
      ? byId.get(canonicalReference.id)
      : [...members].sort(
          (left, right) => left.order - right.order || left.id.localeCompare(right.id),
        )[0];
    if (
      !canonical ||
      (canonicalReference && canonical.version !== canonicalReference.version) ||
      canonical.dedupeGroup !== group
    ) {
      throw new CatalogueValidationError(`${group} canonical recommendation is invalid`);
    }
    if (members.some((member) => canonical.dependencies.includes(member.id))) {
      throw new CatalogueValidationError(`${canonical.id} cannot deduplicate its dependency`);
    }
  }
}

export function validateCatalogueSnapshot(value: unknown): CatalogueSnapshot {
  const parsed = z
    .object({
      catalogueId: z.literal("deliveryiq-recommendations"),
      version: z.string().regex(semver),
      sourceConfigurationSetId: z.literal(SPRINT03_CONFIGURATION_SET_ID),
      definitions: z.array(definitionSchema).min(1),
    })
    .safeParse(value);
  if (!parsed.success) throw new CatalogueValidationError(z.prettifyError(parsed.error));
  const snapshot = parsed.data;
  const ids = snapshot.definitions.map((item) => item.id);
  const known = new Set(ids);
  const capabilities = new Set(sprint03Configuration.capabilities.map((item) => item.id));
  const patterns = new Set(sprint03Configuration.patterns.map((item) => item.id));
  assertUnique(ids, "Recommendation IDs");
  assertUnique(
    snapshot.definitions.map((item) => String(item.order)),
    "Catalogue order",
  );
  for (const item of snapshot.definitions) {
    assertUnique(item.dependencies, `${item.id} dependencies`);
    assertUnique(item.conflicts, `${item.id} conflicts`);
    if (item.dependencies.includes(item.id) || item.conflicts.includes(item.id)) {
      throw new CatalogueValidationError(`${item.id} cannot reference itself`);
    }
    for (const dependency of [...item.dependencies, ...item.conflicts]) {
      if (!known.has(dependency)) {
        throw new CatalogueValidationError(`${item.id} references unknown ${dependency}`);
      }
    }
    if (item.dependencies.some((dependency) => item.conflicts.includes(dependency))) {
      throw new CatalogueValidationError(`${item.id} cannot conflict with its dependency`);
    }
    for (const trigger of item.triggers.any) {
      const entries = Object.entries(trigger);
      const valid =
        entries.length === 1 &&
        ((entries[0][0] === "opportunity" && capabilities.has(entries[0][1])) ||
          (entries[0][0] === "pattern" && patterns.has(entries[0][1])) ||
          (entries[0][0] === "analysisConfidence" && entries[0][1] === "low"));
      if (!valid) throw new CatalogueValidationError(`${item.id} contains an unknown trigger`);
    }
    for (const exclusion of item.exclusions) {
      const entries = Object.entries(exclusion);
      if (entries.length !== 1 || entries[0][0] !== "pattern" || !patterns.has(entries[0][1])) {
        throw new CatalogueValidationError(`${item.id} contains an unknown exclusion`);
      }
    }
  }
  assertAcyclic(snapshot.definitions);
  validateConflictMetadata(snapshot.definitions);
  validateSupersessionMetadata(snapshot.definitions);
  validateCanonicalMetadata(snapshot.definitions);
  return snapshot;
}

export function sprint03CatalogueSnapshot(): CatalogueSnapshot {
  return validateCatalogueSnapshot({
    catalogueId: "deliveryiq-recommendations",
    version: "1.0.0",
    sourceConfigurationSetId: SPRINT03_CONFIGURATION_SET_ID,
    definitions: sprint03Configuration.recommendations.map((item) => ({
      ...item,
      version: "1.0.0",
      conflicts: [],
    })),
  });
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function catalogueDigest(snapshot: CatalogueSnapshot): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(validateCatalogueSnapshot(snapshot)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function definitionIntentDigest(definition: CatalogueDefinition): Promise<string> {
  const intent = { id: definition.id, dedupeGroup: definition.dedupeGroup };
  const bytes = new TextEncoder().encode(canonical(intent));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
