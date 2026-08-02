import { defineTask } from "nitro/task";

import { analysisHandoffService } from "../../src/lib/analysis/handoff-service.server";

export default defineTask({
  meta: {
    name: "analysis:reconcile",
    description: "Reconcile completed assessments awaiting analysis",
  },
  async run() {
    const result = await analysisHandoffService.reconcile(100);
    return { result };
  },
});
