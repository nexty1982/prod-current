"""
Tests for normalization utilities.
"""

import pytest
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from tools.church_discovery.normalize import (
    normalize_whitespace,
    normalize_name,
    normalize_name_display,
    normalize_state,
    normalize_zip,
    normalize_phone,
    normalize_website,
    parse_city_state_zip,
)


class TestNormalizeWhitespace:
    """Tests for whitespace normalization."""
    
    def test_basic_trim(self):
        assert normalize_whitespace("  hello  ") == "hello"
    
    def test_collapse_spaces(self):
        assert normalize_whitespace("hello   world") == "hello world"
    
    def test_none_input(self):
        assert normalize_whitespace(None) is None
    
    def test_empty_string(self):
        assert normalize_whitespace("") is None
    
    def test_only_whitespace(self):
        assert normalize_whitespace("   ") is None


class TestNormalizeName:
    """Tests for church name normalization."""
    
    def test_basic_name(self):
        result = normalize_name("Holy Trinity Church")
        assert result == "HOLY TRINITY"
    
    def test_saint_abbreviation(self):
        result = normalize_name("St. Nicholas Church")
        assert "SAINT NICHOLAS" in result
    
    def test_saints_abbreviation(self):
        result = normalize_name("Sts. Constantine and Helen Church")
        assert "SAINTS CONSTANTINE" in result
    
    def test_removes_orthodox_suffix(self):
        result = normalize_name("Holy Trinity Greek Orthodox Church")
        assert result == "HOLY TRINITY"
    
    def test_preserves_core_name(self):
        # Two names that should match after normalization
        name1 = normalize_name("St. Nicholas Church")
        name2 = normalize_name("Saint Nicholas Greek Orthodox Church")
        assert name1 == name2


class TestNormalizeNameDisplay:
    """Tests for display name normalization."""
    
    def test_expands_saint(self):
        result = normalize_name_display("St. Nicholas Church")
        assert result == "Saint Nicholas Church"
    
    def test_preserves_case(self):
        result = normalize_name_display("Holy Trinity Church")
        assert result == "Holy Trinity Church"
    
    def test_none_input(self):
        assert normalize_name_display(None) is None


class TestNormalizeState:
    """Tests for state normalization."""
    
    def test_uppercase_code(self):
        assert normalize_state("ny") == "NY"
    
    def test_already_uppercase(self):
        assert normalize_state("CA") == "CA"
    
    def test_full_state_name(self):
        assert normalize_state("California") == "CA"
        assert normalize_state("new york") == "NY"
    
    def test_dc(self):
        assert normalize_state("DC") == "DC"
        assert normalize_state("District of Columbia") == "DC"
    
    def test_none_input(self):
        assert normalize_state(None) is None
    
    def test_invalid_state(self):
        # Unknown codes should be returned if 2 letters
        result = normalize_state("XX")
        assert result == "XX"


class TestNormalizeZip:
    """Tests for ZIP code normalization."""
    
    def test_five_digit(self):
        assert normalize_zip("12345") == "12345"
    
    def test_nine_digit(self):
        assert normalize_zip("123456789") == "12345-6789"
    
    def test_with_hyphen(self):
        assert normalize_zip("12345-6789") == "12345-6789"
    
    def test_with_spaces(self):
        assert normalize_zip(" 12345 ") == "12345"
    
    def test_none_input(self):
        assert normalize_zip(None) is None
    
    def test_partial_zip(self):
        # If we have at least 5 digits, use first 5
        result = normalize_zip("123456")
        assert result == "12345"


class TestNormalizePhone:
    """Tests for phone number normalization."""
    
    def test_ten_digit(self):
        assert normalize_phone("2125551234") == "(212) 555-1234"
    
    def test_with_country_code(self):
        assert normalize_phone("12125551234") == "(212) 555-1234"
    
    def test_formatted_input(self):
        assert normalize_phone("(212) 555-1234") == "(212) 555-1234"
    
    def test_with_dashes(self):
        assert normalize_phone("212-555-1234") == "(212) 555-1234"
    
    def test_with_dots(self):
        assert normalize_phone("212.555.1234") == "(212) 555-1234"
    
    def test_none_input(self):
        assert normalize_phone(None) is None
    
    def test_seven_digit(self):
        result = normalize_phone("5551234")
        assert result == "555-1234"


class TestNormalizeWebsite:
    """Tests for website URL normalization."""
    
    def test_adds_protocol(self):
        result = normalize_website("example.com")
        assert result == "http://example.com"
    
    def test_preserves_https(self):
        result = normalize_website("https://example.com")
        assert result == "https://example.com"
    
    def test_removes_trailing_slash(self):
        result = normalize_website("http://example.com/")
        assert result == "http://example.com"
    
    def test_lowercase_domain(self):
        result = normalize_website("HTTP://Example.COM")
        assert result == "http://example.com"
    
    def test_none_input(self):
        assert normalize_website(None) is None


class TestParseCityStateZip:
    """Tests for city/state/zip parsing."""
    
    def test_standard_format(self):
        city, state, zip_code = parse_city_state_zip("New York, NY 10001")
        assert city == "New York"
        assert state == "NY"
        assert zip_code == "10001"
    
    def test_without_comma(self):
        city, state, zip_code = parse_city_state_zip("Boston MA 02101")
        assert city == "Boston"
        assert state == "MA"
        assert zip_code == "02101"
    
    def test_full_state_name(self):
        city, state, zip_code = parse_city_state_zip("Los Angeles, California 90001")
        assert city == "Los Angeles"
        assert state == "CA"
        assert zip_code == "90001"
    
    def test_zip_plus_four(self):
        city, state, zip_code = parse_city_state_zip("Chicago, IL 60601-1234")
        assert city == "Chicago"
        assert state == "IL"
        assert zip_code == "60601-1234"
    
    def test_none_input(self):
        city, state, zip_code = parse_city_state_zip(None)
        assert city is None
        assert state is None
        assert zip_code is None
    
    def test_multi_word_city(self):
        city, state, zip_code = parse_city_state_zip("Salt Lake City, UT 84101")
        assert city == "Salt Lake City"
        assert state == "UT"
        assert zip_code == "84101"
