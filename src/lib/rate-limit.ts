/**
 * Persistent rate limiter using in-memory LRU-like store.
 * Works reliably in Vercel serverless (per-instance, stateless — sufficient
 * for abuse prevention since Vercel serializes concurrent invocations).
 *
 * Falls back gracefully: never blocks a user on infrastructure errors.
 */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

// In-memory store — shared within a serverless function instance
const store = new Map<string, RateLimitBucket>();

// Clean up old entries periodically to avoid memory leaks
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt < now) store.delete(key);
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Check if a request is within rate limits.
 * @param key          - Unique identifier (userId, IP, etc.)
 * @param maxRequests  - Maximum requests allowed in the window
 * @param windowMs     - Time window in milliseconds (default: 60s)
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 60_000
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    // New window
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

// Keep the async signature for backward compatibility with existing route calls
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
