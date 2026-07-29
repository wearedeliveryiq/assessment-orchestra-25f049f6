/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ObservationSeverity } from "../observations/types";
import type { Score, ScoreBreakdown, ScoreSummaryEntity } from "./types";

/**
 * ScoreRepository
 *
 * Server-only persistence for Scores and the assessment score summary. Both are
 * immutable: rows are inserted by an engine run and only ever superseded
 * wholesale by a later run (the database rejects UPDATE, and a unique index on
 * (session_id, score_code) prevents duplicates).
 */
const sb = supabaseAdmin as unknown as { from: (table: string) => any };
const scoreTable = () => sb.from("assessment_scores");
const summaryTable = () => sb.from("assessment_score_summaries");

type ScoreRow = {
  id: string;
  session_id: string;
  knowledge_pack: string;
  knowledge_pack_version: string;
  score_code: string;
  dimension: string;
  overall_score: number | string;
  maximum_score: number | string;
  percentage: number | string;
  maturity_level: string;
  confidence: number | string;
  severity: ObservationSeverity;
  weight: number | string;
  supporting_pattern_ids: string[] | null;
  supporting_pattern_codes: string[] | null;
  calculation_reason: string;
  score_expression: string;
  breakdown: ScoreBreakdown;
  created_at: string;
};

type SummaryRow = {
  id: string;
  session_id: string;
  knowledge_pack: string;
  knowledge_pack_version: string;
  overall_score: number | string;
  maximum_score: number | string;
  percentage: number | string;
  maturity_level: string;
  confidence: number | string;
  dimension_count: number;
  pattern_count: number;
  breakdown: ScoreSummaryEntity["breakdown"];
  created_at: string;
};

export function toScore(row: ScoreRow): Score {
  return {
    id: row.id,
    sessionId: row.session_id,
    knowledgePack: row.knowledge_pack,
    knowledgePackVersion: row.knowledge_pack_version,
    scoreCode: row.score_code,
    dimension: row.dimension,
    overallScore: Number(row.overall_score),
    maximumScore: Number(row.maximum_score),
    percentage: Number(row.percentage),
    maturityLevel: row.maturity_level,
    confidence: Number(row.confidence),
    severity: row.severity,
    weight: Number(row.weight),
    supportingPatternIds: row.supporting_pattern_ids ?? [],
    supportingPatternCodes: row.supporting_pattern_codes ?? [],
    calculationReason: row.calculation_reason,
    scoreExpression: row.score_expression,
    breakdown: row.breakdown,
    createdAt: row.created_at,
  };
}

export function toSummary(row: SummaryRow): ScoreSummaryEntity {
  return {
    id: row.id,
    sessionId: row.session_id,
    knowledgePack: row.knowledge_pack,
    knowledgePackVersion: row.knowledge_pack_version,
    overallScore: Number(row.overall_score),
    maximumScore: Number(row.maximum_score),
    percentage: Number(row.percentage),
    maturityLevel: row.maturity_level,
    confidence: Number(row.confidence),
    dimensionCount: row.dimension_count,
    patternCount: row.pattern_count,
    breakdown: row.breakdown,
    createdAt: row.created_at,
  };
}

/** Replaces the score set for a session; individual rows are never mutated. */
export async function replaceScores(sessionId: string, scores: Score[]): Promise<Score[]> {
  const { error: deleteError } = await scoreTable().delete().eq("session_id", sessionId);
  if (deleteError) throw new Error(deleteError.message);
  if (scores.length === 0) return [];

  // Guard against duplicate codes reaching the unique index.
  const unique = new Map(scores.map((score) => [score.scoreCode, score]));

  const payload = [...unique.values()].map((score) => ({
    session_id: score.sessionId,
    knowledge_pack: score.knowledgePack,
    knowledge_pack_version: score.knowledgePackVersion,
    score_code: score.scoreCode,
    dimension: score.dimension,
    overall_score: score.overallScore,
    maximum_score: score.maximumScore,
    percentage: score.percentage,
    maturity_level: score.maturityLevel,
    confidence: score.confidence,
    severity: score.severity,
    weight: score.weight,
    supporting_pattern_ids: score.supportingPatternIds,
    supporting_pattern_codes: score.supportingPatternCodes,
    calculation_reason: score.calculationReason,
    score_expression: score.scoreExpression,
    breakdown: score.breakdown,
  }));

  const { data, error } = await scoreTable().insert(payload).select("*");
  if (error) throw new Error(error.message);
  return ((data ?? []) as ScoreRow[]).map(toScore).sort((a, b) =>
    a.scoreCode.localeCompare(b.scoreCode),
  );
}

/** Replaces the single overall summary row for a session. */
export async function replaceSummary(
  sessionId: string,
  summary: ScoreSummaryEntity,
): Promise<ScoreSummaryEntity> {
  const { error: deleteError } = await summaryTable().delete().eq("session_id", sessionId);
  if (deleteError) throw new Error(deleteError.message);

  const { data, error } = await summaryTable()
    .insert({
      session_id: summary.sessionId,
      knowledge_pack: summary.knowledgePack,
      knowledge_pack_version: summary.knowledgePackVersion,
      overall_score: summary.overallScore,
      maximum_score: summary.maximumScore,
      percentage: summary.percentage,
      maturity_level: summary.maturityLevel,
      confidence: summary.confidence,
      dimension_count: summary.dimensionCount,
      pattern_count: summary.patternCount,
      breakdown: summary.breakdown,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return toSummary(data as SummaryRow);
}

export async function listScores(sessionId: string): Promise<Score[]> {
  const { data, error } = await scoreTable()
    .select("*")
    .eq("session_id", sessionId)
    .order("score_code", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ScoreRow[]).map(toScore);
}

export async function getScore(scoreId: string): Promise<Score | null> {
  const { data, error } = await scoreTable().select("*").eq("id", scoreId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toScore(data as ScoreRow) : null;
}

export async function getSummary(sessionId: string): Promise<ScoreSummaryEntity | null> {
  const { data, error } = await summaryTable()
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSummary(data as SummaryRow) : null;
}
