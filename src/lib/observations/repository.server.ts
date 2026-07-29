/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Observation, ObservationSeverity } from "./types";

/**
 * Observation repository. Server-only table access, mapped into the
 * strongly typed Observation domain model.
 */
const sb = supabaseAdmin as unknown as { from: (table: string) => any };
const table = () => sb.from("assessment_observations");

type ObservationRow = {
  id: string;
  session_id: string;
  knowledge_pack: string;
  knowledge_pack_version: string;
  definition_id: string;
  question_id: string;
  category: string;
  title: string;
  description: string;
  evidence: string;
  severity: ObservationSeverity;
  confidence: number | string;
  weight: number | string;
  source_value: number | string | null;
  source_label: string | null;
  rule_expression: string;
  created_at: string;
};

export function toObservation(row: ObservationRow): Observation {
  return {
    id: row.id,
    sessionId: row.session_id,
    knowledgePack: row.knowledge_pack,
    knowledgePackVersion: row.knowledge_pack_version,
    definitionId: row.definition_id,
    questionId: row.question_id,
    category: row.category,
    title: row.title,
    description: row.description,
    evidence: row.evidence,
    severity: row.severity,
    confidence: Number(row.confidence),
    weight: Number(row.weight),
    sourceValue: row.source_value,
    sourceLabel: row.source_label,
    ruleExpression: row.rule_expression,
    createdAt: row.created_at,
  };
}

/** Replaces the observation set for a session; the unique key prevents duplicates. */
export async function persistObservations(
  sessionId: string,
  observations: Observation[],
): Promise<Observation[]> {
  const { error: deleteError } = await table().delete().eq("session_id", sessionId);
  if (deleteError) throw new Error(deleteError.message);
  if (observations.length === 0) return [];

  const payload = observations.map((observation) => ({
    session_id: observation.sessionId,
    knowledge_pack: observation.knowledgePack,
    knowledge_pack_version: observation.knowledgePackVersion,
    definition_id: observation.definitionId,
    question_id: observation.questionId,
    category: observation.category,
    title: observation.title,
    description: observation.description,
    evidence: observation.evidence,
    severity: observation.severity,
    confidence: observation.confidence,
    weight: observation.weight,
    source_value: observation.sourceValue,
    source_label: observation.sourceLabel,
    rule_expression: observation.ruleExpression,
  }));

  const { data, error } = await table()
    .upsert(payload, { onConflict: "session_id,definition_id" })
    .select();
  if (error) throw new Error(error.message);
  return (data as ObservationRow[]).map(toObservation);
}

export async function listObservations(sessionId: string): Promise<Observation[]> {
  const { data, error } = await table()
    .select("*")
    .eq("session_id", sessionId)
    .order("category")
    .order("question_id")
    .order("definition_id");
  if (error) throw new Error(error.message);
  return (data as ObservationRow[]).map(toObservation);
}

export async function getObservation(id: string): Promise<Observation | null> {
  const { data, error } = await table().select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toObservation(data as ObservationRow) : null;
}
