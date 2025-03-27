// lib/redis/client.ts
import { Redis } from 'ioredis';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  retryStrategy: (times: number) => {
    // Retry with exponential backoff with cap at 10 seconds
    const delay = Math.min(times * 50, 10000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

// Create a Redis client singleton
let redisClient: Redis | null = null;

// Initialize the Redis client
export function getRedisClient(): Redis {
  if (!redisClient) {
    if (process.env.REDIS_URL) {
      redisClient = new Redis(process.env.REDIS_URL);
    } else {
      redisClient = new Redis(redisConfig);
    }

    // Handle connection errors
    redisClient.on('error', (error) => {
      console.error('Redis connection error:', error);
      // Don't throw, allow graceful fallback
    });

    // Log successful connection
    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  return redisClient;
}

// Close the Redis connection (useful for tests)
export function closeRedisConnection(): Promise<void> {
  return new Promise((resolve) => {
    if (redisClient) {
      redisClient.quit().then(() => {
        redisClient = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Check if Redis is available (for fallback logic)
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    return false;
  }
}

// Export a default instance
export default getRedisClient();
