import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AssessmentResponse, AssessmentSession } from "@/lib/assessment/types";
import type { Observation } from "@/lib/observations/types";

/**
 * Integration coverage: Assessment -> Observation Engine -> persistence.
 * The database boundary is stubbed; everything above it is the real code path,
 * including knowledge pack loading, evaluation and traceability assembly.
 */

const session: AssessmentSession = {
  id: "22222222-2222-2222-2222-222222222222",
  organisationName: "Northwind Logistics",
  contactName: null,
  assessmentType: "delivery-maturity",
  status: "completed",
  currentSection: null,
  progress: 100,
  metadata: {},
  failureReason: null,
  submittedAt: null,
  completedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const responses: AssessmentResponse[] = [
  { questionId: "flow.wip", sectionId: "flow", value: 1, score: 1, notes: null, answeredAt: "2026-01-01T00:00:00.000Z" },
  { questionId: "eng.deploy", sectionId: "engineering", value: 5, score: 5, notes: null, answeredAt: "2026-01-01T00:00:00.000Z" },
];

const store = { rows: [] as Observation[] };

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));

vi.mock("@/lib/assessment/repository.server", () => ({
  getSession: vi.fn(async (id: string, ownerKey: string) =>
    id === session.id && ownerKey === "owner-key-123" ? session : null,
  ),
  getResponses: vi.fn(async () => responses),
}));

vi.mock("@/lib/observations/repository.server", () => ({
  persistObservations: vi.fn(async (_sessionId: string, observations: Observation[]) => {
    store.rows = observations.map((observation, index) => ({
      ...observation,
      id: `row-${index}`,
    }));
    return store.rows;
  }),
  listObservations: vi.fn(async (sessionId: string) =>
    store.rows.filter((row) => row.sessionId === sessionId),
  ),
  getObservation: vi.fn(async (id: string) => store.rows.find((row) => row.id === id) ?? null),
}));

const service = await import("@/lib/observations/service.server");

beforeEach(() => {
  store.rows = [];
});

describe("assessment -> observation engine integration", () => {
  it("runs, persists and returns the observation collection", async () => {
    const { observations, summary } = await service.runObservations(session.id, "owner-key-123");

    expect(summary.knowledgePack).toBe("executive-sponsorship");
    expect(summary.generated).toBe(observations.length);
    expect(observations.length).toBeGreaterThan(0);
    expect(observations.every((o) => o.id.startsWith("row-"))).toBe(true);
    expect(observations.map((o) => o.definitionId)).toContain("obs.flow_wip.deficit");
    expect(observations.map((o) => o.definitionId)).toContain("obs.eng_deploy.strength");
  });

  it("rejects an assessment the caller does not own", async () => {
    await expect(service.runObservations(session.id, "someone-else")).rejects.toThrow(
      "Assessment not found",
    );
  });

  it("stops with a clear error when the knowledge pack cannot be loaded", async () => {
    await expect(
      service.runObservations(session.id, "owner-key-123", { packId: "does-not-exist" }),
    ).rejects.toThrow(/was not found/);
  });

  it("lists persisted observations for the assessment", async () => {
    await service.runObservations(session.id, "owner-key-123");
    const listed = await service.listObservations(session.id, "owner-key-123");
    expect(listed.observations.length).toBe(store.rows.length);
  });

  it("returns the complete traceability chain for one observation", async () => {
    await service.runObservations(session.id, "owner-key-123");
    const target = store.rows.find((row) => row.definitionId === "obs.flow_wip.deficit")!;
    const trace = await service.getObservationTrace(target.id, "owner-key-123");

    expect(trace.assessment.organisationName).toBe("Northwind Logistics");
    expect(trace.question?.id).toBe("flow.wip");
    expect(trace.answer.value).toBe(1);
    expect(trace.answer.label).toBe("Absent");
    expect(trace.knowledgePackRule.packVersion).toBe(knowledgePackLoader.loadActive().manifest.version);
    expect(trace.knowledgePackRule.expression).toContain("value lte 2");
  });
});
