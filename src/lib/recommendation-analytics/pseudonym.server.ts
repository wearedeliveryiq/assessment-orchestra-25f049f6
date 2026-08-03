function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function recommendationAnalyticsPseudonym(organisationId: string, userId: string) {
  const secret =
    process.env.RECOMMENDATION_ANALYTICS_PSEUDONYM_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("RECOMMENDATION_ANALYTICS_PSEUDONYM_SECRET_UNAVAILABLE");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(
        `deliveryiq-recommendation-analytics/v1\n${organisationId}\n${userId}`,
      ),
    ),
  );
}
