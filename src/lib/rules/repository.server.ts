/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ObservationSeverity } from "../observations/types";
import type { RuleResult, RuleStatus } from "./types";

/**
 * RuleRepository
 *
 * Server-only persistence for RuleResults. Results are immutable: rows are
 * inserted by an engine run and only ever superseded wholesale by a later run
 * (the database rejects UPDATE on this table).
 */
const sb = supabaseAdmin as unknown as { from: (table: string) => any };
const table = () => sb.from("assessment_rule_results");

type RuleRow = {
  id: string;
  session_id: string;
  knowledge_pack: string;
  knowledge_pack_version: string;
  rule_code: string;
  name: string;
  description: string;
  category: string;
  status: RuleStatus;
  confidence: number | string;
  severity: ObservationSeverity;
  supporting_signal_ids: string[] | null;
  supporting_signal_codes: string[] | null;
  evaluation_reason: string;
  rule_expression: string;
  weight: number | string;
  executed_at: string;
};

export function toRuleResult(row: RuleRow): RuleResult {
  return {
    id: row.id,
    sessionId: row.session_id,
    knowledgePack: row.knowledge_pack,
    knowledgePackVersion: row.knowledge_pack_version,
    ruleCode: row.rule_code,
    name: row.name,
    description: row.description,
    category: row.category,
    status: row.status,
    confidence: Number(row.confidence),
    severity: row.severity,
    supportingSignalIds: row.supporting_signal_ids ?? [],
    supportingSignalCodes: row.supporting_signal_codes ?? [],
    evaluationReason: row.evaluation_reason,
    ruleExpression: row.rule_expression,
    weight: Number(row.weight),
    executedAt: row.executed_at,
  };
}

/** Replaces the rule result set for a session; individual rows are never mutated. */
export async function replaceRuleResults(
  sessionId: string,
  results: RuleResult[],
): Promise<RuleResult[]> {
  const { error: deleteError } = await table().delete().eq("session_id", sessionId);
  if (deleteError) throw new Error(deleteError.message);
  if (results.length === 0) return [];

  const payload = results.map((result) => ({
    session_id: result.sessionId,
    knowledge_pack: result.knowledgePack,
    knowledge_pack_version: result.knowledgePackVersion,
    rule_code: result.ruleCode,
    name: result.name,
    description: result.description,
    category: result.category,
    status: result.status,
    confidence: result.confidence,
    severity: result.severity,
    supporting_signal_ids: result.supportingSignalIds,
    supporting_signal_codes: result.supportingSignalCodes,
    evaluation_reason: result.evaluationReason,
    rule_expression: result.ruleExpression,
    weight: result.weight,
    executed_at: result.executedAt,
  }));

  const { data, error } = await table().insert(payload).select();
  if (error) throw new Error(error.message);
  return (data as RuleRow[]).map(toRuleResult).sort((a, b) => a.ruleCode.localeCompare(b.ruleCode));
}

export async function listRuleResults(sessionId: string): Promise<RuleResult[]> {
  const { data, error } = await table().select("*").eq("session_id", sessionId).order("rule_code");
  if (error) throw new Error(error.message);
  return (data as RuleRow[]).map(toRuleResult);
}

export async function getRuleResult(id: string): Promise<RuleResult | null> {
  const { data, error } = await table().select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toRuleResult(data as RuleRow) : null;
}
