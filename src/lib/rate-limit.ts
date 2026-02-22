import { createClient } from "@supabase/supabase-js";

/**
 * Persistent rate limiter for API routes using Supabase (PostgreSQL).
 * Replaces the in-memory limiter for better support in serverless environments.
 * Uses the 'api_rate_limits' table and the 'check_rate_limit' RPC function.
 */

// Dedicated Supabase client using service role to bypass RLS for rate limiting
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Check if a request is within rate limits.
 * @param key - Unique identifier (userId, IP, etc.)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60s)
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 60_000
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max_requests: maxRequests,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });

    if (error) {
      console.error("Rate limit RPC error:", error);
      // Fallback: allow request if DB is down to avoid blocking users
      return { success: true, remaining: 1, resetInSeconds: 0 };
    }

    // data is returned as a JSON object matching RateLimitResult
    return data as RateLimitResult;
  } catch (err) {
    console.error("Rate limit unexpected error:", err);
    return { success: true, remaining: 1, resetInSeconds: 0 };
  }
}

/**
 * Helper to create a rate-limited JSON error response (429).
 */
export function rateLimitResponse(resetInSeconds: number): Response {
  return new Response(
    JSON.stringify({
      error: "Trop de requêtes. Veuillez réessayer dans quelques instants.",
      retryAfter: resetInSeconds,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(resetInSeconds),
      },
    }
  );
}
