"""
Tests for caching module.
"""

import pytest
import sys
import tempfile
import shutil
from pathlib import Path
from datetime import timedelta

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from tools.church_discovery.cache import DiskCache, GeocodingCache


class TestDiskCache:
    """Tests for DiskCache."""
    
    @pytest.fixture
    def temp_cache_dir(self):
        """Create a temporary directory for cache files."""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    def test_set_and_get(self, temp_cache_dir):
        cache = DiskCache(cache_dir=temp_cache_dir)
        
        cache.set("http://example.com/page1", "content1")
        result = cache.get("http://example.com/page1")
        
        assert result == "content1"
    
    def test_cache_miss(self, temp_cache_dir):
        cache = DiskCache(cache_dir=temp_cache_dir)
        
        result = cache.get("http://example.com/nonexistent")
        assert result is None
    
    def test_cache_stats(self, temp_cache_dir):
        cache = DiskCache(cache_dir=temp_cache_dir)
        
        cache.set("http://example.com/page1", "content1")
        cache.get("http://example.com/page1")  # Hit
        cache.get("http://example.com/page2")  # Miss
        
        stats = cache.get_stats()
        assert stats['hits'] == 1
        assert stats['misses'] == 1
        assert stats['writes'] == 1
    
    def test_disabled_cache(self, temp_cache_dir):
        cache = DiskCache(cache_dir=temp_cache_dir, enabled=False)
        
        cache.set("http://example.com/page1", "content1")
        result = cache.get("http://example.com/page1")
        
        assert result is None  # Cache is disabled
    
    def test_url_hashing(self, temp_cache_dir):
        cache = DiskCache(cache_dir=temp_cache_dir)
        
        # Different URLs should have different keys
        key1 = cache._url_to_key("http://example.com/page1")
        key2 = cache._url_to_key("http://example.com/page2")
        
        assert key1 != key2
        assert len(key1) == 64  # SHA-256 produces 64 hex chars
    
    def test_cache_size(self, temp_cache_dir):
        cache = DiskCache(cache_dir=temp_cache_dir)
        
        cache.set("http://example.com/page1", "content1")
        cache.set("http://example.com/page2", "content2")
        
        size_info = cache.get_size()
        assert size_info['files'] == 2
        assert size_info['bytes'] > 0
    
    def test_clear_cache(self, temp_cache_dir):
        cache = DiskCache(cache_dir=temp_cache_dir)
        
        cache.set("http://example.com/page1", "content1")
        cache.set("http://example.com/page2", "content2")
        
        cleared = cache.clear()
        assert cleared == 2
        
        # Should be empty now
        size_info = cache.get_size()
        assert size_info['files'] == 0


class TestGeocodingCache:
    """Tests for GeocodingCache."""
    
    @pytest.fixture
    def temp_cache_dir(self):
        """Create a temporary directory for cache files."""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    def test_set_and_get_geocode(self, temp_cache_dir):
        cache = GeocodingCache(cache_dir=temp_cache_dir)
        
        cache.set_geocode("123 Main St, Boston, MA", 42.3601, -71.0589, "test")
        result = cache.get_geocode("123 Main St, Boston, MA")
        
        assert result is not None
        assert result['lat'] == 42.3601
        assert result['lng'] == -71.0589
    
    def test_address_normalization(self, temp_cache_dir):
        cache = GeocodingCache(cache_dir=temp_cache_dir)
        
        cache.set_geocode("123 main st, boston, ma", 42.3601, -71.0589, "test")
        
        # Should find with different case
        result = cache.get_geocode("123 MAIN ST, BOSTON, MA")
        assert result is not None
    
    def test_geocode_miss(self, temp_cache_dir):
        cache = GeocodingCache(cache_dir=temp_cache_dir)
        
        result = cache.get_geocode("Unknown Address")
        assert result is None
