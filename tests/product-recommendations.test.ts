import { describe, expect, it } from "vitest";
import { mapKnowledgePacks, mapTeamMates } from "@/lib/delivery-intelligence/mappings";

describe("governed product recommendations", () => {
  it("denies disclosure when availability is not configured", () => {
    expect(mapKnowledgePacks({ "REC-001": 1 }, {})).toEqual([]);
    expect(
      mapTeamMates({
        acceptedRecommendations: ["REC-001"],
        authenticated: true,
        permission: "teammate.activate",
        catalogue: {},
      }),
    ).toEqual([]);
  });

  it("never recommends a TeamMate before its mapped recommendation is accepted", () => {
    expect(
      mapTeamMates({
        acceptedRecommendations: [],
        authenticated: true,
        permission: "teammate.activate",
        catalogue: { executive_teammate: { available: true, entitled: true } },
      }),
    ).toEqual([]);
  });
});
