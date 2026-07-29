/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ObservationSeverity } from "../observations/types";
import type { Signal } from "./types";

/**
 * SignalRepository
 *
 * Server-only persistence for Signals. Signals are immutable: rows are only
 * ever inserted or removed as part of a full engine run, never updated in
 * place (the database also rejects UPDATE on this table).
 */
const sb = supabaseAdmin as unknown as { from: (table: string) => any };
const table = () => sb.from("assessment_signals");

type SignalRow = {
  id: string;
  session_id: string;
  knowledge_pack: string;
  knowledge_pack_version: string;
  signal_code: string;
  name: string;
  category: string;
  description: string;
  supporting_observation_ids: string[] | null;
  supporting_definition_ids: string[] | null;
  confidence: number | string;
  severity: ObservationSeverity;
  weight: number | string;
  rule_expression: string;
  created_at: string;
};

export function toSignal(row: SignalRow): Signal {
  return {
    id: row.id,
    sessionId: row.session_id,
    knowledgePack: row.knowledge_pack,
    knowledgePackVersion: row.knowledge_pack_version,
    signalCode: row.signal_code,
    name: row.name,
    category: row.category,
    description: row.description,
    supportingObservationIds: row.supporting_observation_ids ?? [],
    supportingDefinitionIds: row.supporting_definition_ids ?? [],
    confidence: Number(row.confidence),
    severity: row.severity,
    weight: Number(row.weight),
    ruleExpression: row.rule_expression,
    createdAt: row.created_at,
  };
}

/**
 * Replaces the signal set for a session. A rerun supersedes the previous run
 * as a whole; individual rows are never mutated. The unique
 * (session_id, signal_code) key is the final duplicate guard.
 */
export async function replaceSignals(sessionId: string, signals: Signal[]): Promise<Signal[]> {
  const { error: deleteError } = await table().delete().eq("session_id", sessionId);
  if (deleteError) throw new Error(deleteError.message);
  if (signals.length === 0) return [];

  const payload = signals.map((signal) => ({
    session_id: signal.sessionId,
    knowledge_pack: signal.knowledgePack,
    knowledge_pack_version: signal.knowledgePackVersion,
    signal_code: signal.signalCode,
    name: signal.name,
    category: signal.category,
    description: signal.description,
    supporting_observation_ids: signal.supportingObservationIds,
    supporting_definition_ids: signal.supportingDefinitionIds,
    confidence: signal.confidence,
    severity: signal.severity,
    weight: signal.weight,
    rule_expression: signal.ruleExpression,
  }));

  const { data, error } = await table().insert(payload).select();
  if (error) throw new Error(error.message);
  return (data as SignalRow[]).map(toSignal).sort((a, b) => a.signalCode.localeCompare(b.signalCode));
}

export async function listSignals(sessionId: string): Promise<Signal[]> {
  const { data, error } = await table()
    .select("*")
    .eq("session_id", sessionId)
    .order("signal_code");
  if (error) throw new Error(error.message);
  return (data as SignalRow[]).map(toSignal);
}

export async function getSignal(id: string): Promise<Signal | null> {
  const { data, error } = await table().select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSignal(data as SignalRow) : null;
}
