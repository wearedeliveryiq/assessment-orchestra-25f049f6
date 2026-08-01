import { auth, defineMcp } from "@lovable.dev/mcp-js";

import getKnowledgePack from "./tools/get-knowledge-pack";
import listAssessments from "./tools/list-assessments";
import getAssessment from "./tools/get-assessment";
import listKnowledgePacks from "./tools/list-knowledge-packs";
import startAssessment from "./tools/start-assessment";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "deliveryiq-orchestrator",
  title: "DeliveryIQ Orchestrator",
  version: "1.0.0",
  instructions:
    "Tools for DeliveryIQ, the delivery maturity intelligence runtime. Use these tools to list and inspect knowledge packs, start assessments, and review assessment results.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listKnowledgePacks, getKnowledgePack, listAssessments, getAssessment, startAssessment],
});
