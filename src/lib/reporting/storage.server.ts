/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ReportingError } from "./errors";

/**
 * Report artefact storage. Files live in a private bucket and are only ever
 * streamed through the download endpoint, which re-checks organisation
 * membership before returning bytes.
 */

const BUCKET = "platform-reports";

const bucket = () =>
  (supabaseAdmin as unknown as { storage: { from: (name: string) => any } }).storage.from(BUCKET);

export function storagePathFor(organisationId: string, reportId: string, filename: string): string {
  return `${organisationId}/${reportId}/${filename}`;
}

export async function uploadArtefact(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const body = new Blob([bytes as unknown as BlobPart], { type: contentType });
  const { error } = await bucket().upload(path, body, {
    contentType,
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) {
    throw new ReportingError("storage_failed", "Could not store the generated report.", 500, error.message);
  }
}

export async function downloadArtefact(path: string): Promise<Uint8Array> {
  const { data, error } = await bucket().download(path);
  if (error || !data) {
    throw new ReportingError("not_found", "The report file is no longer available.", 404, error?.message);
  }
  return new Uint8Array(await (data as Blob).arrayBuffer());
}

export async function removeArtefact(path: string): Promise<void> {
  const { error } = await bucket().remove([path]);
  if (error) console.error("[reporting] failed to remove artefact", error.message);
}
