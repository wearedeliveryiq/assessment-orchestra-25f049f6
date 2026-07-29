import { QUESTIONNAIRE } from "../questionnaire";
import type { KnowledgePack } from "./contract.server";
import type { ObservationItem, SignalItem } from "../types";
import { artifact, type EngineService } from "./contract.server";
import { knowledgePackLoader } from "@/lib/knowledge-packs/loader.server";
import { signalEngine } from "@/lib/signals/engine.server";
import { listObservations } from "@/lib/observations/repository.server";
import { replaceSignals } from "@/lib/signals/repository.server";

/**
 * Signal stage of the reasoning pipeline.
 *
 * Organisational signals are inferred purely from persisted Observations using
 * the active Knowledge Pack, then persisted for the Rule Engine and the Signal
 * Explorer. The per-section view returned here keeps the existing downstream
 * stages (rules, patterns, scores) working unchanged.
 */
export const signalsEngine: EngineService<SignalItem[]> = {
  id: "signals",
  async run(context) {
    const pack = artifact<KnowledgePack>(context, "knowledge_pack");
    const observations = artifact<ObservationItem[]>(context, "observations");

    try {
      const packDocument = knowledgePackLoader.loadActive();
      const persistedObservations = await listObservations(context.session.id);
      const { signals, summary } = await signalEngine.run({
        session: context.session,
        observations: persistedObservations,
        pack: packDocument,
      });
      await replaceSignals(context.session.id, signals);
      if (summary.failed.length > 0) {
        console.error("[signals-stage] definitions failed", summary.failed);
      }
    } catch (error) {
      // Signal inference must not break the legacy scoring pipeline.
      console.error("[signals-stage] signal engine failed", error);
    }

    return QUESTIONNAIRE.map<SignalItem>((section) => {
      const items = observations.filter((o) => o.sectionId === section.id);
      const average = items.length
        ? items.reduce((sum, o) => sum + o.value, 0) / items.length
        : 0;
      const benchmark = pack.benchmark[section.id] ?? 3;
      const delta = average - benchmark;
      const magnitude = Math.abs(delta);
      return {
        id: `signal.${section.id}`,
        sectionId: section.id,
        direction: delta >= 0 ? "positive" : "negative",
        strength: magnitude >= 1 ? "strong" : magnitude >= 0.4 ? "moderate" : "weak",
        statement:
          delta >= 0
            ? `${section.title} is running ${magnitude.toFixed(1)} points above the sector benchmark.`
            : `${section.title} trails the sector benchmark by ${magnitude.toFixed(1)} points.`,
      };
    });
  },
};
