// lib/cache/cache-service.ts
import { Redis } from 'ioredis';
import { getRedisClient, isRedisAvailable } from '@/lib/redis/client';

// Cache item structure
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

// Cache options
export interface CacheOptions {
  ttl?: number;                 // Time to live in seconds
  namespace?: string;           // Cache namespace for grouping keys
  useLocalFallback?: boolean;   // Whether to use local memory as fallback
}

// Default options
const defaultOptions: CacheOptions = {
  ttl: 3600,                    // 1 hour
  namespace: 'app:cache',       // Default namespace
  useLocalFallback: true,       // Use local fallback by default
};

// In-memory cache for fallback
const memoryCache = new Map<string, CacheItem<any>>();

class CacheService {
  private redis: Redis;
  private isRedisAvailable: boolean = false;
  private memoryCache: Map<string, CacheItem<any>>;

  constructor() {
    this.redis = getRedisClient();
    this.memoryCache = memoryCache;
    
    // Check Redis availability
    this.updateRedisAvailability();
    
    // Set up periodic cleanup of memory cache
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanupMemoryCache(), 60 * 1000); // Every minute
    }
  }

  // Update Redis availability status
  private async updateRedisAvailability(): Promise<void> {
    try {
      this.isRedisAvailable = await isRedisAvailable();
    } catch (error) {
      this.isRedisAvailable = false;
      console.warn('Redis availability check failed, using fallback');
    }
  }

  // Format a cache key with namespace
  private formatKey(key: string, namespace?: string): string {
    const ns = namespace || defaultOptions.namespace;
    return `${ns}:${key}`;
  }

  // Get an item from cache
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const opts = { ...defaultOptions, ...options };
    const formattedKey = this.formatKey(key, opts.namespace);
    
    // Try Redis first if available
    if (this.isRedisAvailable) {
      try {
        const cachedData = await this.redis.get(formattedKey);
        
        if (cachedData) {
          const parsed = JSON.parse(cachedData) as CacheItem<T>;
          return parsed.data;
        }
      } catch (error) {
        console.warn(`Redis get error for key ${formattedKey}:`, error);
        // Fall back to memory cache
        await this.updateRedisAvailability();
      }
    }
    
    // Use memory cache as fallback
    if (opts.useLocalFallback) {
      const memoryItem = this.memoryCache.get(formattedKey);
      
      if (memoryItem && Date.now() < memoryItem.expiry) {
        return memoryItem.data;
      }
    }
    
    return null;
  }

  // Set an item in cache
  async set<T>(key: string, data: T, options?: CacheOptions): Promise<boolean> {
    const opts = { ...defaultOptions, ...options };
    const formattedKey = this.formatKey(key, opts.namespace);
    
    const now = Date.now();
    const ttlMs = opts.ttl! * 1000;
    
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: now,
      expiry: now + ttlMs,
    };
    
    // Try Redis first if available
    if (this.isRedisAvailable) {
      try {
        await this.redis.set(
          formattedKey,
          JSON.stringify(cacheItem),
          'EX',
          opts.ttl
        );
        return true;
      } catch (error) {
        console.warn(`Redis set error for key ${formattedKey}:`, error);
        // Fall back to memory cache
        await this.updateRedisAvailability();
      }
    }
    
    // Use memory cache as fallback
    if (opts.useLocalFallback) {
      this.memoryCache.set(formattedKey, cacheItem);
      return true;
    }
    
    return false;
  }

  // Delete an item from cache
  async delete(key: string, namespace?: string): Promise<boolean> {
    const formattedKey = this.formatKey(key, namespace);
    
    let redisSuccess = true;
    
    // Try Redis first if available
    if (this.isRedisAvailable) {
      try {
        await this.redis.del(formattedKey);
      } catch (error) {
        console.warn(`Redis delete error for key ${formattedKey}:`, error);
        redisSuccess = false;
        await this.updateRedisAvailability();
      }
    }
    
    // Always remove from memory cache too
    this.memoryCache.delete(formattedKey);
    
    return redisSuccess || this.isRedisAvailable === false;
  }

  // Clear all cache in a namespace
  async clear(namespace?: string): Promise<boolean> {
    const ns = namespace || defaultOptions.namespace;
    let redisSuccess = true;
    
    // Try Redis first if available
    if (this.isRedisAvailable) {
      try {
        // Find all keys in the namespace
        const keys = await this.redis.keys(`${ns}:*`);
        
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.warn(`Redis clear error for namespace ${ns}:`, error);
        redisSuccess = false;
        await this.updateRedisAvailability();
      }
    }
    
    // Also clear memory cache for this namespace
    for (const [key] of this.memoryCache.entries()) {
      if (key.startsWith(`${ns}:`)) {
        this.memoryCache.delete(key);
      }
    }
    
    return redisSuccess || this.isRedisAvailable === false;
  }

  // Clean up expired items from memory cache
  private cleanupMemoryCache(): void {
    const now = Date.now();
    
    for (const [key, item] of this.memoryCache.entries()) {
      if (now > item.expiry) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Get cache stats
  async getStats(): Promise<{
    redisAvailable: boolean;
    memorySize: number;
    redisSize?: number;
  }> {
    let redisSize: number | undefined;
    
    if (this.isRedisAvailable) {
      try {
        const info = await this.redis.info('keyspace');
        // Extract key count from info response
        const match = info.match(/keys=(\d+)/);
        if (match && match[1]) {
          redisSize = parseInt(match[1], 10);
        }
      } catch (error) {
        console.warn('Failed to get Redis stats:', error);
        await this.updateRedisAvailability();
      }
    }
    
    return {
      redisAvailable: this.isRedisAvailable,
      memorySize: this.memoryCache.size,
      redisSize,
    };
  }
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService;
