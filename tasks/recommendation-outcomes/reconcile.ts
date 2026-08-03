import { defineTask } from "nitro/task";

import { recommendationOutcomeService } from "../../src/lib/recommendation-outcomes/service.server";

export default defineTask({
  meta: {
    name: "recommendation-outcomes:reconcile",
    description: "Reconcile time-based recommendation outcome status transitions",
  },
  async run() {
    const result = await recommendationOutcomeService.reconcile(500);
    return { result };
  },
});
