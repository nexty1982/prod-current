/**
 * Orthodox Headlines Caching System
 * Provides memory and Redis-based caching for headlines API
 * Reduces database load and improves performance
 */

const NodeCache = require('node-cache');

// Configuration
const CACHE_CONFIG = {
    MEMORY_TTL: 3 * 60 * 60, // 3 hours in seconds
    REDIS_TTL: 6 * 60 * 60,  // 6 hours in seconds
    MEMORY_CHECK_PERIOD: 60, // Check for expired keys every 60 seconds
    MAX_MEMORY_KEYS: 100,    // Maximum keys in memory cache
    ENABLE_REDIS: process.env.REDIS_URL ? true : false
};

// Memory cache instance
const memoryCache = new NodeCache({
    stdTTL: CACHE_CONFIG.MEMORY_TTL,
    checkperiod: CACHE_CONFIG.MEMORY_CHECK_PERIOD,
    maxKeys: CACHE_CONFIG.MAX_MEMORY_KEYS,
    useClones: false // Better performance, but be careful with object mutations
});

// Redis client (optional)
let redisClient = null;
if (CACHE_CONFIG.ENABLE_REDIS) {
    try {
        const redis = require('redis');
        redisClient = redis.createClient({
            url: process.env.REDIS_URL,
            retry_strategy: (options) => {
                if (options.error && options.error.code === 'ECONNREFUSED') {
                    console.log('Redis connection refused');
                    return new Error('Redis server connection refused');
                }
                if (options.total_retry_time > 1000 * 60 * 60) {
                    return new Error('Retry time exhausted');
                }
                if (options.attempt > 10) {
                    return undefined;
                }
                return Math.min(options.attempt * 100, 3000);
            }
        });

        redisClient.on('error', (err) => {
            console.log('Redis Client Error:', err);
        });

        redisClient.on('connect', () => {
            console.log('✅ Redis connected for headlines caching');
        });

        redisClient.connect();
    } catch (error) {
        console.log('⚠️ Redis not available, using memory cache only:', error.message);
        redisClient = null;
    }
}

/**
 * Headlines Cache Class
 */
class HeadlinesCache {
    constructor() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
    }

    /**
     * Generate cache key for headlines request
     */
    generateKey(params) {
        const { source = 'all', lang = 'en', limit = 20, offset = 0 } = params;
        return `headlines:${source}:${lang}:${limit}:${offset}`;
    }

    /**
     * Generate cache key for sources list
     */
    generateSourcesKey() {
        return 'headlines:sources';
    }

    /**
     * Generate cache key for languages list
     */
    generateLanguagesKey() {
        return 'headlines:languages';
    }

    /**
     * Get cached data
     */
    async get(key) {
        try {
            // Try memory cache first (fastest)
            const memoryResult = memoryCache.get(key);
            if (memoryResult) {
                this.stats.hits++;
                console.log(`📋 Memory cache hit: ${key}`);
                return memoryResult;
            }

            // Try Redis cache if available
            if (redisClient && redisClient.isOpen) {
                const redisResult = await redisClient.get(key);
                if (redisResult) {
                    const parsed = JSON.parse(redisResult);
                    
                    // Store in memory cache for faster future access
                    memoryCache.set(key, parsed, CACHE_CONFIG.MEMORY_TTL);
                    
                    this.stats.hits++;
                    console.log(`📋 Redis cache hit: ${key}`);
                    return parsed;
                }
            }

            this.stats.misses++;
            console.log(`📋 Cache miss: ${key}`);
            return null;
        } catch (error) {
            console.error('❌ Cache get error:', error.message);
            this.stats.misses++;
            return null;
        }
    }

    /**
     * Set cached data
     */
    async set(key, data, customTTL = null) {
        try {
            const memoryTTL = customTTL || CACHE_CONFIG.MEMORY_TTL;
            const redisTTL = customTTL || CACHE_CONFIG.REDIS_TTL;

            // Store in memory cache
            memoryCache.set(key, data, memoryTTL);

            // Store in Redis cache if available
            if (redisClient && redisClient.isOpen) {
                await redisClient.setEx(key, redisTTL, JSON.stringify(data));
            }

            this.stats.sets++;
            console.log(`💾 Cached: ${key} (TTL: ${memoryTTL}s)`);
        } catch (error) {
            console.error('❌ Cache set error:', error.message);
        }
    }

    /**
     * Delete cached data
     */
    async delete(key) {
        try {
            // Delete from memory cache
            memoryCache.del(key);

            // Delete from Redis cache if available
            if (redisClient && redisClient.isOpen) {
                await redisClient.del(key);
            }

            this.stats.deletes++;
            console.log(`🗑️ Cache deleted: ${key}`);
        } catch (error) {
            console.error('❌ Cache delete error:', error.message);
        }
    }

    /**
     * Clear all headlines cache
     */
    async clearAll() {
        try {
            // Clear memory cache
            const memoryKeys = memoryCache.keys();
            const headlineKeys = memoryKeys.filter(key => key.startsWith('headlines:'));
            headlineKeys.forEach(key => memoryCache.del(key));

            // Clear Redis cache if available
            if (redisClient && redisClient.isOpen) {
                const redisKeys = await redisClient.keys('headlines:*');
                if (redisKeys.length > 0) {
                    await redisClient.del(redisKeys);
                }
            }

            console.log(`🧹 Cleared ${headlineKeys.length} cached headline entries`);
        } catch (error) {
            console.error('❌ Cache clear error:', error.message);
        }
    }

    /**
     * Cache wrapper for headlines API
     */
    async cacheHeadlines(params, dataLoader) {
        const key = this.generateKey(params);
        
        // Try to get from cache first
        const cached = await this.get(key);
        if (cached) {
            return cached;
        }

        // Load data from database
        const data = await dataLoader();
        
        // Cache the result
        await this.set(key, data);
        
        return data;
    }

    /**
     * Cache wrapper for sources API
     */
    async cacheSources(dataLoader) {
        const key = this.generateSourcesKey();
        
        // Try to get from cache first
        const cached = await this.get(key);
        if (cached) {
            return cached;
        }

        // Load data from database
        const data = await dataLoader();
        
        // Cache the result (sources change less frequently, longer TTL)
        await this.set(key, data, CACHE_CONFIG.MEMORY_TTL * 2);
        
        return data;
    }

    /**
     * Cache wrapper for languages API
     */
    async cacheLanguages(dataLoader) {
        const key = this.generateLanguagesKey();
        
        // Try to get from cache first
        const cached = await this.get(key);
        if (cached) {
            return cached;
        }

        // Load data from database
        const data = await dataLoader();
        
        // Cache the result (languages change less frequently, longer TTL)
        await this.set(key, data, CACHE_CONFIG.MEMORY_TTL * 2);
        
        return data;
    }

    /**
     * Invalidate cache when new articles are added
     */
    async invalidateHeadlinesCache() {
        try {
            console.log('🔄 Invalidating headlines cache...');
            
            // Get all cache keys
            const memoryKeys = memoryCache.keys();
            const headlineKeys = memoryKeys.filter(key => key.startsWith('headlines:'));
            
            // Delete all headline-related cache entries
            headlineKeys.forEach(key => memoryCache.del(key));
            
            // Clear Redis cache if available
            if (redisClient && redisClient.isOpen) {
                const redisKeys = await redisClient.keys('headlines:*');
                if (redisKeys.length > 0) {
                    await redisClient.del(redisKeys);
                }
            }

            console.log(`🗑️ Invalidated ${headlineKeys.length} cache entries`);
        } catch (error) {
            console.error('❌ Cache invalidation error:', error.message);
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;

        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            memoryKeys: memoryCache.keys().length,
            memorySize: memoryCache.getStats(),
            redisConnected: redisClient ? redisClient.isOpen : false,
            config: CACHE_CONFIG
        };
    }

    /**
     * Warm up cache with popular queries
     */
    async warmUp(dataLoader) {
        console.log('🔥 Warming up headlines cache...');
        
        const popularQueries = [
            { source: 'all', lang: 'en', limit: 20, offset: 0 },
            { source: 'GOARCH', lang: 'en', limit: 20, offset: 0 },
            { source: 'OCA', lang: 'en', limit: 20, offset: 0 },
            { source: 'ORTHODOX_TIMES', lang: 'en', limit: 20, offset: 0 },
            { source: 'all', lang: 'el', limit: 20, offset: 0 },
            { source: 'all', lang: 'ru', limit: 20, offset: 0 }
        ];

        for (const params of popularQueries) {
            try {
                await this.cacheHeadlines(params, () => dataLoader(params));
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
            } catch (error) {
                console.error(`❌ Error warming up cache for ${JSON.stringify(params)}:`, error.message);
            }
        }

        console.log('✅ Cache warm-up completed');
    }

    /**
     * Close connections
     */
    async close() {
        try {
            memoryCache.close();
            if (redisClient && redisClient.isOpen) {
                await redisClient.disconnect();
            }
            console.log('✅ Headlines cache connections closed');
        } catch (error) {
            console.error('❌ Error closing cache connections:', error.message);
        }
    }
}

// Export singleton instance
const headlinesCache = new HeadlinesCache();

module.exports = {
    headlinesCache,
    HeadlinesCache,
    CACHE_CONFIG
}; 