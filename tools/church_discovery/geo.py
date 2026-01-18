"""
Geocoding module for church discovery.

This module is a placeholder for optional geocoding functionality.
Geocoding is NOT implemented by default in phase 1.

If implemented, should:
- Use a legally/operationally safe provider
- Respect rate limits
- Cache results to avoid repeat calls
- Only run when --geocode flag is passed
"""

from __future__ import annotations

import logging
from typing import Optional, Tuple, Dict, Any

from .cache import get_geocode_cache
from .models import Address, GeoLocation

logger = logging.getLogger(__name__)


class GeocodingNotImplementedError(NotImplementedError):
    """Raised when geocoding is attempted but not implemented."""
    pass


class Geocoder:
    """
    Base geocoder class.
    
    Override this class to implement actual geocoding.
    The default implementation raises NotImplementedError.
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        rate_limit_per_second: float = 1.0,
        use_cache: bool = True
    ):
        """
        Initialize geocoder.
        
        Args:
            api_key: API key for the geocoding service
            rate_limit_per_second: Maximum requests per second
            use_cache: Whether to cache results
        """
        self.api_key = api_key
        self.rate_limit = rate_limit_per_second
        self.cache = get_geocode_cache() if use_cache else None
        self._enabled = False
    
    @property
    def enabled(self) -> bool:
        """Check if geocoding is enabled and configured."""
        return self._enabled and bool(self.api_key)
    
    def geocode_address(self, address: Address) -> Optional[GeoLocation]:
        """
        Geocode an address to lat/lng coordinates.
        
        Args:
            address: Address to geocode
            
        Returns:
            GeoLocation with lat/lng, or None if failed
            
        Raises:
            GeocodingNotImplementedError: If geocoding is not implemented
        """
        raise GeocodingNotImplementedError(
            "Geocoding is not implemented in phase 1. "
            "Set geo.lat and geo.lng to null for now."
        )
    
    def geocode_string(self, address_string: str) -> Optional[GeoLocation]:
        """
        Geocode an address string to lat/lng coordinates.
        
        Args:
            address_string: Full address as a single string
            
        Returns:
            GeoLocation with lat/lng, or None if failed
            
        Raises:
            GeocodingNotImplementedError: If geocoding is not implemented
        """
        raise GeocodingNotImplementedError(
            "Geocoding is not implemented in phase 1."
        )


class CachedGeocoder(Geocoder):
    """
    Geocoder that checks cache before making API calls.
    """
    
    def geocode_string(self, address_string: str) -> Optional[GeoLocation]:
        """
        Geocode with caching.
        
        First checks cache, then falls back to API call.
        """
        # Check cache
        if self.cache:
            cached = self.cache.get_geocode(address_string)
            if cached:
                return GeoLocation(
                    lat=cached['lat'],
                    lng=cached['lng'],
                    accuracy='cached'
                )
        
        # Would call API here - but not implemented
        raise GeocodingNotImplementedError(
            "Geocoding API call not implemented. "
            "Use cached coordinates from source or set to null."
        )


# Placeholder implementations for future providers


class NominatimGeocoder(Geocoder):
    """
    OpenStreetMap Nominatim geocoder.
    
    Free but has strict usage policy:
    - Max 1 request/second
    - Must cache results
    - Must include contact info in User-Agent
    
    NOT IMPLEMENTED - placeholder for future.
    """
    
    BASE_URL = "https://nominatim.openstreetmap.org/search"
    
    def __init__(self, user_agent: str = "OrthodoxMetrics/1.0"):
        super().__init__(rate_limit_per_second=1.0)
        self.user_agent = user_agent


class GoogleGeocoder(Geocoder):
    """
    Google Geocoding API.
    
    Requires API key and billing account.
    Good accuracy but costs money.
    
    NOT IMPLEMENTED - placeholder for future.
    """
    
    BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
    
    def __init__(self, api_key: str):
        super().__init__(api_key=api_key, rate_limit_per_second=50.0)


def geocode_if_enabled(
    address: Address,
    geocoder: Optional[Geocoder] = None
) -> Optional[GeoLocation]:
    """
    Attempt to geocode an address if geocoding is enabled.
    
    Returns None silently if geocoding is not available.
    
    Args:
        address: Address to geocode
        geocoder: Optional geocoder instance
        
    Returns:
        GeoLocation or None
    """
    if geocoder is None:
        return None
    
    if not geocoder.enabled:
        return None
    
    try:
        return geocoder.geocode_address(address)
    except GeocodingNotImplementedError:
        return None
    except Exception as e:
        logger.warning(f"Geocoding failed: {e}")
        return None


def format_address_for_geocoding(address: Address) -> str:
    """
    Format an address for geocoding API input.
    
    Args:
        address: Address object
        
    Returns:
        Formatted address string
    """
    parts = []
    
    if address.street:
        parts.append(address.street)
    
    if address.city:
        parts.append(address.city)
    
    if address.state:
        parts.append(address.state)
    
    if address.zip:
        parts.append(address.zip)
    
    return ", ".join(parts)
