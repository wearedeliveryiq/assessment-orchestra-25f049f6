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
