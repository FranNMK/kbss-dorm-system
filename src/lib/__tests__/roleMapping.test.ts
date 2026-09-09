/**
 * Test 2 — mapRawRole() from src/lib/utils.ts
 *
 * Mirrors the mapping logic used in /api/auth/sync-user and getSessionRole().
 * Pure function, no mocks needed.
 * Verifies the exact strings Auth0 sends map to the correct Prisma enum values.
 */
import { UserRole } from "@prisma/client";
import { mapRawRole } from "../utils";

describe("mapRawRole() — Auth0 role claim → UserRole enum", () => {
  // ── Known valid roles ──────────────────────────────────────────────────────
  it("maps 'admin' → UserRole.admin", () => {
    expect(mapRawRole("admin")).toBe(UserRole.admin);
    expect(mapRawRole("admin")).toBe("admin");
  });

  it("maps 'dorm_master' → UserRole.dorm_master", () => {
    expect(mapRawRole("dorm_master")).toBe(UserRole.dorm_master);
    expect(mapRawRole("dorm_master")).toBe("dorm_master");
  });

  // ── Fallback to unassigned ─────────────────────────────────────────────────
  it("maps 'unassigned' string → UserRole.unassigned", () => {
    expect(mapRawRole("unassigned")).toBe(UserRole.unassigned);
  });

  it("maps empty string → UserRole.unassigned", () => {
    expect(mapRawRole("")).toBe(UserRole.unassigned);
  });

  it("maps undefined → UserRole.unassigned", () => {
    expect(mapRawRole(undefined)).toBe(UserRole.unassigned);
  });

  it("maps null → UserRole.unassigned", () => {
    expect(mapRawRole(null)).toBe(UserRole.unassigned);
  });

  it("maps unknown role string → UserRole.unassigned (no privilege escalation)", () => {
    expect(mapRawRole("superuser")).toBe(UserRole.unassigned);
    expect(mapRawRole("ADMIN")).toBe(UserRole.unassigned); // case-sensitive
    expect(mapRawRole("Dorm_Master")).toBe(UserRole.unassigned);
    expect(mapRawRole("root")).toBe(UserRole.unassigned);
  });

  // ── Enum values match what Prisma schema defines ───────────────────────────
  it("UserRole enum has exactly the 3 expected values", () => {
    const values = Object.values(UserRole);
    expect(values).toContain("admin");
    expect(values).toContain("dorm_master");
    expect(values).toContain("unassigned");
    expect(values).toHaveLength(3);
  });
});
