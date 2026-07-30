import type { NarrativeEvidence, NarrativeEvidenceRef } from "./types";

/**
 * EvidenceResolver
 *
 * Single responsibility: turn the raw assessment artefacts into (a) the token
 * dictionary the composer substitutes into templates and (b) the citation list
 * behind each section. Nothing may appear in a narrative that this resolver did
 * not derive from persisted evidence.
 */

const pct = (value: number) => `${Number(value ?? 0).toFixed(1)}`;

export class EvidenceResolver {
  /** Dimension scores ordered strongest first. */
  strongest(evidence: NarrativeEvidence) {
    return [...evidence.scores].sort((a, b) => b.percentage - a.percentage);
  }

  /** Dimension scores ordered weakest first. */
  weakest(evidence: NarrativeEvidence) {
    return [...evidence.scores].sort((a, b) => a.percentage - b.percentage);
  }

  /** Patterns ordered by confidence, then severity weight. */
  rankedPatterns(evidence: NarrativeEvidence) {
    const severityRank: Record<string, number> = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      info: 1,
    };
    return [...evidence.patterns].sort(
      (a, b) =>
        b.confidence - a.confidence ||
        (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0),
    );
  }

  /** Every substitutable token available to a section template or AI prompt. */
  tokens(evidence: NarrativeEvidence): Record<string, string> {
    const strongest = this.strongest(evidence)[0] ?? null;
    const weakest = this.weakest(evidence)[0] ?? null;
    const patterns = this.rankedPatterns(evidence);
    const summary = evidence.summary;

    const strengths = this.strongest(evidence)
      .filter((score) => score.percentage >= 60)
      .slice(0, 3);

    return {
      organisation: evidence.organisationName,
      packName: evidence.packName,
      packVersion: evidence.packVersion,
      overallScore: summary ? summary.overallScore.toFixed(1) : "0.0",
      overallPercentage: summary ? pct(summary.percentage) : "0.0",
      maturityLevel: summary?.maturityLevel ?? "Not scored",
      confidencePercentage: summary ? pct(summary.confidence * 100) : "0.0",
      dimensionCount: String(evidence.scores.length),
      patternCount: String(evidence.patterns.length),
      ruleCount: String(evidence.counts.rules),
      signalCount: String(evidence.counts.signals),
      observationCount: String(evidence.counts.observations),
      responseCount: String(evidence.counts.responses),
      strongestDimension: strongest?.dimension ?? "no scored dimension",
      strongestPercentage: strongest ? pct(strongest.percentage) : "0.0",
      strongestMaturity: strongest?.maturityLevel ?? "unrated",
      weakestDimension: weakest?.dimension ?? "no scored dimension",
      weakestPercentage: weakest ? pct(weakest.percentage) : "0.0",
      weakestMaturity: weakest?.maturityLevel ?? "unrated",
      leadPattern: patterns[0]?.name ?? "no dominant pattern",
      strengthList: strengths.length
        ? strengths
            .map(
              (score) =>
                `${score.dimension} holds at ${pct(score.percentage)}% (${score.maturityLevel}).`,
            )
            .join(" ")
        : "",
      findingList: patterns
        .slice(0, 4)
        .map(
          (pattern) =>
            `${pattern.name} is evidenced at ${pct(pattern.confidence * 100)}% confidence: ${pattern.description}`,
        )
        .join(" "),
      impactList: patterns
        .slice(0, 4)
        .map((pattern) => `${pattern.name}: ${pattern.businessImpact}`)
        .join(" "),
      recommendationList: evidence.recommendations
        .slice(0, 4)
        .map((rec, index) => `${index + 1}. ${rec.title} — ${rec.rationale}`)
        .join(" "),
    };
  }

  /** Citations for a section, limited to the evidence families it declares. */
  references(evidence: NarrativeEvidence, kinds: readonly string[]): NarrativeEvidenceRef[] {
    const refs: NarrativeEvidenceRef[] = [];

    if (kinds.includes("summary") && evidence.summary) {
      refs.push({
        kind: "summary",
        code: "SCR-OVERALL",
        entityId: evidence.summary.id,
        label: "Overall assessment score",
        detail: `${pct(evidence.summary.percentage)}% — ${evidence.summary.maturityLevel}`,
        confidence: evidence.summary.confidence,
      });
    }

    if (kinds.includes("scores") || kinds.includes("counts")) {
      for (const score of this.strongest(evidence)) {
        refs.push({
          kind: "score",
          code: score.scoreCode,
          entityId: score.id,
          label: score.dimension,
          detail: `${pct(score.percentage)}% — ${score.maturityLevel}`,
          confidence: score.confidence,
        });
      }
    }

    if (kinds.includes("patterns") || kinds.includes("recommendations")) {
      for (const pattern of this.rankedPatterns(evidence)) {
        refs.push({
          kind: "pattern",
          code: pattern.patternCode,
          entityId: pattern.id,
          label: pattern.name,
          detail: pattern.businessImpact,
          confidence: pattern.confidence,
        });
      }
    }

    return refs;
  }

  /** Compact, model-safe evidence brief for the AI prompt. */
  brief(evidence: NarrativeEvidence, kinds: readonly string[]): string {
    const lines: string[] = [`Organisation: ${evidence.organisationName}`];

    if (kinds.includes("summary") && evidence.summary) {
      lines.push(
        `Overall: ${pct(evidence.summary.percentage)}% (${evidence.summary.maturityLevel}), confidence ${pct(
          evidence.summary.confidence * 100,
        )}%.`,
      );
    }
    if (kinds.includes("counts")) {
      lines.push(
        `Evidence volume: ${evidence.counts.responses} responses, ${evidence.counts.observations} observations, ${evidence.counts.signals} signals, ${evidence.counts.rules} rule findings, ${evidence.counts.patterns} patterns.`,
      );
      lines.push(`Knowledge pack: ${evidence.packName} v${evidence.packVersion}.`);
    }
    if (kinds.includes("scores")) {
      lines.push("Dimension scores:");
      for (const score of this.strongest(evidence)) {
        lines.push(
          `- ${score.dimension} (${score.scoreCode}): ${pct(score.percentage)}%, ${score.maturityLevel}, weight ${score.weight}, confidence ${pct(score.confidence * 100)}%. ${score.calculationReason}`,
        );
      }
    }
    if (kinds.includes("patterns")) {
      lines.push("Detected patterns:");
      for (const pattern of this.rankedPatterns(evidence)) {
        lines.push(
          `- ${pattern.name} (${pattern.patternCode}), severity ${pattern.severity}, confidence ${pct(
            pattern.confidence * 100,
          )}%. ${pattern.description} Business impact: ${pattern.businessImpact}`,
        );
      }
    }
    if (kinds.includes("recommendations")) {
      lines.push("Candidate interventions:");
      for (const rec of evidence.recommendations) {
        lines.push(`- ${rec.title} — ${rec.rationale}`);
      }
    }

    return lines.join("\n");
  }
}

export const evidenceResolver = new EvidenceResolver();
