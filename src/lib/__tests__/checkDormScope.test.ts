/**
 * Test 1 — checkDormScope()
 *
 * Pure function, no mocks needed.
 * Verifies: admin always passes, dorm_master scoped to array of dormCodes,
 * unassigned always fails.
 */
import { UserRole } from "@prisma/client";
import { checkDormScope } from "../utils";

describe("checkDormScope()", () => {
  // ── Admin ──────────────────────────────────────────────────────────────────
  describe("admin role", () => {
    it("passes when dormScope is null", () => {
      expect(checkDormScope(UserRole.admin, "DORM_A", null)).toBe(true);
    });

    it("passes when dormScope is empty array", () => {
      expect(checkDormScope(UserRole.admin, "DORM_A", [])).toBe(true);
    });

    it("passes even when dormCode is NOT in dormScope", () => {
      expect(checkDormScope(UserRole.admin, "DORM_A", ["DORM_B"])).toBe(true);
    });
  });

  // ── Dorm Master ────────────────────────────────────────────────────────────
  describe("dorm_master role", () => {
    it("fails when dormScope is null (no scope assigned yet)", () => {
      expect(checkDormScope(UserRole.dorm_master, "DORM_A", null)).toBe(false);
    });

    it("fails when dormScope is empty array", () => {
      expect(checkDormScope(UserRole.dorm_master, "DORM_A", [])).toBe(false);
    });

    it("passes when dormCode is in scope array", () => {
      expect(
        checkDormScope(UserRole.dorm_master, "DORM_A", ["DORM_A", "DORM_B"])
      ).toBe(true);
    });

    it("fails when dormCode is NOT in scope array", () => {
      expect(
        checkDormScope(UserRole.dorm_master, "DORM_C", ["DORM_A", "DORM_B"])
      ).toBe(false);
    });

    it("is case-sensitive — 'dorm_a' does not match 'DORM_A'", () => {
      expect(
        checkDormScope(UserRole.dorm_master, "dorm_a", ["DORM_A"])
      ).toBe(false);
    });
  });

  // ── Unassigned ─────────────────────────────────────────────────────────────
  describe("unassigned role", () => {
    it("fails even when dormCode matches scope", () => {
      expect(
        checkDormScope(UserRole.unassigned, "DORM_A", ["DORM_A"])
      ).toBe(false);
    });

    it("fails when dormScope is null", () => {
      expect(checkDormScope(UserRole.unassigned, "DORM_A", null)).toBe(false);
    });
  });
});
