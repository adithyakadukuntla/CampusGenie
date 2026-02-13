import hashlib
import time
from typing import Optional, Dict, Tuple

class QueryCache:
    """
    In-memory cache for storing query results
    Uses LRU-like eviction when max size is reached
    """
    def __init__(self, max_size: int = 100, ttl_seconds: int = 3600):
        """
        Initialize cache
        
        Args:
            max_size: Maximum number of entries to store
            ttl_seconds: Time-to-live for cache entries (default 1 hour)
        """
        self.cache: Dict[str, Tuple[dict, float]] = {}
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self.hits = 0
        self.misses = 0
    
    def _hash_query(self, query: str) -> str:
        """Create a hash key from the query string"""
        return hashlib.md5(query.lower().strip().encode()).hexdigest()
    
    def get(self, query: str) -> Optional[dict]:
        """
        Retrieve cached result for a query
        
        Args:
            query: User query string
            
        Returns:
            Cached result dict or None if not found/expired
        """
        key = self._hash_query(query)
        
        if key in self.cache:
            result, timestamp = self.cache[key]
            
            # Check if entry has expired
            if time.time() - timestamp < self.ttl_seconds:
                self.hits += 1
                print(f"✓ Cache HIT for query: {query[:50]}...")
                return result
            else:
                # Remove expired entry
                del self.cache[key]
                print(f"✗ Cache EXPIRED for query: {query[:50]}...")
        
        self.misses += 1
        print(f"✗ Cache MISS for query: {query[:50]}...")
        return None
    
    def set(self, query: str, result: dict):
        """
        Store a query result in cache
        
        Args:
            query: User query string
            result: Result dictionary to cache
        """
        key = self._hash_query(query)
        
        # Evict oldest entry if cache is full
        if len(self.cache) >= self.max_size and key not in self.cache:
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k][1])
            del self.cache[oldest_key]
            print(f"⚠ Cache EVICTED oldest entry")
        
        self.cache[key] = (result, time.time())
        print(f"✓ Cache STORED for query: {query[:50]}...")
    
    def clear(self):
        """Clear all cache entries"""
        self.cache.clear()
        self.hits = 0
        self.misses = 0
        print("✓ Cache CLEARED")
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        
        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": f"{hit_rate:.2f}%",
            "ttl_seconds": self.ttl_seconds
        }

# Global cache instance
query_cache = QueryCache(max_size=100, ttl_seconds=3600)
