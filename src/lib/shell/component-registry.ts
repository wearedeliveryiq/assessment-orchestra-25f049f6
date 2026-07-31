import type { ComponentType } from "react";

/**
 * ComponentRegistryService.
 *
 * Lets future modules contribute widgets (dashboard tiles, context panels,
 * empty-state illustrations) into shell slots without the shell importing them.
 * Registration is side-effect free and dedupes by id.
 */

export type SlotId = "context-panel" | "home-widget" | "top-bar-action" | "workspace-header-action";

export interface RegisteredComponent<P = Record<string, unknown>> {
  id: string;
  slot: SlotId;
  label: string;
  component: ComponentType<P>;
  /** Lower renders first. */
  order?: number;
  permission?: string;
  featureFlag?: string;
}

const registry = new Map<string, RegisteredComponent<any>>();

export function registerComponent<P>(entry: RegisteredComponent<P>): () => void {
  registry.set(entry.id, entry);
  return () => registry.delete(entry.id);
}

export function componentsForSlot(
  slot: SlotId,
  context: { permissions?: string[]; featureFlags?: Record<string, boolean> } = {},
): RegisteredComponent[] {
  return [...registry.values()]
    .filter((entry) => entry.slot === slot)
    .filter((entry) => !entry.permission || (context.permissions ?? []).includes(entry.permission))
    .filter((entry) => !entry.featureFlag || context.featureFlags?.[entry.featureFlag] === true)
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

export function clearComponentRegistry(): void {
  registry.clear();
}
