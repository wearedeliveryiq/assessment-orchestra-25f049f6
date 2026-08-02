import {
  catalogueDigest,
  definitionIntentDigest,
  nextCatalogueState,
  validateCatalogueSnapshot,
} from "./catalogue";
import * as repository from "./repository.server";
import type { CatalogueCommand, CatalogueSnapshot, CatalogueVersionRecord } from "./types";

export class CatalogueServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface CatalogueRepository {
  createVersion(input: Record<string, unknown>): Promise<CatalogueVersionRecord>;
  getVersion(id: string): Promise<CatalogueVersionRecord | null>;
  getActiveVersion(environment?: string): Promise<CatalogueVersionRecord | null>;
  findByIdentity(catalogueId: string, version: string): Promise<CatalogueVersionRecord | null>;
  listDefinitionsByStableId(ids: string[]): Promise<Array<{ id: string; intentDigest: string }>>;
  transition(input: Record<string, unknown>): Promise<CatalogueVersionRecord>;
}

const defaultRepository: CatalogueRepository = repository;

export class RecommendationCatalogueService {
  constructor(private readonly repo: CatalogueRepository = defaultRepository) {}

  async createDraft(snapshotInput: unknown, actorId: string, idempotencyKey: string) {
    const snapshot = validateCatalogueSnapshot(snapshotInput);
    const digest = await catalogueDigest(snapshot);
    const existing = await this.repo.findByIdentity(snapshot.catalogueId, snapshot.version);
    if (existing) {
      if (existing.contentDigest !== digest)
        throw new CatalogueServiceError(
          "CATALOGUE_VERSION_INVALID",
          409,
          "This catalogue version already exists with different content.",
        );
      return { version: existing, reused: true };
    }
    const historical = await this.repo.listDefinitionsByStableId(
      snapshot.definitions.map((item) => item.id),
    );
    const historicalIntent = new Map(historical.map((item) => [item.id, item.intentDigest]));
    for (const definition of snapshot.definitions) {
      const intentDigest = await definitionIntentDigest(definition);
      const known = historicalIntent.get(definition.id);
      if (known && known !== intentDigest) {
        throw new CatalogueServiceError(
          "CATALOGUE_VERSION_INVALID",
          422,
          `Recommendation ID ${definition.id} cannot be reused for different intent.`,
        );
      }
    }
    const version = await this.repo.createVersion({
      catalogue_id: snapshot.catalogueId,
      version: snapshot.version,
      source_configuration_set_id: snapshot.sourceConfigurationSetId,
      content_digest: digest,
      snapshot,
      definition_intent_digests: Object.fromEntries(
        await Promise.all(
          snapshot.definitions.map(async (item) => [item.id, await definitionIntentDigest(item)]),
        ),
      ),
      authored_by: actorId,
      idempotency_key: idempotencyKey,
    });
    return { version, reused: false };
  }

  async command(id: string, command: CatalogueCommand, actorId: string, idempotencyKey: string) {
    const version = await this.repo.getVersion(id);
    if (!version)
      throw new CatalogueServiceError("CATALOGUE_NOT_FOUND", 404, "Catalogue not found.");
    if (command === "approve" && version.authoredBy === actorId) {
      throw new CatalogueServiceError(
        "CATALOGUE_SELF_APPROVAL_DENIED",
        403,
        "A catalogue author cannot be its sole approver.",
      );
    }
    try {
      nextCatalogueState(version.state, command);
    } catch {
      throw new CatalogueServiceError(
        "CATALOGUE_TRANSITION_INVALID",
        409,
        "Catalogue transition is not available.",
      );
    }
    return this.repo.transition({
      p_catalogue_version_id: id,
      p_command: command,
      p_actor_id: actorId,
      p_idempotency_key: idempotencyKey,
    });
  }

  async read(id?: string) {
    const version = id ? await this.repo.getVersion(id) : await this.repo.getActiveVersion();
    if (!version)
      throw new CatalogueServiceError("CATALOGUE_NOT_FOUND", 404, "Catalogue not found.");
    return version;
  }
}

export const recommendationCatalogueService = new RecommendationCatalogueService();
