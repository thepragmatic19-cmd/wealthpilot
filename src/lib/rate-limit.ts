/**
 * Distributed rate limiter backed by Supabase (api_rate_limits table + check_rate_limit RPC).
 * Falls back to in-memory if Supabase is unavailable.
 */

import { createClient } from "@supabase/supabase-js";

// ============================================================
// In-memory fallback store
// ============================================================

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitBucket>();
let lastCleanup = Date.now();

function cleanupMemory() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt < now) store.delete(key);
  }
}

function checkMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  cleanupMemory();
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: maxRequests - 1, resetInSeconds: Math.ceil(windowMs / 1000) };
  }

  existing.count++;
  const resetInSeconds = Math.ceil((existing.resetAt - now) / 1000);

  if (existing.count > maxRequests) {
    return { success: false, remaining: 0, resetInSeconds };
  }

  return { success: true, remaining: maxRequests - existing.count, resetInSeconds };
}

// ============================================================
// Supabase service-role client (lazy, no cookies needed)
// ============================================================

let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}

// ============================================================
// Public API
// ============================================================

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Check rate limit using Supabase distributed store.
 * Falls back to in-memory on any Supabase error.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 60_000
): Promise<RateLimitResult> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const windowSeconds = Math.ceil(windowMs / 1000);
      const { data, error } = await supabase.rpc("check_rate_limit" as string, {
        p_key: key,
        p_max_requests: maxRequests,
        p_window_seconds: windowSeconds,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      if (!error && data !== null) {
        const allowed = data as boolean;
        if (allowed) {
          return { success: true, remaining: maxRequests - 1, resetInSeconds: windowSeconds };
        } else {
          return { success: false, remaining: 0, resetInSeconds: windowSeconds };
        }
      }
    } catch {
      // Fall through to in-memory fallback
    }
  }

  return checkMemoryRateLimit(key, maxRequests, windowMs);
}

// Alias for backward compatibility
export async function checkRateLimitAsync(
  key: string,
  maxRequests: number,
  windowMs: number = 60_000
): Promise<RateLimitResult> {
  return checkRateLimit(key, maxRequests, windowMs);
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
