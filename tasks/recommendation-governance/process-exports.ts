import { defineTask } from "nitro/task";

import { recommendationGovernanceService } from "../../src/lib/recommendation-governance/service.server";

export default defineTask({
  meta: {
    name: "recommendation-governance:exports",
    description: "Process bounded recommendation audit exports",
  },
  async run() {
    const result = await recommendationGovernanceService.processExports(10);
    return { result };
  },
});
