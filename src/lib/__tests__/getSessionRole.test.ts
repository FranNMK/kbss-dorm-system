/**
 * Test 3 — getSessionRole()
 *
 * auth0.getSession() is mocked — no real Auth0 connection or network call.
 * Verifies: role is correctly extracted from app_metadata claim in the session.
 */
import { UserRole } from "@prisma/client";

// Mock the auth0 singleton BEFORE importing auth.ts
jest.mock("../auth0", () => ({
  auth0: {
    getSession: jest.fn(),
  },
}));

// Import AFTER the mock is registered
import { auth0 } from "../auth0";
import { getSessionRole } from "../auth";

const mockGetSession = auth0.getSession as jest.Mock;

describe("getSessionRole()", () => {
  afterEach(() => jest.clearAllMocks());

  // ── No session ─────────────────────────────────────────────────────────────
  it("returns 'unassigned' when there is no session at all", async () => {
    mockGetSession.mockResolvedValue(null);
    expect(await getSessionRole()).toBe(UserRole.unassigned);
  });

  // ── Admin ──────────────────────────────────────────────────────────────────
  it("returns 'admin' when app_metadata.role = 'admin'", async () => {
    mockGetSession.mockResolvedValue({
      user: {
        sub: "auth0|admin001",
        email: "frankmk2025@gmail.com",
        app_metadata: { role: "admin" },
      },
    });
    expect(await getSessionRole()).toBe(UserRole.admin);
  });

  // ── Dorm Master ────────────────────────────────────────────────────────────
  it("returns 'dorm_master' when app_metadata.role = 'dorm_master'", async () => {
    mockGetSession.mockResolvedValue({
      user: {
        sub: "auth0|dorm001",
        email: "dormmaster@kbss.ac.ke",
        app_metadata: { role: "dorm_master" },
      },
    });
    expect(await getSessionRole()).toBe(UserRole.dorm_master);
  });

  // ── Missing or empty metadata ──────────────────────────────────────────────
  it("returns 'unassigned' when app_metadata exists but has no role key", async () => {
    mockGetSession.mockResolvedValue({
      user: {
        sub: "auth0|norole",
        email: "norole@kbss.ac.ke",
        app_metadata: {},
      },
    });
    expect(await getSessionRole()).toBe(UserRole.unassigned);
  });

  it("returns 'unassigned' when app_metadata is missing entirely", async () => {
    mockGetSession.mockResolvedValue({
      user: {
        sub: "auth0|nometa",
        email: "nometa@kbss.ac.ke",
        // no app_metadata key at all
      },
    });
    expect(await getSessionRole()).toBe(UserRole.unassigned);
  });

  it("returns 'unassigned' when app_metadata.role is an unknown string", async () => {
    mockGetSession.mockResolvedValue({
      user: {
        sub: "auth0|unknown",
        email: "unknown@kbss.ac.ke",
        app_metadata: { role: "superuser" },
      },
    });
    // "superuser" is not a valid UserRole — should fall through to unassigned
    expect(await getSessionRole()).toBe(UserRole.unassigned);
  });

  // ── Alternate claim namespace ──────────────────────────────────────────────
  it("returns 'admin' from the https://kbss-dorms/role fallback claim", async () => {
    mockGetSession.mockResolvedValue({
      user: {
        sub: "auth0|alt001",
        email: "alt@kbss.ac.ke",
        // no app_metadata, uses namespaced claim instead
        "https://kbss-dorms/role": "admin",
      },
    });
    expect(await getSessionRole()).toBe(UserRole.admin);
  });
});
