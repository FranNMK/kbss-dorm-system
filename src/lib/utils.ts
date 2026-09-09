/**
 * Pure utility functions — no Auth0 or Prisma imports.
 * Safe to use in both server and test contexts.
 */
import { UserRole } from "@prisma/client";

/**
 * Check whether the given role + dormScope combination grants access to a dorm.
 * - Admin: always true
 * - Dorm Master: true only if dormCode is in their dormScope array
 * - Unassigned: always false
 */
export function checkDormScope(
  role: UserRole,
  dormCode: string,
  dormScope: string[] | null
): boolean {
  if (role === UserRole.admin) return true;
  if (role !== UserRole.dorm_master) return false; // unassigned or any unknown role
  if (!dormScope) return false;
  return dormScope.includes(dormCode);
}

/**
 * Map a raw role string (from Auth0 claim) to a validated UserRole enum.
 * Unknown strings fall back to "unassigned" — no privilege escalation possible.
 */
export function mapRawRole(rawRole: string | undefined | null): UserRole {
  if (rawRole === "admin") return UserRole.admin;
  if (rawRole === "dorm_master") return UserRole.dorm_master;
  return UserRole.unassigned;
}
