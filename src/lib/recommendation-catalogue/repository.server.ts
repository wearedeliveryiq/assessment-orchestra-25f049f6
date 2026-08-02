/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { CatalogueVersionRecord } from "./types";

const database = supabaseAdmin as unknown as {
  from(table: string): any;
  rpc(name: string, parameters: Record<string, unknown>): Promise<any>;
};

function toVersion(row: Record<string, any>): CatalogueVersionRecord {
  return {
    id: row.id,
    catalogueId: row.catalogue_id,
    version: row.version,
    sourceConfigurationSetId: row.source_configuration_set_id,
    contentDigest: row.content_digest,
    snapshot: row.snapshot,
    state: row.current_state,
    authoredBy: row.authored_by,
    createdAt: row.created_at,
  };
}

export async function createVersion(input: Record<string, unknown>) {
  const result = await database.rpc("create_recommendation_catalogue_version", { p_input: input });
  if (result.error?.code === "23505") {
    const replay = await findByIdentity(String(input.catalogue_id), String(input.version));
    if (replay && replay.contentDigest === input.content_digest) return replay;
  }
  if (result.error) throw new Error(result.error.message);
  return toVersion(Array.isArray(result.data) ? result.data[0] : result.data);
}

export async function getActiveVersion(environment = "production") {
  const result = await database
    .from("recommendation_catalogue_activations")
    .select("catalogue_version_id,recommendation_catalogue_versions(*)")
    .eq("environment", environment)
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  const row = result.data?.recommendation_catalogue_versions;
  return row ? toVersion(Array.isArray(row) ? row[0] : row) : null;
}

export async function getVersion(id: string) {
  const result = await database
    .from("recommendation_catalogue_versions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? toVersion(result.data) : null;
}

export async function findByIdentity(catalogueId: string, version: string) {
  const result = await database
    .from("recommendation_catalogue_versions")
    .select("*")
    .eq("catalogue_id", catalogueId)
    .eq("version", version)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? toVersion(result.data) : null;
}

export async function listDefinitionsByStableId(ids: string[]) {
  if (!ids.length) return [];
  const result = await database
    .from("recommendation_definitions")
    .select("recommendation_id,intent_digest")
    .in("recommendation_id", ids);
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []).map((row: any) => ({
    id: row.recommendation_id,
    intentDigest: row.intent_digest,
  }));
}

export async function transition(input: Record<string, unknown>) {
  const result = await database.rpc("transition_recommendation_catalogue", input);
  if (result.error) throw new Error(result.error.message);
  return toVersion(Array.isArray(result.data) ? result.data[0] : result.data);
}
