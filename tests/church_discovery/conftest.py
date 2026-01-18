"""
Pytest configuration and fixtures for church discovery tests.
"""

import pytest
import sys
from pathlib import Path

# Ensure the tools package is importable
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


@pytest.fixture
def sample_html_fixture():
    """Load the sample parish page HTML fixture."""
    fixture_path = Path(__file__).parent / "fixtures" / "sample_parish_page.html"
    with open(fixture_path, 'r', encoding='utf-8') as f:
        return f.read()


@pytest.fixture
def sample_churches():
    """Create a list of sample canonical churches for testing."""
    from tools.church_discovery.models import (
        CanonicalChurch, Address, Contact, GeoLocation
    )
    
    return [
        CanonicalChurch(
            id="abc123",
            name="Holy Trinity Greek Orthodox Church",
            jurisdiction="Greek Orthodox Archdiocese of America",
            jurisdiction_code="goa",
            address=Address(
                street="100 Main Street",
                city="New York",
                state="NY",
                zip="10001"
            ),
            contact=Contact(
                phone="(212) 555-1234",
                website="http://www.holytrinitynyc.goarch.org"
            ),
            geo=GeoLocation(lat=40.7484, lng=-73.9967)
        ),
        CanonicalChurch(
            id="def456",
            name="Saint Nicholas Orthodox Cathedral",
            jurisdiction="Orthodox Church in America",
            jurisdiction_code="oca",
            address=Address(
                street="3500 Massachusetts Avenue NW",
                city="Washington",
                state="DC",
                zip="20007"
            ),
            contact=Contact(
                phone="(202) 333-5060",
                website="https://www.stnicholasdc.org"
            ),
            geo=GeoLocation(lat=38.9289, lng=-77.0714)
        ),
    ]
