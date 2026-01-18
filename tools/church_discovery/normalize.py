"""
Normalization utilities for church data.

Handles:
- String normalization (whitespace, case)
- Address field normalization
- Name normalization (abbreviations)
- Phone number formatting
- Deduplication key generation
"""

from __future__ import annotations
import re
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .models import Address


# Common abbreviations and their expansions
SAINT_PATTERNS = [
    (r'\bSt\.\s*', 'Saint '),
    (r'\bSt\s+', 'Saint '),
    (r'\bSts\.\s*', 'Saints '),
    (r'\bSts\s+', 'Saints '),
]

STREET_ABBREVIATIONS = {
    'st': 'Street',
    'st.': 'Street',
    'ave': 'Avenue',
    'ave.': 'Avenue',
    'blvd': 'Boulevard',
    'blvd.': 'Boulevard',
    'dr': 'Drive',
    'dr.': 'Drive',
    'rd': 'Road',
    'rd.': 'Road',
    'ln': 'Lane',
    'ln.': 'Lane',
    'ct': 'Court',
    'ct.': 'Court',
    'pl': 'Place',
    'pl.': 'Place',
    'cir': 'Circle',
    'cir.': 'Circle',
    'pkwy': 'Parkway',
    'pkwy.': 'Parkway',
    'hwy': 'Highway',
    'hwy.': 'Highway',
    'n': 'North',
    'n.': 'North',
    's': 'South',
    's.': 'South',
    'e': 'East',
    'e.': 'East',
    'w': 'West',
    'w.': 'West',
    'ne': 'Northeast',
    'nw': 'Northwest',
    'se': 'Southeast',
    'sw': 'Southwest',
}

# State name to abbreviation mapping
STATE_ABBREVIATIONS = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'district of columbia': 'DC', 'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI',
    'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
    'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME',
    'maryland': 'MD', 'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN',
    'mississippi': 'MS', 'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE',
    'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM',
    'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
    'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI',
    'south carolina': 'SC', 'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX',
    'utah': 'UT', 'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA',
    'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
}

# Valid 2-letter state codes
VALID_STATE_CODES = set(STATE_ABBREVIATIONS.values())


def normalize_whitespace(text: Optional[str]) -> Optional[str]:
    """
    Normalize whitespace: trim, collapse multiple spaces.
    Returns None if input is None or empty after normalization.
    """
    if not text:
        return None
    result = ' '.join(text.split())
    return result if result else None


def normalize_name(name: Optional[str]) -> str:
    """
    Normalize a church name for ID generation and comparison.
    
    - Trims whitespace
    - Collapses multiple spaces
    - Converts to uppercase for comparison
    - Expands "St." to "Saint" for consistency
    - Removes common suffixes like "Church", "Parish", "Cathedral"
    """
    if not name:
        return ""
    
    text = name.strip()
    
    # Expand Saint abbreviations
    for pattern, replacement in SAINT_PATTERNS:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    # Convert to uppercase for comparison
    text = text.upper()
    
    # Remove common suffixes for comparison (but keep the original for display)
    # This helps match "Holy Trinity Church" with "Holy Trinity Greek Orthodox Church"
    suffixes_to_remove = [
        r'\s+GREEK\s+ORTHODOX\s+CHURCH$',
        r'\s+ORTHODOX\s+CHURCH$',
        r'\s+CHURCH$',
        r'\s+PARISH$',
        r'\s+CATHEDRAL$',
        r'\s+CHAPEL$',
        r'\s+MISSION$',
    ]
    
    for suffix in suffixes_to_remove:
        text = re.sub(suffix, '', text)
    
    return text.strip()


def normalize_name_display(name: Optional[str]) -> Optional[str]:
    """
    Normalize a church name for display (preserving case, expanding abbreviations).
    """
    if not name:
        return None
    
    text = name.strip()
    
    # Expand Saint abbreviations
    for pattern, replacement in SAINT_PATTERNS:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    return text if text else None


def normalize_state(state: Optional[str]) -> Optional[str]:
    """
    Normalize state to 2-letter uppercase code.
    Handles full state names and various abbreviation formats.
    """
    if not state:
        return None
    
    state = state.strip().upper()
    
    # Already a valid 2-letter code
    if state in VALID_STATE_CODES:
        return state
    
    # Try to match full state name
    state_lower = state.lower()
    if state_lower in STATE_ABBREVIATIONS:
        return STATE_ABBREVIATIONS[state_lower]
    
    # Handle cases like "New York" with different capitalization
    for full_name, abbrev in STATE_ABBREVIATIONS.items():
        if full_name.lower() == state_lower:
            return abbrev
    
    # If it's a 2-letter code but not recognized, return as-is
    if len(state) == 2:
        return state
    
    return None


def normalize_zip(zip_code: Optional[str]) -> Optional[str]:
    """
    Normalize ZIP code to standard format.
    Handles ZIP+4 and various formats.
    """
    if not zip_code:
        return None
    
    # Remove all non-digit and non-hyphen characters
    cleaned = re.sub(r'[^\d-]', '', zip_code.strip())
    
    # Extract just digits
    digits = re.sub(r'[^\d]', '', cleaned)
    
    if not digits:
        return None
    
    # Standard 5-digit ZIP
    if len(digits) == 5:
        return digits
    
    # ZIP+4 format
    if len(digits) == 9:
        return f"{digits[:5]}-{digits[5:]}"
    
    # If we have at least 5 digits, use first 5
    if len(digits) >= 5:
        return digits[:5]
    
    # Return what we have
    return digits if digits else None


def normalize_phone(phone: Optional[str]) -> Optional[str]:
    """
    Normalize phone number to consistent format.
    Returns format: (XXX) XXX-XXXX or None if invalid.
    """
    if not phone:
        return None
    
    # Extract just digits
    digits = re.sub(r'[^\d]', '', phone)
    
    # Handle country code prefix
    if len(digits) == 11 and digits.startswith('1'):
        digits = digits[1:]
    
    # Standard 10-digit US phone
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    
    # 7-digit local number (less common now)
    if len(digits) == 7:
        return f"{digits[:3]}-{digits[3:]}"
    
    # Return original if we can't normalize
    return phone.strip() if phone.strip() else None


def normalize_website(url: Optional[str]) -> Optional[str]:
    """
    Normalize website URL.
    Ensures lowercase protocol, removes trailing slashes.
    """
    if not url:
        return None
    
    url = url.strip()
    
    if not url:
        return None
    
    # Add protocol if missing (case-insensitive check)
    if not url.lower().startswith(('http://', 'https://')):
        url = 'http://' + url
    
    # Lowercase the protocol and domain
    if '://' in url:
        protocol, rest = url.split('://', 1)
        if '/' in rest:
            domain, path = rest.split('/', 1)
            url = f"{protocol.lower()}://{domain.lower()}/{path}"
        else:
            url = f"{protocol.lower()}://{rest.lower()}"
    
    # Remove trailing slash from simple URLs
    if url.endswith('/') and url.count('/') <= 3:
        url = url.rstrip('/')
    
    return url


def normalize_street(street: Optional[str]) -> Optional[str]:
    """
    Normalize street address.
    Handles common abbreviations and formatting.
    """
    if not street:
        return None
    
    # Normalize whitespace
    street = ' '.join(street.split())
    
    if not street:
        return None
    
    return street


def normalize_city(city: Optional[str]) -> Optional[str]:
    """
    Normalize city name.
    """
    if not city:
        return None
    
    # Normalize whitespace
    city = ' '.join(city.split())
    
    if not city:
        return None
    
    # Title case
    return city.title()


def normalize_address_for_id(address: 'Address') -> str:
    """
    Generate a normalized address string for ID generation.
    Used in deduplication.
    """
    parts = []
    
    if address.street:
        # Uppercase and collapse whitespace
        street = ' '.join(address.street.upper().split())
        # Remove unit/apt/suite info for matching
        street = re.sub(r'\s*(APT|UNIT|STE|SUITE|#)\s*\S*$', '', street)
        parts.append(street)
    
    if address.city:
        parts.append(address.city.upper().strip())
    
    if address.zip:
        # Just the 5-digit ZIP for matching
        zip_norm = normalize_zip(address.zip)
        if zip_norm:
            parts.append(zip_norm[:5])
    
    return '|'.join(parts)


def parse_city_state_zip(text: Optional[str]) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Parse a combined city, state, zip line.
    Returns (city, state, zip) tuple.
    
    Handles formats like:
    - "New York, NY 10001"
    - "New York NY 10001"
    - "Boston, Massachusetts 02101"
    - "Los Angeles, CA 90001-1234"
    """
    if not text:
        return None, None, None
    
    text = text.strip()
    
    # Try to extract ZIP code first (end of string)
    zip_match = re.search(r'(\d{5}(?:-\d{4})?)$', text)
    zip_code = None
    if zip_match:
        zip_code = zip_match.group(1)
        text = text[:zip_match.start()].strip()
    
    # Remove trailing comma if present
    text = text.rstrip(',').strip()
    
    # Try to find state (2-letter code or full name at end)
    state = None
    city = None
    
    # Check for 2-letter state code at end (must be standalone, not part of a word)
    # Require comma or space before the 2-letter code, or it must be after a space
    state_match = re.search(r'[,\s]\s*([A-Za-z]{2})$', text)
    if state_match:
        potential_state = state_match.group(1).upper()
        if potential_state in VALID_STATE_CODES:
            state = potential_state
            city = text[:state_match.start()].strip().rstrip(',').strip()
    
    # If no state found, try full state names
    if not state:
        text_lower = text.lower()
        for full_name, abbrev in STATE_ABBREVIATIONS.items():
            # Pattern to match state name at end (with optional comma/space before)
            pattern = rf',?\s*{re.escape(full_name)}$'
            match = re.search(pattern, text_lower)
            if match:
                state = abbrev
                # Remove the matched portion from the original text
                city = text[:match.start()].strip().rstrip(',').strip()
                break
    
    # If still no state, city is everything
    if city is None:
        city = text
    
    return normalize_city(city), state, normalize_zip(zip_code)


def extract_phone_from_text(text: Optional[str]) -> Optional[str]:
    """
    Extract phone number from text that may contain "Phone: " prefix.
    """
    if not text:
        return None
    
    # Remove common prefixes
    text = re.sub(r'^(Phone|Tel|Telephone|Ph)\s*:\s*', '', text, flags=re.IGNORECASE)
    
    return normalize_phone(text.strip())


def extract_fax_from_text(text: Optional[str]) -> Optional[str]:
    """
    Extract fax number from text that may contain "Fax: " prefix.
    """
    if not text:
        return None
    
    # Remove common prefixes
    text = re.sub(r'^Fax\s*:\s*', '', text, flags=re.IGNORECASE)
    
    return normalize_phone(text.strip())


def normalize_jurisdiction_name(name: Optional[str]) -> Optional[str]:
    """
    Normalize jurisdiction name for consistency.
    """
    if not name:
        return None
    
    # Common normalizations
    replacements = {
        'Greek Orthodox Archdiocese of America': 'Greek Orthodox Archdiocese of America',
        'Orthodox Church in America': 'Orthodox Church in America',
        'Antiochian Orthodox Christian Archdiocese': 'Antiochian Orthodox Christian Archdiocese of North America',
    }
    
    name = ' '.join(name.split())
    
    for pattern, replacement in replacements.items():
        if pattern.lower() in name.lower():
            return replacement
    
    return name
