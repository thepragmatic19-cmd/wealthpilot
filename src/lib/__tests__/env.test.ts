import { getServerEnv } from "../../env";

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_AI_API_KEY",
  "GROQ_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRO_PRICE_ID",
  "STRIPE_ELITE_PRICE_ID",
] as const;

const VALID_ENV: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  GOOGLE_AI_API_KEY: "google-key",
  GROQ_API_KEY: "groq-key",
  STRIPE_SECRET_KEY: "sk_test_xxx",
  STRIPE_WEBHOOK_SECRET: "whsec_xxx",
  STRIPE_PRO_PRICE_ID: "price_pro",
  STRIPE_ELITE_PRICE_ID: "price_elite",
};

describe("getServerEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset module singleton between tests
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return validated env when all required vars are present", () => {
    Object.assign(process.env, VALID_ENV);

    // Re-import to get fresh module (bypass singleton cache)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getServerEnv: freshGetServerEnv } = require("../../env");
    const env = freshGetServerEnv();

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
    expect(env.STRIPE_SECRET_KEY).toBe("sk_test_xxx");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000"); // default
  });

  it("should throw when a required var is missing", () => {
    Object.assign(process.env, VALID_ENV);

    for (const key of REQUIRED_VARS) {
      jest.resetModules();
      const saved = process.env[key];
      delete process.env[key];

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getServerEnv: freshGet } = require("../../env");
      expect(() => freshGet()).toThrow(/Missing or invalid environment variables/);

      process.env[key] = saved;
    }
  });

  it("should use provided NEXT_PUBLIC_SITE_URL when set", () => {
    Object.assign(process.env, { ...VALID_ENV, NEXT_PUBLIC_SITE_URL: "https://app.example.com" });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getServerEnv: freshGet } = require("../../env");
    expect(freshGet().NEXT_PUBLIC_SITE_URL).toBe("https://app.example.com");
  });
});
