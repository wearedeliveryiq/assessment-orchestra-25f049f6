import * as assessmentRepo from "../assessment/repository.server";
import { knowledgePackLoader, KnowledgePackError } from "../knowledge-packs/loader.server";
import * as observationRepo from "../observations/repository.server";
import * as patternRepo from "../patterns/repository.server";
import * as ruleRepo from "../rules/repository.server";
import * as scoreRepo from "../scores/repository.server";
import { runScores } from "../scores/service.server";
import * as signalRepo from "../signals/repository.server";
import { narrativeEngine } from "./engine.server";
import * as repo from "./repository.server";
import { narrativeTemplateLoader } from "./template-loader.server";
import type { Narrative, NarrativeEvidence, NarrativeRunSummary, NarrativeTrace } from "./types";

/**
 * NarrativeExecutionService
 *
 * Single responsibility: orchestrate a Narrative Engine run — resolve the
 * session, load the Knowledge Pack, gather the evidence produced by earlier
 * pipeline stages (re-running scoring when nothing is persisted), persist the
 * narrative, and expose read + traceability APIs.
 */
export class NarrativeServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "NarrativeServiceError";
  }
}

async function requireSession(sessionId: string, ownerKey: string) {
  const session = await assessmentRepo.getSession(sessionId, ownerKey);
  if (!session) throw new NarrativeServiceError("Assessment not found", 404);
  return session;
}

function loadPack(packId?: string, packVersion?: string) {
  try {
    return packId
      ? knowledgePackLoader.load(packId, packVersion)
      : knowledgePackLoader.loadActive();
  } catch (error) {
    const message =
      error instanceof KnowledgePackError
        ? error.message
        : "Knowledge pack narrative configuration could not be loaded";
    console.error("[narrative-service] knowledge pack load failed", error);
    throw new NarrativeServiceError(message, 503);
  }
}

/** Candidate interventions derived from the pack's recommendation triggers. */
function recommendationsFor(
  pack: ReturnType<typeof loadPack>,
  patternCodes: string[],
  weakestDimension: string | null,
): NarrativeEvidence["recommendations"] {
  const declared = (pack.recommendations.recommendations ?? []) as Record<string, unknown>[];
  const matched = declared
    .filter((rec) => {
      const trigger = String(rec.trigger ?? "");
      return trigger.length > 0 && patternCodes.some((code) => trigger.includes(code));
    })
    .map((rec) => ({
      code: String(rec.id ?? rec.trigger ?? "rec"),
      title: String(rec.title ?? ""),
      rationale: String(rec.rationale ?? ""),
    }))
    .filter((rec) => rec.title.length > 0);

  if (matched.length > 0) return matched;

  // No declarative trigger matched: fall back to pattern-derived interventions,
  // which are still evidence-bound because they quote the pattern itself.
  return weakestDimension
    ? [
        {
          code: "rec.weakest-dimension",
          title: `Establish named executive ownership for ${weakestDimension}`,
          rationale: `${weakestDimension} is the lowest scoring dimension in this assessment.`,
        },
      ]
    : [];
}

export async function runNarrative(
  sessionId: string,
  ownerKey: string,
  options: { packId?: string; packVersion?: string; regenerateScores?: boolean } = {},
): Promise<{ narrative: Narrative; run: NarrativeRunSummary }> {
  const session = await requireSession(sessionId, ownerKey);
  const pack = loadPack(options.packId, options.packVersion);

  if (!narrativeTemplateLoader.config(pack).sections.length) {
    throw new NarrativeServiceError(
      `Knowledge pack "${pack.manifest.id}" declares no narrative sections`,
      503,
    );
  }

  if (options.regenerateScores) {
    await runScores(sessionId, ownerKey, options);
  }

  let scores = await scoreRepo.listScores(sessionId);
  let summary = await scoreRepo.getSummary(sessionId);
  if (scores.length === 0) {
    const result = await runScores(sessionId, ownerKey, options);
    scores = result.scores;
    summary = result.summary;
  }

  const [patterns, rules, signals, observations, responses] = await Promise.all([
    patternRepo.listPatterns(sessionId),
    ruleRepo.listRuleResults(sessionId),
    signalRepo.listSignals(sessionId),
    observationRepo.listObservations(sessionId),
    assessmentRepo.getResponses(sessionId),
  ]);

  const weakest = [...scores].sort((a, b) => a.percentage - b.percentage)[0] ?? null;

  const evidence: NarrativeEvidence = {
    organisationName: session.organisationName,
    packId: pack.manifest.id,
    packName: pack.manifest.name,
    packVersion: pack.manifest.version,
    summary,
    scores,
    patterns,
    rules,
    signals,
    counts: {
      responses: responses.length,
      observations: observations.length,
      signals: signals.length,
      rules: rules.length,
      patterns: patterns.length,
    },
    recommendations: recommendationsFor(
      pack,
      patterns.map((pattern) => pattern.patternCode),
      weakest?.dimension ?? null,
    ),
  };

  const { narrative, runSummary } = await narrativeEngine.run({ session, pack, evidence });
  const persisted = await repo.replaceNarrative(sessionId, narrative);

  console.info("[narrative-service] run complete", {
    sessionId,
    mode: runSummary.mode,
    provider: runSummary.provider,
    aiSections: runSummary.aiSections,
    fallbacks: runSummary.fallbacks.length,
    durationMs: runSummary.durationMs,
  });

  return { narrative: persisted, run: runSummary };
}

export async function getNarrativeForAssessment(
  sessionId: string,
  ownerKey: string,
): Promise<{ sessionId: string; narrative: Narrative | null }> {
  await requireSession(sessionId, ownerKey);
  return { sessionId, narrative: await repo.getNarrativeForSession(sessionId) };
}

/**
 * Narrative -> Sections -> Scores -> Patterns -> Rules -> Signals ->
 * Observations -> Questions -> Responses.
 */
export async function getNarrativeTrace(
  narrativeId: string,
  ownerKey: string,
): Promise<NarrativeTrace> {
  const narrative = await repo.getNarrative(narrativeId);
  if (!narrative) throw new NarrativeServiceError("Narrative not found", 404);

  const session = await assessmentRepo.getSession(narrative.sessionId, ownerKey);
  if (!session) throw new NarrativeServiceError("Narrative not found", 404);

  const pack = loadPack(narrative.knowledgePack);
  const config = narrativeTemplateLoader.config(pack);

  const [scores, patterns, rules, signals, observations, responses] = await Promise.all([
    scoreRepo.listScores(narrative.sessionId),
    patternRepo.listPatterns(narrative.sessionId),
    ruleRepo.listRuleResults(narrative.sessionId),
    signalRepo.listSignals(narrative.sessionId),
    observationRepo.listObservations(narrative.sessionId),
    assessmentRepo.getResponses(narrative.sessionId),
  ]);

  const chainForScore = (scoreCode: string) => {
    const score = scores.find((candidate) => candidate.scoreCode === scoreCode);
    if (!score) return null;
    return {
      score,
      patterns: patterns
        .filter(
          (pattern) =>
            score.supportingPatternIds.includes(pattern.id) ||
            score.supportingPatternCodes.includes(pattern.patternCode),
        )
        .map((pattern) => ({
          pattern,
          rules: rules
            .filter(
              (rule) =>
                pattern.supportingRuleIds.includes(rule.id) ||
                pattern.supportingRuleCodes.includes(rule.ruleCode),
            )
            .map((rule) => ({
              rule,
              signals: signals
                .filter(
                  (signal) =>
                    rule.supportingSignalIds.includes(signal.id) ||
                    rule.supportingSignalCodes.includes(signal.signalCode),
                )
                .map((signal) => ({
                  signal,
                  observations: observations
                    .filter(
                      (observation) =>
                        signal.supportingObservationIds.includes(observation.id) ||
                        signal.supportingDefinitionIds.includes(observation.definitionId),
                    )
                    .map((observation) => {
                      const question =
                        pack.questions.questions.find((q) => q.id === observation.questionId) ??
                        null;
                      const response =
                        responses.find((r) => r.questionId === observation.questionId) ?? null;
                      return {
                        observationId: observation.id,
                        definitionId: observation.definitionId,
                        title: observation.title,
                        evidence: observation.evidence,
                        severity: observation.severity,
                        confidence: observation.confidence,
                        question: question
                          ? {
                              id: question.id,
                              sectionId: question.sectionId,
                              prompt: question.prompt,
                            }
                          : null,
                        answer: {
                          value: (response?.value ?? null) as number | string | null,
                          label: observation.sourceLabel,
                          answeredAt: response?.answeredAt ?? null,
                        },
                      };
                    }),
                })),
            })),
        })),
    };
  };

  return {
    narrative,
    assessment: {
      id: session.id,
      organisationName: session.organisationName,
      status: session.status,
    },
    sections: narrative.sections.map((section) => ({
      section,
      scores: section.evidence
        .filter((ref) => ref.kind === "score")
        .map((ref) => chainForScore(ref.code))
        .filter((chain): chain is NonNullable<typeof chain> => chain !== null),
    })),
    knowledgePackNarrative: {
      packId: narrative.knowledgePack,
      packVersion: narrative.knowledgePackVersion,
      mode: narrative.mode,
      provider: narrative.provider,
      model: narrative.model,
      sections: config.sections.map((definition) => ({
        key: definition.key,
        title: definition.title,
        template: definition.template,
        guidance: definition.guidance,
      })),
    },
  };
}
