/**
 * In-memory IP rate limiter for API endpoints (architecture.md §11.1).
 * Prevents rapid double-submissions, server resource exhaustion, and Groq API key abuse.
 */

const WINDOW_MS = 60000; // 1 minute window
const MAX_LIMIT = 10; // max 10 requests per minute

interface ClientRecord {
  timestamps: number[];
}

const clientHistory = new Map<string, ClientRecord>();

// Periodically clean up old entries to prevent memory growth (every 5 minutes)
if (typeof global !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalAny = global as any;
  if (!globalAny.rateLimitCleanupInterval) {
    globalAny.rateLimitCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [ip, record] of clientHistory.entries()) {
        const validTimestamps = record.timestamps.filter(
          (t) => now - t < WINDOW_MS
        );
        if (validTimestamps.length === 0) {
          clientHistory.delete(ip);
        } else {
          record.timestamps = validTimestamps;
        }
      }
    }, 300000); // 5 minutes
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Checks if a given IP address has exceeded the rate limit.
 * @param ip Client IP address
 * @returns RateLimitResult
 */
export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  let record = clientHistory.get(ip);

  if (!record) {
    record = { timestamps: [] };
    clientHistory.set(ip, record);
  }

  // Filter timestamps within the current window
  record.timestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);

  if (record.timestamps.length >= MAX_LIMIT) {
    const oldestTimestamp = record.timestamps[0];
    const resetTime = oldestTimestamp + WINDOW_MS;
    return {
      success: false,
      limit: MAX_LIMIT,
      remaining: 0,
      reset: resetTime,
    };
  }

  // Add the current request timestamp
  record.timestamps.push(now);

  const oldestTimestamp = record.timestamps[0];
  const resetTime = oldestTimestamp + WINDOW_MS;

  return {
    success: true,
    limit: MAX_LIMIT,
    remaining: MAX_LIMIT - record.timestamps.length,
    reset: resetTime,
  };
}

/**
 * Resolves the client IP address from request headers.
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",");
    return ips[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
