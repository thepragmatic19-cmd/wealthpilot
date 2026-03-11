/**
 * Tests for rate-limit.ts
 *
 * Uses a shared mock Supabase instance so the module-level singleton
 * always references the same object — allowing per-test RPC control.
 */

// Shared mock instance — same reference across all tests
const mockRpc = jest.fn();
const mockSupabaseInstance = { rpc: mockRpc } as any;

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => mockSupabaseInstance),
}));

// Import after mock setup
import { checkRateLimit } from "../rate-limit";

describe("checkRateLimit — Supabase distributed path", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns success when RPC returns true", async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    const result = await checkRateLimit("test-allow", 10, 60_000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(9);
    expect(mockRpc).toHaveBeenCalledWith("check_rate_limit", expect.objectContaining({ p_key: "test-allow", p_max_requests: 10 }));
  });

  it("returns denied when RPC returns false", async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    const result = await checkRateLimit("test-deny", 10, 60_000);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("falls back to in-memory when RPC throws", async () => {
    mockRpc.mockRejectedValue(new Error("Supabase unavailable"));

    const key = `fallback-throw-${Date.now()}`;
    const result = await checkRateLimit(key, 5, 60_000);
    // In-memory fallback: first request succeeds
    expect(result.success).toBe(true);
  });

  it("falls back to in-memory when RPC returns an error object", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "rpc error" } });

    const key = `fallback-error-${Date.now()}`;
    const result = await checkRateLimit(key, 5, 60_000);
    // data is null → falls through to in-memory
    expect(result.success).toBe(true);
  });
});

describe("checkRateLimit — in-memory fallback (Supabase throwing)", () => {
  beforeEach(() => {
    // Force in-memory path by making Supabase RPC always throw
    mockRpc.mockRejectedValue(new Error("forced failure"));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("allows requests under the limit", async () => {
    const key = `mem-allow-${Date.now()}`;

    const r1 = await checkRateLimit(key, 3, 60_000);
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = await checkRateLimit(key, 3, 60_000);
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = await checkRateLimit(key, 3, 60_000);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("rejects requests over the limit", async () => {
    const key = `mem-reject-${Date.now()}`;

    await checkRateLimit(key, 2, 60_000);
    await checkRateLimit(key, 2, 60_000);

    const result = await checkRateLimit(key, 2, 60_000);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetInSeconds).toBeGreaterThan(0);
  });

  it("tracks different keys independently", async () => {
    const keyA = `mem-indep-A-${Date.now()}`;
    const keyB = `mem-indep-B-${Date.now()}`;

    await checkRateLimit(keyA, 1, 60_000);
    expect((await checkRateLimit(keyA, 1, 60_000)).success).toBe(false);
    expect((await checkRateLimit(keyB, 1, 60_000)).success).toBe(true);
  });

  it("resets after the window expires", async () => {
    const key = `mem-reset-${Date.now()}`;

    await checkRateLimit(key, 1, 100);
    expect((await checkRateLimit(key, 1, 100)).success).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect((await checkRateLimit(key, 1, 100)).success).toBe(true);
  });

  it("returns correct resetInSeconds", async () => {
    const key = `mem-reset-secs-${Date.now()}`;

    await checkRateLimit(key, 1, 30_000);
    const result = await checkRateLimit(key, 1, 30_000);

    expect(result.success).toBe(false);
    expect(result.resetInSeconds).toBeGreaterThan(0);
    expect(result.resetInSeconds).toBeLessThanOrEqual(30);
  });
});
