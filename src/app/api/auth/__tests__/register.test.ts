/** @jest-environment node */
// Tests for POST /api/auth/register

// Mock env validation before other imports
jest.mock("@/env", () => ({
  getServerEnv: jest.fn(() => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    GOOGLE_AI_API_KEY: "google-key",
    GROQ_API_KEY: "groq-key",
    STRIPE_SECRET_KEY: "sk_test_xxx",
    STRIPE_WEBHOOK_SECRET: "whsec_xxx",
    STRIPE_PRO_PRICE_ID: "price_pro",
    STRIPE_ELITE_PRICE_ID: "price_elite",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  })),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockCreateUser = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: {
        createUser: mockCreateUser,
      },
    },
  })),
}));

const mockCheckRateLimit = jest.fn();
jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  rateLimitResponse: jest.fn(() => new Response(JSON.stringify({ error: "rate limited" }), { status: 429 })),
}));

import { POST } from "../register/route";

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 4, resetInSeconds: 60 });
    mockCreateUser.mockResolvedValue({ data: { user: { id: "user-1", email: "test@test.com" } }, error: null });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makeRequest({ email: "test@test.com" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(makeRequest({ email: "test@test.com", password: "short", full_name: "Test" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/8 caractères/);
  });

  it("returns 200 on successful registration", async () => {
    const res = await POST(makeRequest({ email: "test@test.com", password: "password123", full_name: "Test User" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe("user-1");
  });

  it("returns 409 when email already exists", async () => {
    mockCreateUser.mockResolvedValue({ data: null, error: { message: "User already been registered" } });

    const res = await POST(makeRequest({ email: "existing@test.com", password: "password123", full_name: "Test" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/déjà utilisée/);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0, resetInSeconds: 30 });

    const res = await POST(makeRequest({ email: "test@test.com", password: "password123", full_name: "Test" }));
    expect(res.status).toBe(429);
  });
});
