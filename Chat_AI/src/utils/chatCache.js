/**
 * Frontend Cache Utility using localStorage
 * Provides fast client-side caching for chatbot queries
 */

const CACHE_PREFIX = 'campusgenie_cache_';
const CACHE_TTL = 3600000; // 1 hour in milliseconds
const MAX_CACHE_SIZE = 50; // Maximum number of cached queries

class ChatCache {
  constructor() {
    this.cleanExpiredEntries();
  }

  /**
   * Generate a cache key from query string
   */
  _getCacheKey(query) {
    return CACHE_PREFIX + query.toLowerCase().trim();
  }

  /**
   * Get cached result for a query
   */
  get(query) {
    try {
      const key = this._getCacheKey(query);
      const cached = localStorage.getItem(key);
      
      if (!cached) {
        console.log('❌ Cache MISS:', query.substring(0, 50));
        return null;
      }

      const { data, timestamp } = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() - timestamp > CACHE_TTL) {
        localStorage.removeItem(key);
        console.log('⏰ Cache EXPIRED:', query.substring(0, 50));
        return null;
      }

      console.log('✅ Cache HIT:', query.substring(0, 50));
      return data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Store a query result in cache
   */
  set(query, data) {
    try {
      const key = this._getCacheKey(query);
      
      // Check cache size and evict if necessary
      this._evictIfNeeded();
      
      const cacheEntry = {
        data,
        timestamp: Date.now()
      };
      
      localStorage.setItem(key, JSON.stringify(cacheEntry));
      console.log('💾 Cache STORED:', query.substring(0, 50));
    } catch (error) {
      const key = this._getCacheKey(query);
      console.error('Cache set error:', error);
      // If localStorage is full, clear old entries
      if (error.name === 'QuotaExceededError') {
        this.clear();
        // Try again
        try {
          localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) {
          console.error('Failed to cache after clearing:', e);
        }
      }
    }
  }

  /**
   * Evict oldest entries if cache is too large
   */
  _evictIfNeeded() {
    const cacheKeys = this._getCacheKeys();
    
    if (cacheKeys.length >= MAX_CACHE_SIZE) {
      // Get timestamps and sort by age
      const entries = cacheKeys.map(key => {
        try {
          const cached = localStorage.getItem(key);
          const { timestamp } = JSON.parse(cached);
          return { key, timestamp };
        } catch {
          return { key, timestamp: 0 };
        }
      });
      
      entries.sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove oldest 20%
      const toRemove = Math.ceil(MAX_CACHE_SIZE * 0.2);
      for (let i = 0; i < toRemove; i++) {
        localStorage.removeItem(entries[i].key);
      }
      
      console.log(`🗑️ Evicted ${toRemove} old cache entries`);
    }
  }

  /**
   * Get all cache keys
   */
  _getCacheKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Clean expired entries
   */
  cleanExpiredEntries() {
    const keys = this._getCacheKeys();
    let cleaned = 0;
    
    keys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        const { timestamp } = JSON.parse(cached);
        
        if (Date.now() - timestamp > CACHE_TTL) {
          localStorage.removeItem(key);
          cleaned++;
        }
      } catch (error) {
        // Remove corrupted entries
        localStorage.removeItem(key);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const keys = this._getCacheKeys();
    keys.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ Cleared ${keys.length} cache entries`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const keys = this._getCacheKeys();
    let validEntries = 0;
    let expiredEntries = 0;
    
    keys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        const { timestamp } = JSON.parse(cached);
        
        if (Date.now() - timestamp > CACHE_TTL) {
          expiredEntries++;
        } else {
          validEntries++;
        }
      } catch {
        expiredEntries++;
      }
    });
    
    return {
      total: keys.length,
      valid: validEntries,
      expired: expiredEntries,
      maxSize: MAX_CACHE_SIZE,
      ttl: `${CACHE_TTL / 1000 / 60} minutes`
    };
  }
}

// Export singleton instance
const chatCache = new ChatCache();
export default chatCache;
