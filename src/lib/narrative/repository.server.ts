/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  Narrative,
  NarrativeEvidenceSummary,
  NarrativeMode,
  NarrativeSection,
  NarrativeValidationResult,
} from "./types";

/**
 * NarrativeRepository
 *
 * Server-only persistence for Narratives. A narrative is immutable: a rerun
 * replaces the row for the session wholesale (the database rejects UPDATE),
 * so a stored narrative always matches the evidence it was generated from.
 */
const sb = supabaseAdmin as unknown as { from: (table: string) => any };
const table = () => sb.from("assessment_narratives");

type NarrativeRow = {
  id: string;
  session_id: string;
  knowledge_pack: string;
  knowledge_pack_version: string;
  headline: string;
  summary: string;
  mode: NarrativeMode;
  provider: string;
  model: string;
  tone: string;
  audience: string;
  confidence: number | string;
  sections: NarrativeSection[];
  evidence: NarrativeEvidenceSummary;
  validation: NarrativeValidationResult;
  generation_ms: number;
  created_at: string;
};

export function toNarrative(row: NarrativeRow): Narrative {
  return {
    id: row.id,
    sessionId: row.session_id,
    knowledgePack: row.knowledge_pack,
    knowledgePackVersion: row.knowledge_pack_version,
    headline: row.headline,
    summary: row.summary,
    mode: row.mode,
    provider: row.provider,
    model: row.model,
    tone: row.tone,
    audience: row.audience,
    confidence: Number(row.confidence),
    sections: row.sections ?? [],
    evidence: row.evidence,
    validation: row.validation,
    generationMs: row.generation_ms,
    createdAt: row.created_at,
  };
}

/** Replaces the narrative for a session; rows are never mutated in place. */
export async function replaceNarrative(
  sessionId: string,
  narrative: Narrative,
): Promise<Narrative> {
  const { error: deleteError } = await table().delete().eq("session_id", sessionId);
  if (deleteError) throw new Error(deleteError.message);

  const { data, error } = await table()
    .insert({
      session_id: sessionId,
      knowledge_pack: narrative.knowledgePack,
      knowledge_pack_version: narrative.knowledgePackVersion,
      headline: narrative.headline,
      summary: narrative.summary,
      mode: narrative.mode,
      provider: narrative.provider,
      model: narrative.model,
      tone: narrative.tone,
      audience: narrative.audience,
      confidence: narrative.confidence,
      sections: narrative.sections,
      evidence: narrative.evidence,
      validation: narrative.validation,
      generation_ms: narrative.generationMs,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return toNarrative(data as NarrativeRow);
}

export async function getNarrativeForSession(sessionId: string): Promise<Narrative | null> {
  const { data, error } = await table().select("*").eq("session_id", sessionId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toNarrative(data as NarrativeRow) : null;
}

export async function getNarrative(narrativeId: string): Promise<Narrative | null> {
  const { data, error } = await table().select("*").eq("id", narrativeId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toNarrative(data as NarrativeRow) : null;
}
