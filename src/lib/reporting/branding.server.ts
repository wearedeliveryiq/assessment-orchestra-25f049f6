/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DEFAULT_BRANDING, resolveBranding } from "./branding";
import { ReportingError } from "./errors";
import type { ReportBranding } from "./types";

/**
 * BrandingService (server half): resolves the organisation's branding profile,
 * merged over the platform defaults. Resolved branding is snapshotted onto each
 * report so historical versions keep the branding they were generated with.
 */

const sb = supabaseAdmin as unknown as { from: (table: string) => any };
const table = () => sb.from("platform_branding_profiles");

function fromRow(row: Record<string, any> | null): Partial<ReportBranding> {
  if (!row) return {};
  return {
    productName: row.product_name,
    logoText: row.logo_text,
    logoUrl: row.logo_url,
    primaryColour: row.primary_colour,
    secondaryColour: row.secondary_colour,
    inkColour: row.ink_colour,
    mutedColour: row.muted_colour,
    surfaceColour: row.surface_colour,
    headingFont: row.heading_font,
    bodyFont: row.body_font,
    headerText: row.header_text,
    footerText: row.footer_text,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    website: row.website,
    confidentialityStatement: row.confidentiality_statement,
  };
}

function toRow(input: Partial<ReportBranding>): Record<string, unknown> {
  const branding = resolveBranding(input);
  return {
    product_name: branding.productName,
    logo_text: branding.logoText,
    logo_url: branding.logoUrl,
    primary_colour: branding.primaryColour,
    secondary_colour: branding.secondaryColour,
    ink_colour: branding.inkColour,
    muted_colour: branding.mutedColour,
    surface_colour: branding.surfaceColour,
    heading_font: branding.headingFont,
    body_font: branding.bodyFont,
    header_text: branding.headerText,
    footer_text: branding.footerText,
    contact_name: branding.contactName,
    contact_email: branding.contactEmail,
    contact_phone: branding.contactPhone,
    website: branding.website,
    confidentiality_statement: branding.confidentialityStatement,
  };
}

export async function loadBranding(organisationId: string): Promise<ReportBranding> {
  const { data, error } = await table()
    .select("*")
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error) {
    console.error("[reporting] branding lookup failed", error.message);
    return DEFAULT_BRANDING;
  }
  return resolveBranding(fromRow(data));
}

export async function saveBranding(
  organisationId: string,
  input: Partial<ReportBranding>,
  actorId: string | null,
): Promise<ReportBranding> {
  const { data, error } = await table()
    .upsert(
      {
        organisation_id: organisationId,
        ...toRow(input),
        updated_at: new Date().toISOString(),
        updated_by: actorId,
      },
      { onConflict: "organisation_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new ReportingError("storage_failed", "Could not save the branding profile.", 500, error?.message);
  }
  return resolveBranding(fromRow(data));
}
