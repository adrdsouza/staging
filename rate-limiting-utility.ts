// lib/rate-limit.ts
/**
 * Rate limiting utility for API routes
 * 
 * Provides a simple in-memory rate limiting implementation
 * For production, consider using Redis or another distributed solution
 */

export interface RateLimitOptions {
  interval: number; // Time window in milliseconds
  limit: number; // Maximum number of requests per window
  uniqueTokenPerInterval?: number; // Maximum number of unique tokens (IPs, users, etc.)
}

interface RateLimitEntry {
  count: number;
  timestamp: number;
}

export class RateLimiter {
  private cache: Map<string, RateLimitEntry>;
  private interval: number;
  private limit: number;
  private uniqueTokenPerInterval: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(options: RateLimitOptions) {
    this.cache = new Map();
    this.interval = options.interval;
    this.limit = options.limit;
    this.uniqueTokenPerInterval = options.uniqueTokenPerInterval || 500;

    // Set up automatic cleanup to prevent memory leaks
    if (typeof window === 'undefined') { // Only on server
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, Math.min(options.interval * 2, 60 * 1000)); // Cleanup at least every minute
    }
  }

  /**
   * Check if a token has exceeded rate limits
   * @param token A unique identifier (IP address, user ID, etc.)
   * @returns Promise resolving to true if allowed, rejecting if rate limited
   */
  public async check(token: string): Promise<boolean> {
    const now = Date.now();
    
    // Clean up old entries for this token
    this.cleanupToken(token, now);
    
    // Check current limit
    const entry = this.cache.get(token) || { count: 0, timestamp: now };
    
    // If we're over the limit, reject
    if (entry.count >= this.limit) {
      const resetTime = entry.timestamp + this.interval - now;
      const error = new Error('Rate limit exceeded');
      (error as any).resetTime = resetTime;
      throw error;
    }
    
    // Increment the count
    entry.count++;
    this.cache.set(token, entry);
    
    // Ensure we don't exceed the unique token limit
    if (this.cache.size > this.uniqueTokenPerInterval) {
      // Remove the oldest entry if we're over the limit
      const oldestKey = [...this.cache.entries()]
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
    
    return true;
  }

  /**
   * Get remaining requests for a token
   */
  public getRemainingRequests(token: string): number {
    const now = Date.now();
    this.cleanupToken(token, now);
    
    const entry = this.cache.get(token);
    if (!entry) return this.limit;
    
    return Math.max(0, this.limit - entry.count);
  }

  /**
   * Get time until reset for a token
   */
  public getResetTime(token: string): number {
    const now = Date.now();
    const entry = this.cache.get(token);
    if (!entry) return 0;
    
    return Math.max(0, entry.timestamp + this.interval - now);
  }

  /**
   * Clean up expired entries for a specific token
   */
  private cleanupToken(token: string, now: number): void {
    const entry = this.cache.get(token);
    if (entry && now - entry.timestamp > this.interval) {
      // Reset if the interval has passed
      this.cache.set(token, { count: 0, timestamp: now });
    }
  }

  /**
   * Clean up all expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [token, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.interval) {
        this.cache.delete(token);
      }
    }
  }

  /**
   * Destroy the rate limiter and clear the cleanup interval
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Create a default instance with sensible defaults
const defaultRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  limit: Number(process.env.API_RATE_LIMIT) || 10, // Default 10 requests per minute
  uniqueTokenPerInterval: 500, // Max 500 unique tokens
});

/**
 * Helper function to create a rate limiter
 */
export function rateLimit(options?: Partial<RateLimitOptions>): RateLimiter {
  if (!options) return defaultRateLimiter;
  
  return new RateLimiter({
    interval: options.interval || 60 * 1000,
    limit: options.limit || Number(process.env.API_RATE_LIMIT) || 10,
    uniqueTokenPerInterval: options.uniqueTokenPerInterval || 500,
  });
}

export default rateLimit;
