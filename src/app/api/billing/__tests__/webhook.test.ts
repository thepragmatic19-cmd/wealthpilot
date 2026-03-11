/** @jest-environment node */
// Tests for POST /api/billing/webhook

jest.mock("@/env", () => ({
  getServerEnv: jest.fn(() => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    GOOGLE_AI_API_KEY: "google-key",
    GROQ_API_KEY: "groq-key",
    STRIPE_SECRET_KEY: "sk_test_xxx",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    STRIPE_PRO_PRICE_ID: "price_pro_123",
    STRIPE_ELITE_PRICE_ID: "price_elite_456",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  })),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockConstructEvent = jest.fn();
const mockRetrieve = jest.fn();
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockRetrieve },
  }));
});

const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      update: jest.fn(() => ({ eq: mockUpdateEq })),
    })),
  })),
}));

import { NextRequest } from "next/server";
import { POST, getPlanFromPriceId } from "../webhook/route";

describe("getPlanFromPriceId", () => {
  it("returns pro for pro price id", () => {
    expect(getPlanFromPriceId("price_pro_123")).toBe("pro");
  });

  it("returns elite for elite price id", () => {
    expect(getPlanFromPriceId("price_elite_456")).toBe("elite");
  });

  it("returns free for unknown price id", () => {
    expect(getPlanFromPriceId("price_unknown")).toBe("free");
  });
});

describe("POST /api/billing/webhook", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  function makeRequest(body: string, headers: Record<string, string> = {}) {
    return new NextRequest("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body,
    });
  }

  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/stripe-signature/);
  });

  it("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const res = await POST(makeRequest("{}", { "stripe-signature": "invalid_sig" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/signature/i);
  });

  it("returns 200 for unhandled event types", async () => {
    mockConstructEvent.mockReturnValue({
      type: "unknown.event",
      data: { object: {} },
    });

    const res = await POST(makeRequest("{}", { "stripe-signature": "valid_sig" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
  });

  it("returns 200 for checkout.session.completed with subscription", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          subscription: "sub_123",
          customer: "cus_123",
          metadata: { supabase_user_id: "user-1" },
        },
      },
    });

    mockRetrieve.mockResolvedValue({
      id: "sub_123",
      status: "active",
      cancel_at_period_end: false,
      items: { data: [{ price: { id: "price_pro_123" }, current_period_start: 1700000000, current_period_end: 1702678400 }] },
    });

    const res = await POST(makeRequest("{}", { "stripe-signature": "valid_sig" }));
    expect(res.status).toBe(200);
  });
});
