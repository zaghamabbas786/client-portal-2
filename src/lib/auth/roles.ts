import type { Session } from "@supabase/supabase-js";

/** Portal profile roles (stored in `public.profiles.role`). */
export const PORTAL_ROLES = ["admin", "standard"] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];
/** Normalize text from DB/UI (handles spaces, stray casing like `Admin`). */
export function canonicalRoleKey(role: string | null | undefined): string {
  if (typeof role !== "string") return "";
  return role.trim().toLowerCase();
}

export function isPortalAdminRole(
  role: string | null | undefined,
): role is "admin" {
  return canonicalRoleKey(role) === "admin";
}

/** API / forms: accept admin or anything else as standard. */
export function parsePortalRole(value: unknown): PortalRole {
  return canonicalRoleKey(typeof value === "string" ? value : "") === "admin"
    ? "admin"
    : "standard";
}

/** Map DB value to canonical portal role (legacy `client` → standard). */
export function normalizeStoredRole(
  role: string | null | undefined,
): PortalRole {
  const k = canonicalRoleKey(role);
  if (k === "admin") return "admin";
  return "standard";
}

/** Best-effort `role` from a PostgREST row (handles odd casings). */
export function profileRoleFromRow(row: unknown): string | undefined {
  if (!row || typeof row !== "object") return undefined;
  const o = row as Record<string, unknown>;
  const v = o.role ?? o.Role;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/**
 * Optional hint from Auth user JSON (Dashboard → Authentication → Users →
 * Raw user/app metadata `{ "portal_role": "admin" }`). Elevates admin in the UI
 * when the JWT includes it; anon clients normally cannot spoof this field.
 */
export function sessionPortalRoleHint(session: Session | null): string | undefined {
  const u = session?.user;
  if (!u) return undefined;
  const um = u.user_metadata as Record<string, unknown> | undefined;
  const am = u.app_metadata as Record<string, unknown> | undefined;
  const hint =
    um?.portal_role ?? am?.portal_role ?? um?.role ?? am?.role;
  return typeof hint === "string" && hint.trim() ? hint.trim() : undefined;
}

export function isEffectivePortalAdmin(
  profileRow: unknown,
  session: Session | null,
): boolean {
  if (isPortalAdminRole(profileRoleFromRow(profileRow))) return true;
  if (isPortalAdminRole(sessionPortalRoleHint(session))) return true;
  return false;
}