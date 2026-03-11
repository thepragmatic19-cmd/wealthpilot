import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, { error: "NEXT_PUBLIC_SUPABASE_URL is required" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, { error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required" }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, { error: "SUPABASE_SERVICE_ROLE_KEY is required" }),
  GOOGLE_AI_API_KEY: z.string().min(1, { error: "GOOGLE_AI_API_KEY is required" }),
  GROQ_API_KEY: z.string().min(1, { error: "GROQ_API_KEY is required" }),
  STRIPE_SECRET_KEY: z.string().min(1, { error: "STRIPE_SECRET_KEY is required" }),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, { error: "STRIPE_WEBHOOK_SECRET is required" }),
  STRIPE_PRO_PRICE_ID: z.string().min(1, { error: "STRIPE_PRO_PRICE_ID is required" }),
  STRIPE_ELITE_PRICE_ID: z.string().min(1, { error: "STRIPE_ELITE_PRICE_ID is required" }),
  NEXT_PUBLIC_SITE_URL: z.string().default("http://localhost:3000"),
});

function validateEnv() {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing or invalid environment variables: ${missing}`);
  }
  return result.data;
}

// Lazy singleton — validated once on first access, not at module load time
// (avoids breaking next build / edge runtime where some vars may not be set)
let _cached: z.infer<typeof serverEnvSchema> | null = null;

export function getServerEnv() {
  if (!_cached) _cached = validateEnv();
  return _cached;
}
