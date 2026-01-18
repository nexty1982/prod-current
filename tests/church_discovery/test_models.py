"""
Tests for data models.
"""

import pytest
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from tools.church_discovery.models import (
    Address,
    Contact,
    GeoLocation,
    RawParishRecord,
    CanonicalChurch,
    Clergy,
    SourceMeta,
    Timestamps,
    Flags,
)


class TestAddress:
    """Tests for Address model."""
    
    def test_to_dict(self):
        addr = Address(street="123 Main St", city="Boston", state="MA", zip="02101")
        d = addr.to_dict()
        assert d['street'] == "123 Main St"
        assert d['city'] == "Boston"
        assert d['state'] == "MA"
        assert d['zip'] == "02101"
    
    def test_is_complete(self):
        # Complete
        addr1 = Address(city="Boston", state="MA")
        assert addr1.is_complete() is True
        
        # Missing city
        addr2 = Address(street="123 Main", state="MA")
        assert addr2.is_complete() is False
        
        # Missing state
        addr3 = Address(city="Boston")
        assert addr3.is_complete() is False
    
    def test_normalized_key(self):
        addr = Address(street="123 Main St", city="Boston", state="MA", zip="02101")
        key = addr.normalized_key()
        assert "123 MAIN ST" in key
        assert "BOSTON" in key
        assert "MA" in key


class TestCanonicalChurch:
    """Tests for CanonicalChurch model."""
    
    def test_to_dict(self):
        church = CanonicalChurch(
            id="abc123",
            name="Holy Trinity Church",
            jurisdiction="Greek Orthodox Archdiocese",
            address=Address(city="New York", state="NY"),
            contact=Contact(phone="(212) 555-1234"),
            geo=GeoLocation(lat=40.7128, lng=-74.0060)
        )
        
        d = church.to_dict()
        assert d['id'] == "abc123"
        assert d['name'] == "Holy Trinity Church"
        assert d['address']['city'] == "New York"
        assert d['contact']['phone'] == "(212) 555-1234"
        assert d['geo']['lat'] == 40.7128
    
    def test_from_dict(self):
        data = {
            'id': 'abc123',
            'name': 'St. Nicholas Cathedral',
            'jurisdiction': 'OCA',
            'address': {'city': 'Washington', 'state': 'DC'},
            'contact': {'website': 'http://example.com'},
            'geo': {'lat': 38.9, 'lng': -77.0},
            'clergy': [],
            'flags': {},
            'source_meta': [],
            'timestamps': {}
        }
        
        church = CanonicalChurch.from_dict(data)
        assert church.id == 'abc123'
        assert church.name == 'St. Nicholas Cathedral'
        assert church.address.city == 'Washington'
        assert church.contact.website == 'http://example.com'


class TestIdGeneration:
    """Tests for deterministic ID generation."""
    
    def test_same_input_same_id(self):
        """Same name + address should always produce same ID."""
        addr1 = Address(street="123 Main St", city="Boston", state="MA", zip="02101")
        addr2 = Address(street="123 Main St", city="Boston", state="MA", zip="02101")
        
        id1 = CanonicalChurch.generate_id("Holy Trinity Church", addr1, "MA")
        id2 = CanonicalChurch.generate_id("Holy Trinity Church", addr2, "MA")
        
        assert id1 == id2
    
    def test_normalized_names_match(self):
        """Slightly different name formats should produce same ID."""
        addr = Address(street="123 Main St", city="Boston", state="MA")
        
        id1 = CanonicalChurch.generate_id("St. Nicholas Church", addr, "MA")
        id2 = CanonicalChurch.generate_id("Saint Nicholas Church", addr, "MA")
        
        # These should match because normalization expands "St." to "Saint"
        assert id1 == id2
    
    def test_different_address_different_id(self):
        """Different addresses should produce different IDs."""
        addr1 = Address(street="123 Main St", city="Boston", state="MA")
        addr2 = Address(street="456 Oak Ave", city="Boston", state="MA")
        
        id1 = CanonicalChurch.generate_id("Holy Trinity Church", addr1, "MA")
        id2 = CanonicalChurch.generate_id("Holy Trinity Church", addr2, "MA")
        
        assert id1 != id2
    
    def test_id_length(self):
        """IDs should be 16 hex characters."""
        addr = Address(city="Boston", state="MA")
        church_id = CanonicalChurch.generate_id("Test Church", addr, "MA")
        
        assert len(church_id) == 16
        assert all(c in '0123456789abcdef' for c in church_id)


class TestRawParishRecord:
    """Tests for RawParishRecord model."""
    
    def test_to_dict(self):
        record = RawParishRecord(
            name="Holy Trinity Church",
            jurisdiction="Greek Orthodox Archdiocese",
            address_line1="123 Main St",
            address_line2="Boston, MA 02101",
            source="assembly_of_bishops",
            fetched_at="2026-01-18T12:00:00"
        )
        
        d = record.to_dict()
        assert d['name'] == "Holy Trinity Church"
        assert d['address_line1'] == "123 Main St"
        assert d['source'] == "assembly_of_bishops"
    
    def test_from_dict(self):
        data = {
            'name': 'St. Nicholas Cathedral',
            'jurisdiction': 'OCA',
            'address_line1': '3500 Mass Ave',
            'address_line2': 'Washington, DC 20007',
            'phone': '202-333-5060',
            'source': 'assembly_of_bishops',
            'fetched_at': '2026-01-18T12:00:00',
            'clergy': []
        }
        
        record = RawParishRecord.from_dict(data)
        assert record.name == 'St. Nicholas Cathedral'
        assert record.phone == '202-333-5060'
    
    def test_clergy_handling(self):
        record = RawParishRecord(
            name="Test Church",
            source="test",
            fetched_at="2026-01-18",
            clergy=[
                Clergy(title="Fr.", name="John Smith", role="Pastor"),
                Clergy(title="Dn.", name="Michael Jones", role="Deacon")
            ]
        )
        
        d = record.to_dict()
        assert len(d['clergy']) == 2
        assert d['clergy'][0]['name'] == "John Smith"
