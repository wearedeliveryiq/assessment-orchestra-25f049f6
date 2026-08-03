/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineTask } from "nitro/task";

import { supabaseAdmin } from "../../src/integrations/supabase/client.server";

export default defineTask({
  meta: {
    name: "delivery-dna-snapshot:cleanup",
    description: "Delete expired unlinked Delivery DNA Snapshot responses",
  },
  async run() {
    const admin = supabaseAdmin as any;
    const { data, error } = await admin.rpc("cleanup_expired_delivery_dna_snapshots", {
      p_limit: 200,
    });
    if (error) throw new Error("Snapshot cleanup failed");
    return { result: { deleted: Number(data ?? 0) } };
  },
});
