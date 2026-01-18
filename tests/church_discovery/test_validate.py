"""
Tests for validation module.
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
)
from tools.church_discovery.validate import (
    ChurchValidator,
    validate_churches,
)


def make_church(
    church_id: str,
    name: str,
    city: str = "Boston",
    state: str = "MA",
    phone: str = None,
    website: str = None,
    jurisdiction: str = "OCA"
) -> CanonicalChurch:
    """Helper to create a test church."""
    return CanonicalChurch(
        id=church_id,
        name=name,
        jurisdiction=jurisdiction,
        address=Address(street="123 Main St", city=city, state=state, zip="02101"),
        contact=Contact(phone=phone, website=website),
        geo=GeoLocation(lat=42.3601, lng=-71.0589)
    )


class TestValidateCompleteness:
    """Tests for completeness validation."""
    
    def test_counts_missing_fields(self):
        churches = [
            make_church("1", "Church A", phone="555-1234"),  # missing website
            make_church("2", "Church B", website="http://b.com"),  # missing phone
            make_church("3", "Church C"),  # missing both
        ]
        
        validator = ChurchValidator(churches)
        missing = validator.validate_completeness()
        
        assert missing['phone'] == 2  # Church B and C
        assert missing['website'] == 2  # Church A and C
    
    def test_missing_required_fields(self):
        churches = [
            CanonicalChurch(id="1", name=""),  # missing name
            CanonicalChurch(id="2", name="Church B", address=Address()),  # missing city/state
        ]
        
        validator = ChurchValidator(churches)
        missing = validator.validate_completeness()
        
        # Should flag missing name as error
        errors = [i for i in validator.issues if i.severity == 'error']
        assert len(errors) >= 1


class TestDuplicateDetection:
    """Tests for duplicate detection."""
    
    def test_finds_same_name_city(self):
        churches = [
            make_church("1", "Holy Trinity Church", city="Boston", state="MA"),
            make_church("2", "Holy Trinity Church", city="Boston", state="MA"),  # Duplicate!
        ]
        
        validator = ChurchValidator(churches)
        duplicates = validator.find_duplicates()
        
        assert len(duplicates) >= 1
        assert duplicates[0].reason == 'same_name_city_state'
    
    def test_finds_same_phone(self):
        churches = [
            make_church("1", "Church A", city="Boston", phone="(617) 555-1234"),
            make_church("2", "Church B", city="Boston", phone="(617) 555-1234"),  # Same phone!
        ]
        
        validator = ChurchValidator(churches)
        duplicates = validator.find_duplicates()
        
        # Should find duplicate by phone
        phone_dups = [d for d in duplicates if d.reason == 'same_phone_city']
        assert len(phone_dups) >= 1
    
    def test_finds_same_website(self):
        churches = [
            make_church("1", "Church A", website="http://example.com"),
            make_church("2", "Church B", website="http://example.com"),  # Same website!
        ]
        
        validator = ChurchValidator(churches)
        duplicates = validator.find_duplicates()
        
        website_dups = [d for d in duplicates if d.reason == 'same_website']
        assert len(website_dups) >= 1
    
    def test_no_false_positives(self):
        churches = [
            make_church("1", "Church A", city="Boston", phone="555-1234"),
            make_church("2", "Church B", city="Cambridge", phone="555-5678"),
        ]
        
        validator = ChurchValidator(churches)
        duplicates = validator.find_duplicates()
        
        # Should not find duplicates
        assert len(duplicates) == 0


class TestStateCoverage:
    """Tests for state coverage checking."""
    
    def test_identifies_missing_states(self):
        # Create churches only in a few states
        churches = [
            make_church("1", "Church 1", state="NY"),
            make_church("2", "Church 2", state="CA"),
        ]
        
        validator = ChurchValidator(churches)
        coverage = validator.check_state_coverage()
        
        # Should identify missing states
        missing_states = [c for c in coverage if c.status == 'missing']
        assert len(missing_states) > 40  # Most states should be missing
    
    def test_counts_by_state(self):
        churches = [
            make_church("1", "Church 1", state="NY"),
            make_church("2", "Church 2", state="NY"),
            make_church("3", "Church 3", state="CA"),
        ]
        
        validator = ChurchValidator(churches)
        counts = validator.get_counts_by_state()
        
        assert counts.get('NY') == 2
        assert counts.get('CA') == 1


class TestValidationReport:
    """Tests for validation report generation."""
    
    def test_generates_report(self):
        churches = [
            make_church("1", "Church 1", state="NY"),
            make_church("2", "Church 2", state="CA"),
        ]
        
        report = validate_churches(churches, "test_file.json")
        
        assert report.total_churches == 2
        assert report.source_file == "test_file.json"
        assert report.generated_at is not None
    
    def test_report_to_json(self):
        churches = [make_church("1", "Test Church")]
        report = validate_churches(churches, "test.json")
        
        json_output = report.to_json()
        assert '"total_churches": 1' in json_output
    
    def test_report_to_markdown(self):
        churches = [make_church("1", "Test Church")]
        report = validate_churches(churches, "test.json")
        
        md_output = report.to_markdown()
        assert "# Church Discovery Validation Report" in md_output
        assert "Test Church" in md_output or "Total Churches" in md_output
    
    def test_sample_records(self):
        churches = [make_church(str(i), f"Church {i}") for i in range(100)]
        
        validator = ChurchValidator(churches)
        samples = validator.get_sample_records(n=25)
        
        assert len(samples) == 25
