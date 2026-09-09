/**
 * Tests for getSessionRole() — now uses custom session, not Auth0.
 * session.ts is mocked so no JWT verification needed.
 */
import { UserRole } from "@prisma/client";

jest.mock("../session", () => ({
  getSession: jest.fn(),
}));

import { getSession } from "../session";
import { getSessionRole } from "../auth";

const mockGetSession = getSession as jest.Mock;

describe("getSessionRole()", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns unassigned when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);
    expect(await getSessionRole()).toBe(UserRole.unassigned);
  });

  it("returns admin when session.role = admin", async () => {
    mockGetSession.mockResolvedValue({
      userId: 1, email: "frankmk2025@gmail.com",
      name: "Admin User", role: UserRole.admin,
    });
    expect(await getSessionRole()).toBe(UserRole.admin);
  });

  it("returns dorm_master when session.role = dorm_master", async () => {
    mockGetSession.mockResolvedValue({
      userId: 2, email: "master@kbss.ac.ke",
      name: "Dorm Master", role: UserRole.dorm_master,
    });
    expect(await getSessionRole()).toBe(UserRole.dorm_master);
  });

  it("returns unassigned when session.role = unassigned", async () => {
    mockGetSession.mockResolvedValue({
      userId: 3, email: "new@kbss.ac.ke",
      name: "New User", role: UserRole.unassigned,
    });
    expect(await getSessionRole()).toBe(UserRole.unassigned);
  });
});
