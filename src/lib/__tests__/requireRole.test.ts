/**
 * Test 4 — requireRole()
 *
 * auth0.getSession() is mocked — no real Auth0 connection.
 * Verifies: 401 when no session, 403 when wrong role, null when authorized.
 */
import { UserRole } from "@prisma/client";

jest.mock("../auth0", () => ({
  auth0: {
    getSession: jest.fn(),
  },
}));

import { auth0 } from "../auth0";
import { requireRole } from "../auth";

const mockGetSession = auth0.getSession as jest.Mock;

describe("requireRole()", () => {
  afterEach(() => jest.clearAllMocks());

  // ── No session → 401 ──────────────────────────────────────────────────────
  describe("when there is no session (not logged in)", () => {
    beforeEach(() => mockGetSession.mockResolvedValue(null));

    it("returns a Response (not null)", async () => {
      const result = await requireRole([UserRole.admin]);
      expect(result).not.toBeNull();
    });

    it("returns HTTP 401 Unauthorized", async () => {
      const result = await requireRole([UserRole.admin]);
      expect(result!.status).toBe(401);
    });

    it("response body contains error: 'Unauthorized'", async () => {
      const result = await requireRole([UserRole.admin]);
      const body = await result!.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  // ── Wrong role → 403 ──────────────────────────────────────────────────────
  describe("when the user has the wrong role", () => {
    it("returns 403 when dorm_master calls an admin-only endpoint", async () => {
      mockGetSession.mockResolvedValue({
        user: { sub: "auth0|dm1", app_metadata: { role: "dorm_master" } },
      });
      const result = await requireRole([UserRole.admin]);
      expect(result!.status).toBe(403);
    });

    it("returns 403 when unassigned user calls any protected endpoint", async () => {
      mockGetSession.mockResolvedValue({
        user: { sub: "auth0|u1", app_metadata: { role: "unassigned" } },
      });
      const result = await requireRole([UserRole.admin, UserRole.dorm_master]);
      expect(result!.status).toBe(403);
    });

    it("403 response body contains error message", async () => {
      mockGetSession.mockResolvedValue({
        user: { sub: "auth0|dm2", app_metadata: { role: "dorm_master" } },
      });
      const result = await requireRole([UserRole.admin]);
      const body = await result!.json();
      expect(body.error).toMatch(/forbidden/i);
    });
  });

  // ── Correct role → null (authorized) ──────────────────────────────────────
  describe("when the user has the correct role", () => {
    it("returns null when admin calls admin-only endpoint", async () => {
      mockGetSession.mockResolvedValue({
        user: {
          sub: "auth0|adm1",
          email: "frankmk2025@gmail.com",
          app_metadata: { role: "admin" },
        },
      });
      const result = await requireRole([UserRole.admin]);
      expect(result).toBeNull();
    });

    it("returns null when dorm_master calls a shared endpoint", async () => {
      mockGetSession.mockResolvedValue({
        user: { sub: "auth0|dm3", app_metadata: { role: "dorm_master" } },
      });
      const result = await requireRole([UserRole.admin, UserRole.dorm_master]);
      expect(result).toBeNull();
    });

    it("returns null when admin calls a shared endpoint (admin is always included)", async () => {
      mockGetSession.mockResolvedValue({
        user: { sub: "auth0|adm2", app_metadata: { role: "admin" } },
      });
      const result = await requireRole([UserRole.admin, UserRole.dorm_master]);
      expect(result).toBeNull();
    });
  });
});
