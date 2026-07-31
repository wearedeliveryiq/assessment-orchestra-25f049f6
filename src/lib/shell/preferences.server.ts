import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { DEFAULT_PREFERENCES, normalisePreferences } from "./preferences";
import type { UserPreferences } from "./types";

/**
 * UserPreferencesService (persistence side).
 *
 * One row per user in `user_preferences`. Reads never fail the shell: if the
 * row is missing or the query errors, defaults are returned so the app renders.
 */

const db = () => supabaseAdmin as unknown as any;

type Row = Record<string, any>;

function toPreferences(row: Row | null | undefined): UserPreferences {
  if (!row) return DEFAULT_PREFERENCES;
  return normalisePreferences({
    theme: row.theme,
    language: row.language,
    timezone: row.timezone,
    dateFormat: row.date_format,
    numberFormat: row.number_format,
    density: row.density,
    reducedMotion: row.reduced_motion,
    highContrast: row.high_contrast,
    sidebarCollapsed: row.sidebar_collapsed,
    favouriteModules: row.favourite_modules,
    defaultWorkspaceId: row.default_workspace_id,
    landingPage: row.landing_page,
  });
}

function toRow(userId: string, preferences: UserPreferences): Row {
  return {
    user_id: userId,
    theme: preferences.theme,
    language: preferences.language,
    timezone: preferences.timezone,
    date_format: preferences.dateFormat,
    number_format: preferences.numberFormat,
    density: preferences.density,
    reduced_motion: preferences.reducedMotion,
    high_contrast: preferences.highContrast,
    sidebar_collapsed: preferences.sidebarCollapsed,
    favourite_modules: preferences.favouriteModules,
    default_workspace_id: preferences.defaultWorkspaceId,
    landing_page: preferences.landingPage,
    updated_at: new Date().toISOString(),
  };
}

export async function getPreferences(userId: string): Promise<UserPreferences> {
  const { data, error } = await db()
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[shell-preferences] read failed", error);
    return DEFAULT_PREFERENCES;
  }
  return toPreferences(data);
}

/** Patch semantics: unknown keys are ignored, invalid values fall back. */
export async function updatePreferences(
  userId: string,
  patch: Partial<UserPreferences> | Record<string, unknown>,
): Promise<UserPreferences> {
  const current = await getPreferences(userId);
  const next = normalisePreferences({ ...current, ...(patch as object) }, current);

  const { error } = await db()
    .from("user_preferences")
    .upsert(toRow(userId, next), { onConflict: "user_id" });

  if (error) {
    console.error("[shell-preferences] write failed", error);
    throw new Error("preferences_write_failed");
  }
  return next;
}

export async function resetPreferences(userId: string): Promise<UserPreferences> {
  return updatePreferences(userId, DEFAULT_PREFERENCES);
}
