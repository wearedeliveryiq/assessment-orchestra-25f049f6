/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash, randomBytes } from "node:crypto";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assessmentRequestContext } from "@/lib/identity/assessment-auth.server";
import { IdentityError } from "@/lib/identity/errors";

import { deliveryDnaManifestDigest, deliveryDnaSessionMetadata } from "./catalogue";
import {
  deliveryDnaSnapshotQuestions,
  evaluateDeliveryDnaSnapshot,
  normaliseSnapshotResponse,
  safeSnapshotAnalyticsEvent,
  snapshotContinuationRecord,
  type SnapshotConfigurationVersion,
  type SnapshotResponse,
} from "./snapshot";

const COOKIE_NAME = "deliveryiq_dna_snapshot";
const SESSION_HEADER = "x-deliveryiq-snapshot-session";
const CACHE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "private, no-store",
  pragma: "no-cache",
};
const sb = supabaseAdmin as unknown as {
  from: (table: string) => any;
  rpc: (name: string, input: any) => any;
};

type SessionRow = {
  id: string;
  status: "in_progress" | "completed" | "linked";
  configuration_version: SnapshotConfigurationVersion;
  presentation_policy_version: "1.0.0" | "1.1.0";
  expires_at: string;
  assessment_session_id: string | null;
};

const SESSION_PROJECTION =
  "id,status,configuration_version,presentation_policy_version,expires_at,assessment_session_id";

type ResponseRow = {
  question_id: string;
  evidence_status: "answered" | "not_applicable";
  answer: number | null;
  not_applicable_reason_code: string | null;
  not_applicable_reason_text: string | null;
  responded_at: string;
};

export class SnapshotError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function cookieValue(request: Request): string | null {
  const headerToken = request.headers.get(SESSION_HEADER)?.trim();
  if (headerToken) return headerToken;
  const cookies = request.headers.get("cookie") ?? "";
  for (const item of cookies.split(";")) {
    const [name, ...value] = item.trim().split("=");
    if (name === COOKIE_NAME) return decodeURIComponent(value.join("="));
  }
  return null;
}

function snapshotCookie(token: string, request?: Request): string {
  // The app is rendered inside a cross-site preview iframe, where SameSite=Lax
  // cookies are dropped by the browser. Over HTTPS use SameSite=None; Secure so
  // the Snapshot session survives; CSRF is covered by the origin check below.
  const secure = request ? new URL(request.url).protocol === "https:" : false;
  const sameSite = secure ? "None; Secure; Partitioned" : "Lax";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=86400; HttpOnly; SameSite=${sameSite}`;
}

function clientIpHash(request: Request): string {
  const raw =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unavailable";
  return sha256(`delivery-dna-snapshot-rate:${raw}`);
}

function unwrap<T>(result: { data: unknown; error: { message: string } | null }): T {
  if (result.error)
    throw new SnapshotError(
      "SNAPSHOT_UNAVAILABLE",
      "The Snapshot is temporarily unavailable.",
      503,
    );
  return result.data as T;
}

function unwrapRpc<T>(result: { data: unknown; error: { message: string } | null }): T {
  if (!result.error) return result.data as T;
  const code = [
    "SNAPSHOT_RATE_LIMITED",
    "SNAPSHOT_LINKING_CONSENT_REQUIRED",
    "SNAPSHOT_LINK_UNAVAILABLE",
    "SNAPSHOT_INCOMPLETE",
    "SNAPSHOT_REQUEST_INVALID",
  ].find((candidate) => result.error?.message.includes(candidate));
  if (code === "SNAPSHOT_RATE_LIMITED") {
    throw new SnapshotError(code, "Too many Snapshot requests. Please wait and try again.", 429);
  }
  if (code === "SNAPSHOT_LINKING_CONSENT_REQUIRED") {
    throw new SnapshotError(
      code,
      "Confirm that your Snapshot responses can be added to your Delivery DNA Assessment.",
      400,
    );
  }
  if (code === "SNAPSHOT_LINK_UNAVAILABLE" || code === "SNAPSHOT_INCOMPLETE") {
    throw new SnapshotError(code, "This Snapshot cannot be continued.", 409);
  }
  throw new SnapshotError("SNAPSHOT_UNAVAILABLE", "The Snapshot is temporarily unavailable.", 503);
}

async function sessionForRequest(
  request: Request,
): Promise<{ session: SessionRow; tokenHash: string } | null> {
  const token = cookieValue(request);
  if (!token || token.length < 32) return null;
  const tokenHash = sha256(token);
  const session = unwrap<SessionRow | null>(
    await sb
      .from("delivery_dna_snapshot_sessions")
      .select(SESSION_PROJECTION)
      .eq("token_hash", tokenHash)
      .maybeSingle(),
  );
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) return null;
  return { session, tokenHash };
}

async function responsesFor(sessionId: string): Promise<SnapshotResponse[]> {
  const rows = unwrap<ResponseRow[]>(
    await sb
      .from("delivery_dna_snapshot_responses")
      .select(
        "question_id,evidence_status,answer,not_applicable_reason_code,not_applicable_reason_text,responded_at",
      )
      .eq("snapshot_session_id", sessionId),
  );
  return rows.map((row) => ({
    questionId: row.question_id,
    status: row.evidence_status,
    answer: row.answer,
    notApplicableReasonCode: row.not_applicable_reason_code,
    notApplicableReasonText: row.not_applicable_reason_text,
    respondedAt: row.responded_at,
  }));
}

async function recordEvent(event: string, stepNumber?: number | null): Promise<void> {
  const safe = safeSnapshotAnalyticsEvent(event, stepNumber);
  const { error } = await sb.from("delivery_dna_snapshot_funnel_events").insert({
    event_type: safe.eventType,
    step_number: safe.stepNumber,
  });
  if (error)
    throw new SnapshotError(
      "SNAPSHOT_UNAVAILABLE",
      "The Snapshot is temporarily unavailable.",
      503,
    );
}

async function project(session: SessionRow, responses: SnapshotResponse[]) {
  let projectedSession = session;
  const result =
    session.status === "completed" || session.status === "linked"
      ? evaluateDeliveryDnaSnapshot(responses)
      : null;
  if (
    result?.available &&
    session.configuration_version === "1.0.0" &&
    session.presentation_policy_version !== "1.1.0"
  ) {
    unwrap(
      await sb
        .from("delivery_dna_snapshot_sessions")
        .update({ presentation_policy_version: "1.1.0" })
        .eq("id", session.id)
        .eq("presentation_policy_version", "1.0.0"),
    );
    projectedSession = { ...session, presentation_policy_version: "1.1.0" };
  }
  return {
    status: projectedSession.status,
    configurationVersion: projectedSession.configuration_version,
    presentationPolicyVersion: projectedSession.presentation_policy_version,
    expiresAt: projectedSession.expires_at,
    responses,
    result,
    linkedAssessmentId:
      projectedSession.status === "linked" ? projectedSession.assessment_session_id : null,
  };
}

export async function getSnapshot(request: Request) {
  const resolved = await sessionForRequest(request);
  if (!resolved) return { snapshot: null };
  return { snapshot: await project(resolved.session, await responsesFor(resolved.session.id)) };
}

export async function startSnapshot(
  request: Request,
  restart = false,
): Promise<{ data: unknown; cookie: string; token: string }> {
  const existing = restart ? null : await sessionForRequest(request);
  if (existing) {
    return {
      data: { snapshot: await project(existing.session, await responsesFor(existing.session.id)) },
      cookie: "",
      token: "",
    };
  }
  const token = randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const sessionId = unwrapRpc<string>(
    await sb.rpc("create_delivery_dna_snapshot", {
      p_token_hash: tokenHash,
      p_ip_hash: clientIpHash(request),
    }),
  );
  const session = unwrap<SessionRow>(
    await sb
      .from("delivery_dna_snapshot_sessions")
      .select(SESSION_PROJECTION)
      .eq("id", sessionId)
      .single(),
  );
  await Promise.all([recordEvent("snapshot_landing_viewed"), recordEvent("snapshot_started")]);
  return {
    data: { snapshot: await project(session, []) },
    cookie: snapshotCookie(token, request),
    token,
  };
}

export async function saveSnapshotResponse(request: Request, input: Record<string, unknown>) {
  const resolved = await sessionForRequest(request);
  if (!resolved)
    throw new SnapshotError(
      "SNAPSHOT_EXPIRED",
      "This Snapshot has expired. Start a new one to continue.",
      410,
    );
  if (resolved.session.status !== "in_progress")
    throw new SnapshotError("SNAPSHOT_LOCKED", "This Snapshot has already been completed.", 409);
  const current = await responsesFor(resolved.session.id);
  const stored = current.find((item) => item.questionId === String(input.questionId));
  const semanticallySame =
    stored &&
    stored.status === input.status &&
    stored.answer === (input.status === "answered" ? Number(input.answer) : null) &&
    stored.notApplicableReasonText ===
      (input.status === "not_applicable"
        ? String(input.notApplicableReasonText ?? "").trim()
        : null);
  const response = normaliseSnapshotResponse({
    questionId: input.questionId,
    status: input.status,
    answer: input.answer,
    notApplicableReasonText: input.notApplicableReasonText,
    respondedAt: semanticallySame ? stored.respondedAt : new Date().toISOString(),
  });
  const question = deliveryDnaSnapshotQuestions.find(
    (item) => item.question.id === response.questionId,
  );
  if (!question)
    throw new SnapshotError("SNAPSHOT_RESPONSE_INVALID", "Choose a valid response.", 400);
  unwrap(
    await sb.from("delivery_dna_snapshot_responses").upsert(
      {
        snapshot_session_id: resolved.session.id,
        question_id: response.questionId,
        capability_id: question.capabilityId,
        capability_order: question.capabilityOrder,
        evidence_status: response.status,
        answer: response.answer,
        not_applicable_reason_code: response.notApplicableReasonCode,
        not_applicable_reason_text: response.notApplicableReasonText,
        responded_at: response.respondedAt,
      },
      { onConflict: "snapshot_session_id,question_id" },
    ),
  );
  const responses = await responsesFor(resolved.session.id);
  await recordEvent("snapshot_step_progressed", Math.min(responses.length, 13));
  return { snapshot: await project(resolved.session, responses) };
}

export async function completeSnapshot(request: Request) {
  const resolved = await sessionForRequest(request);
  if (!resolved)
    throw new SnapshotError(
      "SNAPSHOT_EXPIRED",
      "This Snapshot has expired. Start a new one to continue.",
      410,
    );
  const responses = await responsesFor(resolved.session.id);
  const result = evaluateDeliveryDnaSnapshot(responses);
  if (!result.available) return { snapshot: await project(resolved.session, responses), result };
  if (resolved.session.status === "in_progress") {
    unwrap(
      await sb
        .from("delivery_dna_snapshot_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", resolved.session.id)
        .eq("status", "in_progress"),
    );
    await recordEvent("snapshot_completed");
  }
  const session = unwrap<SessionRow>(
    await sb
      .from("delivery_dna_snapshot_sessions")
      .select(SESSION_PROJECTION)
      .eq("id", resolved.session.id)
      .single(),
  );
  return { snapshot: await project(session, responses), result };
}

export async function continueSnapshot(request: Request, input: Record<string, unknown>) {
  if (input.consent !== true)
    throw new SnapshotError(
      "SNAPSHOT_CONSENT_REQUIRED",
      "Confirm that your Snapshot responses can be added to your Delivery DNA Assessment.",
      400,
    );
  const resolved = await sessionForRequest(request);
  if (!resolved || resolved.session.status === "in_progress")
    throw new SnapshotError("SNAPSHOT_LINK_UNAVAILABLE", "This Snapshot cannot be continued.", 409);
  const context = await assessmentRequestContext(request, { write: true });
  if (!context.identity.user.emailVerified)
    throw new IdentityError("email_not_verified", "Verify your email before continuing.", 403);
  const organisation = unwrap<{ name: string } | null>(
    await sb.from("organisations").select("name").eq("id", context.organisationId).maybeSingle(),
  );
  if (!organisation)
    throw new SnapshotError("SNAPSHOT_LINK_UNAVAILABLE", "This Snapshot cannot be continued.", 409);
  const transfer = (await responsesFor(resolved.session.id)).map((response) =>
    snapshotContinuationRecord(response, resolved.session.configuration_version),
  );
  if (transfer.length !== 13) {
    throw new SnapshotError("SNAPSHOT_INCOMPLETE", "This Snapshot cannot be continued.", 409);
  }
  const manifestMetadata = deliveryDnaSessionMetadata(await deliveryDnaManifestDigest());
  const assessmentId = unwrapRpc<string>(
    await sb.rpc("link_delivery_dna_snapshot", {
      p_token_hash: resolved.tokenHash,
      p_user_id: context.identity.user.id,
      p_organisation_id: context.organisationId,
      p_workspace_id: context.workspaceId,
      p_organisation_name: organisation.name,
      p_manifest_metadata: manifestMetadata,
      p_consent: true,
    }),
  );
  await Promise.all([
    recordEvent("snapshot_continue_selected"),
    recordEvent("snapshot_registration_completed"),
  ]);
  return { assessmentId, saved: true as const };
}

export async function handleSnapshotRoute(
  request: Request,
  handler: () => Promise<unknown>,
): Promise<Response> {
  try {
    const origin = request.headers.get("origin");
    if (request.method !== "GET" && origin && origin !== new URL(request.url).origin) {
      throw new SnapshotError(
        "SNAPSHOT_REQUEST_INVALID",
        "The Snapshot request was rejected.",
        403,
      );
    }
    const result = await handler();
    if (result instanceof Response) return result;
    return new Response(JSON.stringify(result), { status: 200, headers: CACHE_HEADERS });
  } catch (error) {
    if (error instanceof SnapshotError || error instanceof IdentityError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: error instanceof SnapshotError ? error.code : error.code,
        }),
        {
          status: error.status,
          headers: CACHE_HEADERS,
        },
      );
    }
    console.error("[delivery-dna-snapshot] request failed");
    return new Response(
      JSON.stringify({
        error: "The Snapshot is temporarily unavailable.",
        code: "SNAPSHOT_UNAVAILABLE",
      }),
      {
        status: 503,
        headers: CACHE_HEADERS,
      },
    );
  }
}

export function snapshotResponse(body: unknown, cookie = "", token = ""): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      ...CACHE_HEADERS,
      ...(cookie ? { "set-cookie": cookie } : {}),
      ...(token ? { [SESSION_HEADER]: token } : {}),
    },
  });
}
