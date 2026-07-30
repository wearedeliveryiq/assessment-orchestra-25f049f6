import type { UserStatus } from "./types";

/**
 * Password policy + user status machine.
 *
 * Pure logic, shared by the browser (live strength indicator, inline
 * validation) and the server (authoritative enforcement).
 */

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
  /** Number of previous passwords that may not be reused. 0 disables history. */
  historyDepth: number;
  /** Days after which a password must be changed. 0 disables expiry. */
  expiryDays: number;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
  historyDepth: 5,
  expiryDays: 0,
};

export interface PasswordEvaluation {
  valid: boolean;
  /** 0-4 strength band used by the strength indicator. */
  score: number;
  label: "Very weak" | "Weak" | "Fair" | "Strong" | "Excellent";
  failures: string[];
}

const COMMON = new Set([
  "password",
  "password1",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "changeme",
  "deliveryiq",
]);

export function evaluatePassword(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): PasswordEvaluation {
  const failures: string[] = [];
  const value = password ?? "";

  if (value.length < policy.minLength)
    failures.push(`Use at least ${policy.minLength} characters`);
  if (value.length > policy.maxLength)
    failures.push(`Use no more than ${policy.maxLength} characters`);
  if (policy.requireUppercase && !/[A-Z]/.test(value)) failures.push("Add an uppercase letter");
  if (policy.requireLowercase && !/[a-z]/.test(value)) failures.push("Add a lowercase letter");
  if (policy.requireNumber && !/[0-9]/.test(value)) failures.push("Add a number");
  if (policy.requireSymbol && !/[^A-Za-z0-9]/.test(value)) failures.push("Add a symbol");
  if (COMMON.has(value.toLowerCase())) failures.push("Avoid common passwords");
  if (/(.)\1{3,}/.test(value)) failures.push("Avoid repeating the same character");

  let score = 0;
  if (value.length >= policy.minLength) score += 1;
  if (value.length >= policy.minLength + 4) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;
  if (failures.length > 0) score = Math.min(score, 2);

  const labels: PasswordEvaluation["label"][] = [
    "Very weak",
    "Weak",
    "Fair",
    "Strong",
    "Excellent",
  ];

  return { valid: failures.length === 0, score, label: labels[score] ?? "Very weak", failures };
}

export function isPasswordExpired(
  passwordChangedAt: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): boolean {
  if (!policy.expiryDays) return false;
  const changed = new Date(passwordChangedAt).getTime();
  if (Number.isNaN(changed)) return false;
  return Date.now() - changed > policy.expiryDays * 86_400_000;
}

/* ------------------------------- status ------------------------------- */

const TRANSITIONS: Record<UserStatus, UserStatus[]> = {
  pending_verification: ["active", "disabled", "suspended"],
  active: ["locked", "suspended", "disabled"],
  locked: ["active", "suspended", "disabled"],
  suspended: ["active", "disabled"],
  disabled: [],
};

export function canTransitionStatus(from: UserStatus, to: UserStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function assertStatusTransition(from: UserStatus, to: UserStatus): void {
  if (!canTransitionStatus(from, to)) {
    throw new Error(`Invalid status transition: ${from} -> ${to}`);
  }
}

/** Statuses that may authenticate. */
export function canAuthenticate(status: UserStatus): boolean {
  return status === "active";
}

export const STATUS_LABELS: Record<UserStatus, string> = {
  pending_verification: "Pending verification",
  active: "Active",
  locked: "Locked",
  suspended: "Suspended",
  disabled: "Disabled",
};
