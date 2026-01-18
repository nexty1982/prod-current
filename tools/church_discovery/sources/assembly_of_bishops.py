"""
Assembly of Canonical Orthodox Bishops parish directory scraper.

This module scrapes the unified parish directory at:
https://www.assemblyofbishops.org/directories/parishes/

The directory allows filtering by:
- Jurisdiction (searchType=jurisdiction&jur=CODE)
- Proximity (searchType=proximity&search_coordinates=...)

We iterate through all jurisdictions to get complete coverage.
"""

from __future__ import annotations

import re
import time
import logging
import urllib.parse
import urllib.robotparser
from datetime import datetime
from typing import List, Dict, Any, Optional, Generator
from dataclasses import dataclass, field

import requests
from bs4 import BeautifulSoup

from ..models import RawParishRecord, Clergy, JURISDICTION_CODES, US_STATES
from ..cache import get_http_cache
from ..normalize import (
    normalize_whitespace,
    parse_city_state_zip,
    extract_phone_from_text,
    extract_fax_from_text,
    normalize_website
)

logger = logging.getLogger(__name__)


@dataclass
class ScrapeResult:
    """Result of a scrape operation."""
    records: List[RawParishRecord] = field(default_factory=list)
    errors: List[Dict[str, Any]] = field(default_factory=list)
    jurisdictions_scraped: List[str] = field(default_factory=list)
    total_fetched: int = 0
    cache_hits: int = 0
    cache_misses: int = 0


class RobotsDisallowedError(Exception):
    """Raised when robots.txt disallows scraping."""
    pass


class AssemblyOfBishopsSource:
    """
    Scraper for the Assembly of Bishops parish directory.
    
    Features:
    - Respects robots.txt
    - Rate limiting with configurable delay
    - Disk caching of HTTP responses
    - Exponential backoff on errors
    - Parses all jurisdictions
    """
    
    BASE_URL = "https://www.assemblyofbishops.org"
    DIRECTORY_PATH = "/directories/parishes/"
    ROBOTS_URL = "https://www.assemblyofbishops.org/robots.txt"
    
    USER_AGENT = (
        "OrthodoxMetrics-ChurchDiscovery/1.0 "
        "(+https://orthodoxmetrics.com; research-purposes; "
        "respects-robots.txt; rate-limited)"
    )
    
    # All known jurisdiction codes from the Assembly directory
    JURISDICTION_CODES = [
        'goa',      # Greek Orthodox Archdiocese of America
        'oca',      # Orthodox Church in America  
        'aocana',   # Antiochian Orthodox Christian Archdiocese
        'roc',      # Russian Orthodox Church (Patriarchal Parishes)
        'rocor',    # Russian Orthodox Church Outside Russia
        'serb',     # Serbian Orthodox Church
        'bulg',     # Bulgarian Orthodox Diocese
        'rom',      # Romanian Orthodox Archdiocese
        'ukr',      # Ukrainian Orthodox Church of USA
        'alb',      # Albanian Orthodox Diocese
        'carpath',  # American Carpatho-Russian Orthodox Diocese
        'goaa',     # Georgian Orthodox Church (if present)
    ]
    
    def __init__(
        self,
        delay_seconds: float = 1.0,
        max_retries: int = 3,
        cache_enabled: bool = True,
        cache_dir: Optional[str] = None
    ):
        """
        Initialize the scraper.
        
        Args:
            delay_seconds: Delay between requests (rate limiting)
            max_retries: Maximum retry attempts on failure
            cache_enabled: Whether to use disk caching
            cache_dir: Optional custom cache directory
        """
        self.delay_seconds = delay_seconds
        self.max_retries = max_retries
        self.cache = get_http_cache(cache_dir) if cache_enabled else None
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
        })
        self._robots_checked = False
        self._robots_allowed = False
    
    def check_robots_txt(self) -> bool:
        """
        Check if robots.txt allows scraping the parish directory.
        
        Returns:
            True if allowed, raises RobotsDisallowedError if not.
        """
        if self._robots_checked:
            return self._robots_allowed
        
        logger.info(f"Checking robots.txt at {self.ROBOTS_URL}")
        
        try:
            rp = urllib.robotparser.RobotFileParser()
            rp.set_url(self.ROBOTS_URL)
            rp.read()
            
            # Check if our user agent can access the directory path
            test_url = f"{self.BASE_URL}{self.DIRECTORY_PATH}"
            
            # Check for our specific user agent and also as a generic crawler
            allowed = rp.can_fetch(self.USER_AGENT, test_url)
            
            # Also check with a generic user agent
            if not allowed:
                allowed = rp.can_fetch("*", test_url)
            
            self._robots_checked = True
            self._robots_allowed = allowed
            
            if not allowed:
                raise RobotsDisallowedError(
                    f"robots.txt disallows scraping {test_url}"
                )
            
            logger.info("robots.txt check passed - scraping allowed")
            return True
            
        except urllib.error.URLError as e:
            # If we can't fetch robots.txt, assume allowed but log warning
            logger.warning(f"Could not fetch robots.txt: {e}. Proceeding with caution.")
            self._robots_checked = True
            self._robots_allowed = True
            return True
    
    def _fetch_url(self, url: str, use_cache: bool = True) -> str:
        """
        Fetch a URL with caching and rate limiting.
        
        Args:
            url: URL to fetch
            use_cache: Whether to use cache for this request
            
        Returns:
            Response content as string
        """
        # Check cache first
        if use_cache and self.cache:
            cached = self.cache.get(url)
            if cached:
                logger.debug(f"Cache hit: {url}")
                return cached
        
        # Rate limiting
        time.sleep(self.delay_seconds)
        
        # Fetch with retries
        last_error = None
        for attempt in range(self.max_retries):
            try:
                logger.debug(f"Fetching {url} (attempt {attempt + 1})")
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                content = response.text
                
                # Cache the response
                if self.cache:
                    self.cache.set(url, content, {
                        'status_code': response.status_code,
                        'headers': dict(response.headers)
                    })
                
                return content
                
            except requests.RequestException as e:
                last_error = e
                wait_time = self.delay_seconds * (2 ** attempt)  # Exponential backoff
                logger.warning(f"Request failed: {e}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
        
        raise last_error
    
    def _build_jurisdiction_url(self, jurisdiction_code: str) -> str:
        """Build URL for jurisdiction-based search."""
        params = {
            'jur': jurisdiction_code,
            'searchType': 'jurisdiction'
        }
        return f"{self.BASE_URL}{self.DIRECTORY_PATH}?{urllib.parse.urlencode(params)}"
    
    def _parse_parish_card(
        self,
        card: BeautifulSoup,
        jurisdiction_code: str,
        source_url: str
    ) -> Optional[RawParishRecord]:
        """
        Parse a single parish card from the HTML.
        
        The HTML structure uses CSS classes:
        - span.parish_title - name
        - p.parish_jurisdiction - jurisdiction name
        - p.parish_jurcode - jurisdiction code
        - p.parish_address - street address
        - span.parish_city - city
        - span.parish_state - state
        - span.parish_zip - zip code
        - span.parish_latitude - latitude
        - span.parish_longitude - longitude
        - Phone/Fax/Website in various formats
        """
        try:
            # Extract using CSS classes
            name_elem = card.select_one('.parish_title')
            name = name_elem.get_text(strip=True) if name_elem else None
            
            jurisdiction_elem = card.select_one('.parish_jurisdiction')
            jurisdiction_name = jurisdiction_elem.get_text(strip=True) if jurisdiction_elem else None
            
            jurcode_elem = card.select_one('.parish_jurcode')
            jur_code = jurcode_elem.get_text(strip=True) if jurcode_elem else jurisdiction_code
            
            address_elem = card.select_one('.parish_address')
            street = address_elem.get_text(strip=True) if address_elem else None
            
            city_elem = card.select_one('.parish_city')
            city = city_elem.get_text(strip=True) if city_elem else None
            
            state_elem = card.select_one('.parish_state')
            state = state_elem.get_text(strip=True) if state_elem else None
            
            zip_elem = card.select_one('.parish_zip')
            zip_code = zip_elem.get_text(strip=True) if zip_elem else None
            
            lat_elem = card.select_one('.parish_latitude')
            lat = None
            if lat_elem:
                try:
                    lat = float(lat_elem.get_text(strip=True))
                except (ValueError, TypeError):
                    pass
            
            lng_elem = card.select_one('.parish_longitude')
            lng = None
            if lng_elem:
                try:
                    lng = float(lng_elem.get_text(strip=True))
                except (ValueError, TypeError):
                    pass
            
            geocode_elem = card.select_one('.parish_geocode')
            accuracy = geocode_elem.get_text(strip=True) if geocode_elem else None
            
            # Find phone/fax/website from the card text
            card_text = card.get_text()
            phone = None
            fax = None
            website = None
            
            # Extract phone
            import re
            phone_match = re.search(r'Phone:\s*([\(\)\d\-\.\s]+)', card_text)
            if phone_match:
                phone = extract_phone_from_text(phone_match.group(0))
            
            # Extract fax
            fax_match = re.search(r'Fax:\s*([\(\)\d\-\.\s]+)', card_text)
            if fax_match:
                fax = extract_fax_from_text(fax_match.group(0))
            
            # Extract website from links
            for link in card.find_all('a', href=True):
                href = link.get('href', '')
                if href.startswith('http') and not website:
                    website = normalize_website(href)
                    break
            
            if not name:
                return None
            
            # Build city_state_zip line for compatibility
            city_state_zip_parts = []
            if city:
                city_state_zip_parts.append(city)
            if state:
                city_state_zip_parts.append(state)
            if zip_code:
                city_state_zip_parts.append(zip_code)
            city_state_zip = ", ".join(city_state_zip_parts[:2])
            if len(city_state_zip_parts) > 2:
                city_state_zip += " " + city_state_zip_parts[2]
            
            return RawParishRecord(
                name=normalize_whitespace(name) or name,
                jurisdiction=normalize_whitespace(jurisdiction_name),
                jurisdiction_code=jur_code.lower() if jur_code else jurisdiction_code,
                address_line1=normalize_whitespace(street),
                address_line2=city_state_zip if city_state_zip else None,
                phone=phone,
                fax=fax,
                website=website,
                latitude=lat,
                longitude=lng,
                location_accuracy=accuracy,
                source='assembly_of_bishops',
                source_url=source_url,
                fetched_at=datetime.now().isoformat(),
                raw_html=str(card)[:2000]  # Truncate for storage
            )
            
        except Exception as e:
            logger.warning(f"Error parsing parish card: {e}")
            return None
    
    def _parse_page(
        self,
        html: str,
        jurisdiction_code: str,
        source_url: str
    ) -> List[RawParishRecord]:
        """
        Parse parish records from a page of results.
        
        Args:
            html: HTML content
            jurisdiction_code: The jurisdiction being scraped
            source_url: The URL that was fetched
            
        Returns:
            List of parsed parish records
        """
        soup = BeautifulSoup(html, 'html.parser')
        records = []
        
        # Find the results count
        count_match = re.search(r'Number of returned parishes?:\s*(\d+)/(\d+)', html)
        if count_match:
            returned = int(count_match.group(1))
            total = int(count_match.group(2))
            logger.info(f"Found {returned}/{total} parishes for {jurisdiction_code}")
        
        # Primary method: Find parish cards by CSS class "output_parish"
        parish_cards = soup.select('.output_parish')
        
        if parish_cards:
            logger.debug(f"Found {len(parish_cards)} .output_parish elements")
            for card in parish_cards:
                record = self._parse_parish_card(card, jurisdiction_code, source_url)
                if record:
                    records.append(record)
        else:
            # Fallback: Find all divs that contain parish-like data
            # Look for divs containing lat/lng patterns
            logger.debug("No .output_parish elements found, using fallback parsing")
            for container in soup.find_all('div'):
                text = container.get_text()
                
                # Check if this looks like a parish entry (has coordinates)
                if not (re.search(r'-?\d+\.\d{4,}', text) and 
                        re.search(r'(Church|Parish|Cathedral|Chapel|Mission)', text, re.I)):
                    continue
                
                # Check if this is a leaf container (not containing other parish entries)
                sub_parishes = container.find_all(
                    'div',
                    string=re.compile(r'(Church|Parish|Cathedral|Chapel|Mission)', re.I)
                )
                
                if len(sub_parishes) > 1:
                    # This is a parent container, process children instead
                    continue
                
                record = self._parse_parish_card(container, jurisdiction_code, source_url)
                if record:
                    records.append(record)
        
        # Deduplicate by name within this page
        seen = set()
        unique_records = []
        for record in records:
            key = (record.name, record.address_line1, record.address_line2)
            if key not in seen:
                seen.add(key)
                unique_records.append(record)
        
        logger.info(f"Parsed {len(unique_records)} records from {jurisdiction_code}")
        return unique_records
    
    def fetch_jurisdiction(
        self,
        jurisdiction_code: str
    ) -> List[RawParishRecord]:
        """
        Fetch all parishes for a specific jurisdiction.
        
        Args:
            jurisdiction_code: Jurisdiction code (e.g., 'goa', 'oca')
            
        Returns:
            List of raw parish records
        """
        url = self._build_jurisdiction_url(jurisdiction_code)
        logger.info(f"Fetching jurisdiction {jurisdiction_code}: {url}")
        
        try:
            html = self._fetch_url(url)
            records = self._parse_page(html, jurisdiction_code, url)
            logger.info(f"Parsed {len(records)} records from {jurisdiction_code}")
            return records
        except Exception as e:
            logger.error(f"Error fetching {jurisdiction_code}: {e}")
            raise
    
    def fetch_all(
        self,
        jurisdictions: Optional[List[str]] = None
    ) -> ScrapeResult:
        """
        Fetch parishes from all jurisdictions.
        
        Args:
            jurisdictions: Optional list of jurisdiction codes to fetch.
                          If None, fetches all known jurisdictions.
        
        Returns:
            ScrapeResult with all records and any errors
        """
        # Check robots.txt first
        self.check_robots_txt()
        
        result = ScrapeResult()
        codes = jurisdictions or self.JURISDICTION_CODES
        
        for code in codes:
            try:
                records = self.fetch_jurisdiction(code)
                result.records.extend(records)
                result.jurisdictions_scraped.append(code)
                result.total_fetched += len(records)
                logger.info(f"Completed {code}: {len(records)} parishes")
                
            except Exception as e:
                error = {
                    'jurisdiction': code,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                result.errors.append(error)
                logger.error(f"Failed to fetch {code}: {e}")
        
        # Add cache stats if available
        if self.cache:
            stats = self.cache.get_stats()
            result.cache_hits = stats['hits']
            result.cache_misses = stats['misses']
        
        logger.info(
            f"Fetch complete: {result.total_fetched} total records, "
            f"{len(result.errors)} errors"
        )
        
        return result
    
    def parse_raw_html(self, html: str, jurisdiction_code: str = "unknown") -> List[RawParishRecord]:
        """
        Parse pre-fetched HTML content.
        Useful for testing with fixture files.
        
        Args:
            html: HTML content to parse
            jurisdiction_code: Jurisdiction code for context
            
        Returns:
            List of parsed parish records
        """
        return self._parse_page(html, jurisdiction_code, "fixture://test")


def fetch_assembly_parishes(
    delay_seconds: float = 1.0,
    cache_enabled: bool = True,
    jurisdictions: Optional[List[str]] = None
) -> ScrapeResult:
    """
    Convenience function to fetch all parishes from Assembly of Bishops.
    
    Args:
        delay_seconds: Rate limiting delay between requests
        cache_enabled: Whether to cache HTTP responses
        jurisdictions: Optional list of specific jurisdictions to fetch
        
    Returns:
        ScrapeResult with all parishes
    """
    source = AssemblyOfBishopsSource(
        delay_seconds=delay_seconds,
        cache_enabled=cache_enabled
    )
    return source.fetch_all(jurisdictions)
