/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Report file storage. Artefacts live in a private bucket and are only ever
 * served through the download endpoint, which re-checks assessment ownership
 * before streaming bytes.
 */
const BUCKET = "assessment-reports";

const bucket = () =>
  (supabaseAdmin as unknown as { storage: { from: (name: string) => any } }).storage.from(BUCKET);

export function storagePathFor(
  sessionId: string,
  reportId: string,
  filename: string,
): string {
  return `${sessionId}/${reportId}/${filename}`;
}

export async function uploadReport(
  path: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  const body = new Blob([bytes as unknown as BlobPart], { type: contentType });
  const { error } = await bucket().upload(path, body, {
    contentType,
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`Failed to store report file: ${error.message}`);
}

export async function downloadReport(path: string): Promise<Uint8Array> {
  const { data, error } = await bucket().download(path);
  if (error || !data) throw new Error(`Failed to read report file: ${error?.message ?? "missing"}`);
  return new Uint8Array(await (data as Blob).arrayBuffer());
}
