"""
Orthodox Church Discovery Pipeline

A production-grade system for discovering and maintaining a canonical list
of Orthodox Christian parishes in the United States.

Features:
- Multi-source scraping (Assembly of Bishops primary, others planned)
- Robust HTML parsing with error handling
- Disk caching for respectful scraping
- Rate limiting and exponential backoff
- robots.txt compliance
- Data normalization and deduplication
- Stable deterministic ID generation
- Comprehensive validation and reporting
- JSON output ready for MariaDB import

Usage:
    # From command line
    python -m tools.church_discovery.cli fetch --source assembly
    python -m tools.church_discovery.cli build-canonical --in raw.json --out canonical.json
    python -m tools.church_discovery.cli validate --in canonical.json
    python -m tools.church_discovery.cli run-all

    # Programmatic usage
    from tools.church_discovery import fetch_assembly_parishes, build_canonical

    result = fetch_assembly_parishes()
    canonical = build_canonical(result.records)
"""

__version__ = "0.1.0"

# Lazy imports to avoid import-time failures if dependencies aren't installed
def __getattr__(name):
    """Lazy import handler."""
    
    # Models - no external dependencies
    if name in (
        'RawParishRecord', 'CanonicalChurch', 'Address', 'Contact', 
        'GeoLocation', 'Clergy', 'ValidationReport', 'JURISDICTION_CODES', 'US_STATES'
    ):
        from . import models
        return getattr(models, name)
    
    # Normalize - no external dependencies  
    if name in (
        'normalize_name', 'normalize_state', 'normalize_zip',
        'normalize_phone', 'normalize_website', 'parse_city_state_zip'
    ):
        from . import normalize
        return getattr(normalize, name)
    
    # Cache - no external dependencies
    if name in ('DiskCache', 'get_http_cache', 'get_geocode_cache'):
        from . import cache
        return getattr(cache, name)
    
    # Validate - no external dependencies
    if name in ('ChurchValidator', 'validate_canonical_file', 'validate_churches'):
        from . import validate
        return getattr(validate, name)
    
    # Sources - requires requests, beautifulsoup4
    if name in ('AssemblyOfBishopsSource', 'fetch_assembly_parishes', 'ScrapeResult', 'RobotsDisallowedError'):
        from .sources import assembly_of_bishops
        return getattr(assembly_of_bishops, name)
    
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    # Models
    'RawParishRecord',
    'CanonicalChurch', 
    'Address',
    'Contact',
    'GeoLocation',
    'Clergy',
    'ValidationReport',
    'JURISDICTION_CODES',
    'US_STATES',
    
    # Sources
    'AssemblyOfBishopsSource',
    'fetch_assembly_parishes',
    'ScrapeResult',
    'RobotsDisallowedError',
    
    # Normalization
    'normalize_name',
    'normalize_state',
    'normalize_zip',
    'normalize_phone',
    'normalize_website',
    'parse_city_state_zip',
    
    # Validation
    'ChurchValidator',
    'validate_canonical_file',
    'validate_churches',
    
    # Cache
    'DiskCache',
    'get_http_cache',
    'get_geocode_cache',
]
