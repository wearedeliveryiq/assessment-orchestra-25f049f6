/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ObservationSeverity } from "../observations/types";
import type { Pattern } from "./types";

/**
 * PatternRepository
 *
 * Server-only persistence for Patterns. Patterns are immutable: rows are
 * inserted by an engine run and only ever superseded wholesale by a later run
 * (the database rejects UPDATE on this table, and a unique index on
 * (session_id, pattern_code) prevents duplicates).
 */
const sb = supabaseAdmin as unknown as { from: (table: string) => any };
const table = () => sb.from("assessment_patterns");

type PatternRow = {
  id: string;
  session_id: string;
  knowledge_pack: string;
  knowledge_pack_version: string;
  pattern_code: string;
  name: string;
  category: string;
  description: string;
  business_impact: string;
  confidence: number | string;
  severity: ObservationSeverity;
  weight: number | string;
  supporting_rule_ids: string[] | null;
  supporting_rule_codes: string[] | null;
  pattern_expression: string;
  evaluation_reason: string;
  created_at: string;
};

export function toPattern(row: PatternRow): Pattern {
  return {
    id: row.id,
    sessionId: row.session_id,
    knowledgePack: row.knowledge_pack,
    knowledgePackVersion: row.knowledge_pack_version,
    patternCode: row.pattern_code,
    name: row.name,
    category: row.category,
    description: row.description,
    businessImpact: row.business_impact,
    confidence: Number(row.confidence),
    severity: row.severity,
    weight: Number(row.weight),
    supportingRuleIds: row.supporting_rule_ids ?? [],
    supportingRuleCodes: row.supporting_rule_codes ?? [],
    patternExpression: row.pattern_expression,
    evaluationReason: row.evaluation_reason,
    createdAt: row.created_at,
  };
}

/** Replaces the pattern set for a session; individual rows are never mutated. */
export async function replacePatterns(
  sessionId: string,
  patterns: Pattern[],
): Promise<Pattern[]> {
  const { error: deleteError } = await table().delete().eq("session_id", sessionId);
  if (deleteError) throw new Error(deleteError.message);
  if (patterns.length === 0) return [];

  // Guard against duplicate codes reaching the unique index.
  const unique = new Map(patterns.map((pattern) => [pattern.patternCode, pattern]));

  const payload = [...unique.values()].map((pattern) => ({
    session_id: pattern.sessionId,
    knowledge_pack: pattern.knowledgePack,
    knowledge_pack_version: pattern.knowledgePackVersion,
    pattern_code: pattern.patternCode,
    name: pattern.name,
    category: pattern.category,
    description: pattern.description,
    business_impact: pattern.businessImpact,
    confidence: pattern.confidence,
    severity: pattern.severity,
    weight: pattern.weight,
    supporting_rule_ids: pattern.supportingRuleIds,
    supporting_rule_codes: pattern.supportingRuleCodes,
    pattern_expression: pattern.patternExpression,
    evaluation_reason: pattern.evaluationReason,
    created_at: pattern.createdAt,
  }));

  const { data, error } = await table().insert(payload).select();
  if (error) throw new Error(error.message);
  return (data as PatternRow[])
    .map(toPattern)
    .sort((a, b) => a.patternCode.localeCompare(b.patternCode));
}

export async function listPatterns(sessionId: string): Promise<Pattern[]> {
  const { data, error } = await table()
    .select("*")
    .eq("session_id", sessionId)
    .order("pattern_code");
  if (error) throw new Error(error.message);
  return (data as PatternRow[]).map(toPattern);
}

export async function getPattern(id: string): Promise<Pattern | null> {
  const { data, error } = await table().select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toPattern(data as PatternRow) : null;
}
