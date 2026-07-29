import type { MaturityBand } from "../knowledge-packs/schema";

export type { MaturityBand };
import type { ObservationSeverity } from "../observations/types";

/**
 * MaturityCalculator
 *
 * Single responsibility: map a percentage onto the maturity band declared by
 * the active Knowledge Pack. The engine makes no assumption about the number,
 * naming or ordering of bands — a pack may declare two bands or twelve.
 */
export interface MaturityResult {
  level: string;
  severity: ObservationSeverity;
  band: MaturityBand | null;
}

const FALLBACK: MaturityResult = { level: "Unclassified", severity: "info", band: null };

export class MaturityCalculator {
  /**
   * Resolves the band whose [min, max] window contains `percentage`. Bands are
   * evaluated highest-first so overlapping windows resolve deterministically
   * to the most favourable qualifying band.
   */
  calculate(percentage: number, bands: MaturityBand[]): MaturityResult {
    if (!bands || bands.length === 0) return FALLBACK;

    const value = Number.isFinite(percentage) ? percentage : 0;
    const ordered = [...bands].sort((a, b) => b.min - a.min || b.max - a.max);

    const match = ordered.find((band) => value >= band.min && value <= band.max);
    if (match) return { level: match.name, severity: match.severity, band: match };

    // Out of range (a pack with gaps): clamp to the nearest band.
    const lowest = ordered[ordered.length - 1];
    const highest = ordered[0];
    const nearest = value < lowest.min ? lowest : highest;
    return { level: nearest.name, severity: nearest.severity, band: nearest };
  }

  /** Bands for a dimension, falling back to the pack-wide defaults. */
  resolveBands(
    definitionBands: MaturityBand[] | undefined,
    defaultBands: MaturityBand[],
  ): MaturityBand[] {
    return definitionBands && definitionBands.length > 0 ? definitionBands : defaultBands;
  }
}

export const maturityCalculator = new MaturityCalculator();
