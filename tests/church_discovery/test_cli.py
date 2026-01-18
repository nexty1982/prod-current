"""
Tests for CLI module, specifically US classification logic.
"""

import pytest
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from tools.church_discovery.models import (
    CanonicalChurch,
    Address,
    Contact,
    GeoLocation,
    SourceMeta,
)
from tools.church_discovery.cli import is_us_record, filter_us_only


def make_church_with_source(
    church_id: str,
    name: str,
    city: str = None,
    state: str = None,
    zip_code: str = None,
    source: str = "assembly_of_bishops"
) -> CanonicalChurch:
    """Helper to create a test church with source metadata."""
    return CanonicalChurch(
        id=church_id,
        name=name,
        address=Address(
            street="123 Main St",
            city=city,
            state=state,
            zip=zip_code
        ),
        contact=Contact(),
        geo=GeoLocation(),
        source_meta=[SourceMeta(source=source, fetched_at="2026-01-18")]
    )


class TestIsUsRecord:
    """Tests for is_us_record function."""
    
    def test_qualifies_by_state(self):
        """Church with valid US state qualifies."""
        church = make_church_with_source("1", "Test Church", city="Boston", state="MA")
        is_us, reason = is_us_record(church)
        assert is_us is True
        assert reason == "by_state"
    
    def test_qualifies_by_state_dc(self):
        """Church in DC qualifies."""
        church = make_church_with_source("2", "Test Church", city="Washington", state="DC")
        is_us, reason = is_us_record(church)
        assert is_us is True
        assert reason == "by_state"
    
    def test_qualifies_by_zip(self):
        """Church with US ZIP format qualifies even without state."""
        church = make_church_with_source("3", "Test Church", city="Somewhere", zip_code="12345")
        is_us, reason = is_us_record(church)
        assert is_us is True
        assert reason == "by_zip"
    
    def test_qualifies_by_zip_plus_four(self):
        """Church with ZIP+4 format qualifies."""
        church = make_church_with_source("4", "Test Church", city="Somewhere", zip_code="12345-6789")
        is_us, reason = is_us_record(church)
        assert is_us is True
        assert reason == "by_zip"
    
    def test_qualifies_by_source_us_focused(self):
        """Church from US-focused source with city qualifies."""
        church = make_church_with_source("5", "Test Church", city="Springfield", source="assembly_of_bishops")
        is_us, reason = is_us_record(church)
        assert is_us is True
        assert reason == "by_source_us_focused"
    
    def test_excludes_bahamas(self):
        """Church in Bahamas is excluded."""
        church = make_church_with_source("6", "Test Church", city="Nassau", state="Bahamas")
        is_us, reason = is_us_record(church)
        assert is_us is False
        assert reason == "non_us_indicator"
    
    def test_excludes_canada(self):
        """Church in Canada (Ontario) is excluded."""
        church = make_church_with_source("7", "Test Church", city="Toronto", state="ON")
        is_us, reason = is_us_record(church)
        assert is_us is False
        assert reason == "non_us_indicator"
    
    def test_missing_country_does_not_exclude(self):
        """Missing country with valid state should still qualify."""
        church = make_church_with_source("8", "Test Church", city="New York", state="NY")
        # No country field at all
        is_us, reason = is_us_record(church)
        assert is_us is True
        assert reason == "by_state"


class TestFilterUsOnly:
    """Tests for filter_us_only function."""
    
    def test_filters_correctly(self):
        """Filter keeps US churches, excludes non-US."""
        churches = [
            make_church_with_source("1", "US Church 1", city="Boston", state="MA"),
            make_church_with_source("2", "US Church 2", city="Chicago", state="IL"),
            make_church_with_source("3", "Bahamas Church", city="Nassau", state="Bahamas"),
            make_church_with_source("4", "US Church 3", zip_code="90210"),
        ]
        
        result = filter_us_only(churches)
        
        assert len(result) == 3
        names = [c.name for c in result]
        assert "US Church 1" in names
        assert "US Church 2" in names
        assert "US Church 3" in names
        assert "Bahamas Church" not in names
    
    def test_empty_list(self):
        """Empty input returns empty output."""
        result = filter_us_only([])
        assert result == []
    
    def test_all_us_churches(self):
        """All US churches pass through."""
        churches = [
            make_church_with_source("1", "Church A", state="NY"),
            make_church_with_source("2", "Church B", state="CA"),
            make_church_with_source("3", "Church C", state="TX"),
        ]
        
        result = filter_us_only(churches)
        assert len(result) == 3
    
    def test_records_with_zip_only_qualify(self):
        """Records with only ZIP (no state) should qualify if ZIP is US format."""
        churches = [
            make_church_with_source("1", "Church with ZIP", city="Unknown City", zip_code="55555"),
        ]
        
        result = filter_us_only(churches)
        assert len(result) == 1
