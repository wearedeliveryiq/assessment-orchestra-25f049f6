import { sha256 } from "../delivery-intelligence/result-repository.server";

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function stableHandoffToken(material: string) {
  const secret = process.env.HANDOFF_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("PRODUCT_HANDOFF_TOKEN_SECRET_UNAVAILABLE");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`deliveryiq-product-handoff/v1\n${material}`),
    ),
  );
  return `diq_handoff_${base64Url(signature)}`;
}

export const hashHandoffToken = sha256;
