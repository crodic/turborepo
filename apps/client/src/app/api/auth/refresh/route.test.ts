import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Helper to create mock JWT
function createJwt(exp = Math.floor(Date.now() / 1000) + 3600) {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp, sub: "123" })).toString(
    "base64url"
  );
  return `${header}.${payload}.mock_sig`;
}

const { mockCookies } = vi.hoisted(() => ({
  mockCookies: new Map<string, any>(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => mockCookies.get(name),
    set: (name: string, value: string, options: any) =>
      mockCookies.set(name, { value, ...options }),
    delete: (name: string) => mockCookies.delete(name),
  }),
}));

describe("POST /api/auth/refresh (BFF Route Handler Unit Tests)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalEnv = process.env;

  beforeEach(() => {
    mockCookies.clear();
    process.env = {
      ...originalEnv,
      SERVER_API_URL: "http://mock-api.internal",
    };

    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns 401 when refreshToken cookie is not present", async () => {
    const { POST } = await import("./route");

    const response = await POST();
    expect(response.status).toBe(401);

    const json = await response.json();
    expect(json.message).toBe("No refresh token");
  });

  it("successfully refreshes tokens, sets httpOnly cookies, and enforces ZERO-TRUST response", async () => {
    mockCookies.set("refreshToken", { value: "valid-refresh-token" });

    const newAccess = createJwt();
    const newRefresh = createJwt(Math.floor(Date.now() / 1000) + 86400 * 7);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accessToken: newAccess,
          refreshToken: newRefresh,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const { POST } = await import("./route");
    const response = await POST();

    expect(response.status).toBe(200);
    const json = await response.json();

    // ZERO-TRUST principle: refreshToken MUST NOT be in client response JSON
    expect(json.accessToken).toBe(newAccess);
    expect(json.refreshToken).toBeUndefined();
    expect(Object.keys(json)).toEqual(["accessToken"]);

    // Cookies must have been updated
    expect(mockCookies.get("accessToken")?.value).toBe(newAccess);
    expect(mockCookies.get("accessToken")?.httpOnly).toBe(true);
    expect(mockCookies.get("refreshToken")?.value).toBe(newRefresh);
    expect(mockCookies.get("refreshToken")?.httpOnly).toBe(true);
  });

  it("clears cookies when backend rejects with 401 (e.g. revoked token / replay attack)", async () => {
    mockCookies.set("accessToken", { value: "old-access" });
    mockCookies.set("refreshToken", { value: "revoked-refresh" });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Revoked" }), {
        status: 401,
      })
    );

    const { POST } = await import("./route");
    const response = await POST();

    expect(response.status).toBe(401);

    // Stale credentials must be purged immediately
    expect(mockCookies.has("accessToken")).toBe(false);
    expect(mockCookies.has("refreshToken")).toBe(false);
  });

  it("preserves cookies on transient 502 Bad Gateway server failure", async () => {
    mockCookies.set("accessToken", { value: "current-access" });
    mockCookies.set("refreshToken", { value: "current-refresh" });

    fetchMock.mockResolvedValueOnce(
      new Response("Bad Gateway", {
        status: 502,
      })
    );

    const { POST } = await import("./route");
    const response = await POST();

    expect(response.status).toBe(502);

    // Must NOT purge cookies on transient backend outage
    expect(mockCookies.has("accessToken")).toBe(true);
    expect(mockCookies.has("refreshToken")).toBe(true);
  });
});
