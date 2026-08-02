import { sprint03Configuration } from "./config";

export function mapKnowledgePacks(
  recommendationRanks: Record<string, number>,
  catalogue: Record<string, { status: string; entitled: boolean }>,
) {
  return sprint03Configuration.knowledgePacks
    .flatMap((pack) => {
      const ranks = pack.mapsFromRecommendations
        .map((id) => recommendationRanks[id])
        .filter((rank): rank is number => rank != null);
      const availability = catalogue[pack.id];
      if (ranks.length === 0 || availability?.status !== "active") return [];
      const cta = availability.entitled
        ? sprint03Configuration.knowledgePackPolicy.activeEntitledCta
        : sprint03Configuration.knowledgePackPolicy.activeNotEntitledCta;
      return [
        {
          id: pack.id,
          rank: Math.min(...ranks),
          cta,
          copy: sprint03Configuration.knowledgePackPolicy.copyTemplate
            .replace("{name}", pack.name)
            .replace("{diagnosticValue}", pack.diagnosticValue),
          order: pack.order,
        },
      ];
    })
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .map(({ order: _order, ...item }) => item);
}

export function mapTeamMates(input: {
  acceptedRecommendations: string[];
  authenticated: boolean;
  permission: string;
  catalogue: Record<string, { available: boolean; entitled: boolean }>;
}) {
  if (!input.authenticated) return [];
  return sprint03Configuration.teamMates.flatMap((teamMate) => {
    if (!teamMate.mapsFromRecommendations.some((id) => input.acceptedRecommendations.includes(id)))
      return [];
    const availability = input.catalogue[teamMate.id];
    if (!availability?.available) return [];
    const cta =
      availability.entitled && input.permission === "teammate.activate"
        ? sprint03Configuration.teamMatePolicy.availableEntitledCta
        : sprint03Configuration.teamMatePolicy.availableNotEntitledCta;
    return [
      {
        id: teamMate.id,
        cta,
        copy: sprint03Configuration.teamMatePolicy.copyTemplate
          .replace("{name}", teamMate.name)
          .replace("{supportedOutcome}", teamMate.supportedOutcome),
      },
    ];
  });
}
