"""
Disk caching module for HTTP responses.

Provides:
- URL-based cache key generation
- Disk storage of HTTP responses
- TTL-based cache expiration
- Cache hit/miss statistics
"""

from __future__ import annotations
import os
import json
import hashlib
import time
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class DiskCache:
    """
    Simple disk-based cache for HTTP responses.
    
    Cache files are stored as JSON with metadata.
    File naming uses SHA-256 hash of the URL.
    """
    
    def __init__(
        self,
        cache_dir: str = ".cache/church_discovery",
        default_ttl_hours: int = 24,
        enabled: bool = True
    ):
        """
        Initialize the cache.
        
        Args:
            cache_dir: Directory to store cache files
            default_ttl_hours: Default time-to-live in hours
            enabled: Whether caching is enabled
        """
        self.cache_dir = Path(cache_dir)
        self.default_ttl = timedelta(hours=default_ttl_hours)
        self.enabled = enabled
        self.stats = {
            'hits': 0,
            'misses': 0,
            'writes': 0,
            'expired': 0
        }
        
        if enabled:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def _url_to_key(self, url: str) -> str:
        """Generate a cache key from URL."""
        return hashlib.sha256(url.encode('utf-8')).hexdigest()
    
    def _key_to_path(self, key: str) -> Path:
        """Get file path for a cache key."""
        return self.cache_dir / f"{key}.json"
    
    def get(self, url: str, ttl: Optional[timedelta] = None) -> Optional[str]:
        """
        Get cached response for URL.
        
        Args:
            url: The URL to look up
            ttl: Optional custom TTL for this lookup
            
        Returns:
            Cached content if valid, None otherwise
        """
        if not self.enabled:
            self.stats['misses'] += 1
            return None
        
        key = self._url_to_key(url)
        path = self._key_to_path(key)
        
        if not path.exists():
            self.stats['misses'] += 1
            return None
        
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            cached_at = datetime.fromisoformat(data['cached_at'])
            effective_ttl = ttl or self.default_ttl
            
            if datetime.now() - cached_at > effective_ttl:
                self.stats['expired'] += 1
                self.stats['misses'] += 1
                logger.debug(f"Cache expired for {url}")
                return None
            
            self.stats['hits'] += 1
            logger.debug(f"Cache hit for {url}")
            return data['content']
            
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning(f"Cache read error for {url}: {e}")
            self.stats['misses'] += 1
            return None
    
    def set(self, url: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Store response in cache.
        
        Args:
            url: The URL being cached
            content: The response content
            metadata: Optional additional metadata
            
        Returns:
            True if successfully cached
        """
        if not self.enabled:
            return False
        
        key = self._url_to_key(url)
        path = self._key_to_path(key)
        
        data = {
            'url': url,
            'cached_at': datetime.now().isoformat(),
            'content': content,
            'metadata': metadata or {}
        }
        
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False)
            
            self.stats['writes'] += 1
            logger.debug(f"Cached {url}")
            return True
            
        except IOError as e:
            logger.warning(f"Cache write error for {url}: {e}")
            return False
    
    def clear(self, max_age_hours: Optional[int] = None) -> int:
        """
        Clear cache entries.
        
        Args:
            max_age_hours: If provided, only clear entries older than this
            
        Returns:
            Number of entries cleared
        """
        if not self.cache_dir.exists():
            return 0
        
        cleared = 0
        cutoff = None
        if max_age_hours is not None:
            cutoff = datetime.now() - timedelta(hours=max_age_hours)
        
        for path in self.cache_dir.glob("*.json"):
            should_delete = True
            
            if cutoff:
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    cached_at = datetime.fromisoformat(data['cached_at'])
                    should_delete = cached_at < cutoff
                except (json.JSONDecodeError, KeyError, ValueError):
                    should_delete = True
            
            if should_delete:
                try:
                    path.unlink()
                    cleared += 1
                except IOError:
                    pass
        
        return cleared
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total = self.stats['hits'] + self.stats['misses']
        hit_rate = (self.stats['hits'] / total * 100) if total > 0 else 0
        
        return {
            **self.stats,
            'total_requests': total,
            'hit_rate_percent': round(hit_rate, 1),
            'cache_dir': str(self.cache_dir),
            'enabled': self.enabled
        }
    
    def get_size(self) -> Dict[str, Any]:
        """Get cache size information."""
        if not self.cache_dir.exists():
            return {'files': 0, 'bytes': 0, 'mb': 0.0}
        
        files = list(self.cache_dir.glob("*.json"))
        total_bytes = sum(f.stat().st_size for f in files)
        
        return {
            'files': len(files),
            'bytes': total_bytes,
            'mb': round(total_bytes / (1024 * 1024), 2)
        }


class GeocodingCache(DiskCache):
    """
    Specialized cache for geocoding results.
    Uses longer TTL since addresses rarely change location.
    """
    
    def __init__(
        self,
        cache_dir: str = ".cache/geocoding",
        default_ttl_hours: int = 24 * 30  # 30 days
    ):
        super().__init__(cache_dir, default_ttl_hours)
    
    def _address_to_key(self, address: str) -> str:
        """Generate cache key from normalized address."""
        # Normalize the address for consistent keys
        normalized = ' '.join(address.upper().split())
        return hashlib.sha256(normalized.encode('utf-8')).hexdigest()
    
    def get_geocode(self, address: str) -> Optional[Dict[str, float]]:
        """
        Get cached geocode result.
        
        Returns:
            Dict with 'lat' and 'lng' if cached, None otherwise
        """
        key = self._address_to_key(address)
        path = self._key_to_path(key)
        
        if not path.exists():
            self.stats['misses'] += 1
            return None
        
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Check TTL
            cached_at = datetime.fromisoformat(data['cached_at'])
            if datetime.now() - cached_at > self.default_ttl:
                self.stats['expired'] += 1
                self.stats['misses'] += 1
                return None
            
            self.stats['hits'] += 1
            return data.get('geocode')
            
        except (json.JSONDecodeError, KeyError, ValueError):
            self.stats['misses'] += 1
            return None
    
    def set_geocode(
        self,
        address: str,
        lat: float,
        lng: float,
        provider: str = "unknown"
    ) -> bool:
        """
        Cache a geocode result.
        
        Args:
            address: The address that was geocoded
            lat: Latitude
            lng: Longitude
            provider: Geocoding service used
        """
        key = self._address_to_key(address)
        path = self._key_to_path(key)
        
        data = {
            'address': address,
            'cached_at': datetime.now().isoformat(),
            'geocode': {'lat': lat, 'lng': lng},
            'provider': provider
        }
        
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f)
            self.stats['writes'] += 1
            return True
        except IOError:
            return False


# Global cache instance
_http_cache: Optional[DiskCache] = None
_geocode_cache: Optional[GeocodingCache] = None


def get_http_cache(cache_dir: Optional[str] = None) -> DiskCache:
    """Get or create the HTTP cache singleton."""
    global _http_cache
    if _http_cache is None:
        _http_cache = DiskCache(
            cache_dir=cache_dir or ".cache/church_discovery/http"
        )
    return _http_cache


def get_geocode_cache(cache_dir: Optional[str] = None) -> GeocodingCache:
    """Get or create the geocoding cache singleton."""
    global _geocode_cache
    if _geocode_cache is None:
        _geocode_cache = GeocodingCache(
            cache_dir=cache_dir or ".cache/church_discovery/geocoding"
        )
    return _geocode_cache
