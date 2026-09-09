/**
 * Tests for requireRole() — uses custom session, not Auth0.
 */
import { UserRole } from "@prisma/client";

jest.mock("../session", () => ({
  getSession: jest.fn(),
}));

import { getSession } from "../session";
import { requireRole } from "../auth";

const mockGetSession = getSession as jest.Mock;

describe("requireRole()", () => {
  afterEach(() => jest.clearAllMocks());

  describe("when there is no session (not logged in)", () => {
    beforeEach(() => mockGetSession.mockResolvedValue(null));

    it("returns a Response (not null)", async () => {
      expect(await requireRole([UserRole.admin])).not.toBeNull();
    });

    it("returns HTTP 401 Unauthorized", async () => {
      const result = await requireRole([UserRole.admin]);
      expect(result!.status).toBe(401);
    });

    it("response body contains error message", async () => {
      const result = await requireRole([UserRole.admin]);
      const body = await result!.json();
      expect(body.error).toMatch(/unauthorized/i);
    });
  });

  describe("when the user has the wrong role", () => {
    it("returns 403 when dorm_master calls admin-only endpoint", async () => {
      mockGetSession.mockResolvedValue({
        userId: 1, email: "dm@kbss.ac.ke", name: "DM", role: UserRole.dorm_master,
      });
      const result = await requireRole([UserRole.admin]);
      expect(result!.status).toBe(403);
    });

    it("returns 403 when unassigned user calls any protected endpoint", async () => {
      mockGetSession.mockResolvedValue({
        userId: 2, email: "u@kbss.ac.ke", name: "U", role: UserRole.unassigned,
      });
      const result = await requireRole([UserRole.admin, UserRole.dorm_master]);
      expect(result!.status).toBe(403);
    });
  });

  describe("when the user has the correct role", () => {
    it("returns null when admin calls admin-only endpoint", async () => {
      mockGetSession.mockResolvedValue({
        userId: 3, email: "frankmk2025@gmail.com", name: "Admin", role: UserRole.admin,
      });
      expect(await requireRole([UserRole.admin])).toBeNull();
    });

    it("returns null when dorm_master calls a shared endpoint", async () => {
      mockGetSession.mockResolvedValue({
        userId: 4, email: "dm@kbss.ac.ke", name: "DM", role: UserRole.dorm_master,
      });
      expect(await requireRole([UserRole.admin, UserRole.dorm_master])).toBeNull();
    });

    it("returns null when admin calls a shared endpoint", async () => {
      mockGetSession.mockResolvedValue({
        userId: 5, email: "a@kbss.ac.ke", name: "A", role: UserRole.admin,
      });
      expect(await requireRole([UserRole.admin, UserRole.dorm_master])).toBeNull();
    });
  });
});
