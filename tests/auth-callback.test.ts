import { describe, expect, it } from "vitest";

import {
  GENERIC_LINK_ERROR,
  parseAuthCallback,
  resolveOtpType,
  safeRedirectPath,
} from "@/lib/identity/auth-callback";

describe("auth callback parsing", () => {
  it("reads a signup token hash from the query string and keeps its declared type", () => {
    const callback = parseAuthCallback("", "?token_hash=abc123&type=signup");
    expect(callback.error).toBeNull();
    expect(callback.tokenHash).toBe("abc123");
    expect(callback.otpType).toBe("signup");
    expect(callback.hasSessionTokens).toBe(false);
  });

  it("recognises an implicit hash session callback", () => {
    const callback = parseAuthCallback("#access_token=aaa&refresh_token=bbb&type=signup", "");
    expect(callback.hasSessionTokens).toBe(true);
    expect(callback.tokenHash).toBeNull();
    expect(callback.error).toBeNull();
  });

  it("prefers fragment values but still reads query fallbacks", () => {
    const callback = parseAuthCallback("#type=recovery", "?token_hash=xyz&type=signup");
    expect(callback.otpType).toBe("recovery");
    expect(callback.tokenHash).toBe("xyz");
  });

  it("surfaces a safe message for an expired link without echoing provider text", () => {
    const callback = parseAuthCallback(
      "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
      "",
    );
    expect(callback.error).toBe("This link has expired. Request a new one to continue.");
    expect(callback.error).not.toContain("Email link");
  });

  it("falls back to a generic message for unknown error codes", () => {
    const callback = parseAuthCallback("#error_code=some_new_code", "");
    expect(callback.error).toBe(GENERIC_LINK_ERROR);
  });

  it("never exposes token material in the customer-facing error", () => {
    const callback = parseAuthCallback("#error_code=otp_expired&token_hash=supersecrettoken", "");
    expect(callback.error).not.toContain("supersecrettoken");
  });

  it("treats a link with neither tokens nor errors as unusable input", () => {
    const callback = parseAuthCallback("", "");
    expect(callback.tokenHash).toBeNull();
    expect(callback.hasSessionTokens).toBe(false);
    expect(callback.error).toBeNull();
  });

  it("rejects unsupported or injected verification types", () => {
    expect(resolveOtpType("javascript:alert(1)", "signup")).toBe("signup");
    expect(resolveOtpType(null, "recovery")).toBe("recovery");
    expect(resolveOtpType("recovery", "signup")).toBe("recovery");
  });

  it("only allows same-origin path redirects", () => {
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("//evil.example.com")).toBe("/");
    expect(safeRedirectPath("https://evil.example.com")).toBe("/");
    expect(safeRedirectPath(undefined, "/auth/login")).toBe("/auth/login");
  });
});
