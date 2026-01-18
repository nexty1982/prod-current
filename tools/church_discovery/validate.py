"""
Validation module for church discovery data.

Provides:
- Data completeness validation
- Duplicate detection
- State coverage analysis
- Validation report generation
"""

from __future__ import annotations

import random
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Set, Tuple
from collections import defaultdict

from .models import (
    CanonicalChurch,
    ValidationReport,
    ValidationIssue,
    DuplicateCandidate,
    StateCoverage,
    US_STATES,
    JURISDICTION_CODES
)
from .normalize import normalize_name, normalize_phone, normalize_website

logger = logging.getLogger(__name__)


class ChurchValidator:
    """
    Validates a collection of canonical church records.
    """
    
    # Minimum expected parishes per state (rough estimates)
    # States with 0 expected likely have very few Orthodox parishes
    STATE_MINIMUMS = {
        'CA': 100, 'NY': 150, 'IL': 50, 'PA': 75, 'FL': 75,
        'TX': 50, 'OH': 50, 'MA': 40, 'NJ': 50, 'MI': 40,
        'WA': 25, 'VA': 25, 'MD': 25, 'GA': 25, 'NC': 20,
        'AZ': 20, 'CO': 15, 'OR': 15, 'CT': 25, 'MN': 15,
        'WI': 15, 'IN': 15, 'MO': 15, 'TN': 10, 'DC': 5,
        # States with expected low counts
        'WY': 1, 'ND': 1, 'SD': 1, 'MT': 2, 'ID': 3,
        'WV': 3, 'VT': 2, 'NH': 3, 'ME': 3, 'NE': 2,
        'KS': 3, 'NV': 5, 'NM': 3, 'RI': 5, 'DE': 2,
        'HI': 3, 'AK': 15,  # Alaska has significant OCA presence
    }
    
    def __init__(self, churches: List[CanonicalChurch]):
        """
        Initialize validator with churches to validate.
        
        Args:
            churches: List of canonical church records
        """
        self.churches = churches
        self.issues: List[ValidationIssue] = []
    
    def _add_issue(
        self,
        severity: str,
        field: str,
        message: str,
        church: Optional[CanonicalChurch] = None
    ):
        """Add a validation issue."""
        issue = ValidationIssue(
            severity=severity,
            field=field,
            message=message,
            church_id=church.id if church else None,
            church_name=church.name if church else None
        )
        self.issues.append(issue)
    
    def validate_completeness(self) -> Dict[str, int]:
        """
        Check for missing required and recommended fields.
        
        Returns:
            Dictionary of field -> missing count
        """
        missing_counts = defaultdict(int)
        
        for church in self.churches:
            # Required fields
            if not church.name:
                missing_counts['name'] += 1
                self._add_issue('error', 'name', 'Missing church name', church)
            
            # Strongly recommended fields
            if not church.address.street:
                missing_counts['street'] += 1
            
            if not church.address.city:
                missing_counts['city'] += 1
                self._add_issue('warning', 'city', f'Missing city: {church.name}', church)
            
            if not church.address.state:
                missing_counts['state'] += 1
                self._add_issue('warning', 'state', f'Missing state: {church.name}', church)
            
            if not church.address.zip:
                missing_counts['zip'] += 1
            
            # Optional but tracked fields
            if not church.contact.website:
                missing_counts['website'] += 1
            
            if not church.contact.phone:
                missing_counts['phone'] += 1
            
            if not church.jurisdiction:
                missing_counts['jurisdiction'] += 1
            
            if church.geo.lat is None or church.geo.lng is None:
                missing_counts['geo_coordinates'] += 1
        
        return dict(missing_counts)
    
    def find_duplicates(self, threshold: float = 0.7) -> List[DuplicateCandidate]:
        """
        Find potential duplicate records.
        
        Uses multiple heuristics:
        1. Same normalized name + same city/state
        2. Same phone number + same city
        3. Same website URL
        
        Args:
            threshold: Minimum confidence threshold for reporting
            
        Returns:
            List of duplicate candidate pairs
        """
        duplicates = []
        n = len(self.churches)
        
        # Build indexes for faster lookup
        by_phone: Dict[str, List[CanonicalChurch]] = defaultdict(list)
        by_website: Dict[str, List[CanonicalChurch]] = defaultdict(list)
        by_name_city: Dict[str, List[CanonicalChurch]] = defaultdict(list)
        
        for church in self.churches:
            # Index by phone
            if church.contact.phone:
                normalized_phone = normalize_phone(church.contact.phone)
                if normalized_phone:
                    by_phone[normalized_phone].append(church)
            
            # Index by website
            if church.contact.website:
                normalized_website = normalize_website(church.contact.website)
                if normalized_website:
                    # Remove protocol for matching
                    clean_url = normalized_website.replace('https://', '').replace('http://', '')
                    by_website[clean_url.rstrip('/')].append(church)
            
            # Index by normalized name + city + state
            if church.address.city and church.address.state:
                normalized = normalize_name(church.name)
                key = f"{normalized}|{church.address.city.upper()}|{church.address.state}"
                by_name_city[key].append(church)
        
        # Find duplicates by same name/city
        for key, group in by_name_city.items():
            if len(group) > 1:
                for i in range(len(group)):
                    for j in range(i + 1, len(group)):
                        c1, c2 = group[i], group[j]
                        duplicates.append(DuplicateCandidate(
                            church_id_1=c1.id,
                            church_name_1=c1.name,
                            church_id_2=c2.id,
                            church_name_2=c2.name,
                            reason='same_name_city_state',
                            confidence=0.95
                        ))
        
        # Find duplicates by same phone in same city
        for phone, group in by_phone.items():
            if len(group) > 1:
                # Group by city
                by_city: Dict[str, List[CanonicalChurch]] = defaultdict(list)
                for church in group:
                    city = (church.address.city or "").upper()
                    by_city[city].append(church)
                
                for city, city_group in by_city.items():
                    if len(city_group) > 1:
                        for i in range(len(city_group)):
                            for j in range(i + 1, len(city_group)):
                                c1, c2 = city_group[i], city_group[j]
                                # Skip if already found
                                if any(d.church_id_1 == c1.id and d.church_id_2 == c2.id 
                                      for d in duplicates):
                                    continue
                                duplicates.append(DuplicateCandidate(
                                    church_id_1=c1.id,
                                    church_name_1=c1.name,
                                    church_id_2=c2.id,
                                    church_name_2=c2.name,
                                    reason='same_phone_city',
                                    confidence=0.85
                                ))
        
        # Find duplicates by same website
        for website, group in by_website.items():
            if len(group) > 1:
                for i in range(len(group)):
                    for j in range(i + 1, len(group)):
                        c1, c2 = group[i], group[j]
                        # Skip if already found
                        if any((d.church_id_1 == c1.id and d.church_id_2 == c2.id) or
                               (d.church_id_1 == c2.id and d.church_id_2 == c1.id)
                              for d in duplicates):
                            continue
                        duplicates.append(DuplicateCandidate(
                            church_id_1=c1.id,
                            church_name_1=c1.name,
                            church_id_2=c2.id,
                            church_name_2=c2.name,
                            reason='same_website',
                            confidence=0.90
                        ))
        
        # Filter by threshold
        return [d for d in duplicates if d.confidence >= threshold]
    
    def check_state_coverage(self) -> List[StateCoverage]:
        """
        Verify all US states have expected parish coverage.
        
        Returns:
            List of state coverage information
        """
        counts_by_state: Dict[str, int] = defaultdict(int)
        
        for church in self.churches:
            state = church.address.state
            if state:
                counts_by_state[state.upper()] += 1
        
        coverage = []
        
        for state in US_STATES:
            count = counts_by_state.get(state, 0)
            expected = self.STATE_MINIMUMS.get(state, 1)
            
            if count == 0:
                status = "missing"
                self._add_issue(
                    'error', 'state_coverage',
                    f"No parishes found for {state}"
                )
            elif count < expected * 0.5:
                status = "warning"
                self._add_issue(
                    'warning', 'state_coverage',
                    f"Low parish count for {state}: {count} (expected >= {expected})"
                )
            else:
                status = "ok"
            
            coverage.append(StateCoverage(
                state=state,
                count=count,
                expected_minimum=expected,
                status=status
            ))
        
        return coverage
    
    def get_counts_by_state(self) -> Dict[str, int]:
        """Get parish counts grouped by state."""
        counts: Dict[str, int] = defaultdict(int)
        for church in self.churches:
            state = church.address.state or "Unknown"
            counts[state] += 1
        return dict(counts)
    
    def get_counts_by_jurisdiction(self) -> Dict[str, int]:
        """Get parish counts grouped by jurisdiction."""
        counts: Dict[str, int] = defaultdict(int)
        for church in self.churches:
            jur = church.jurisdiction or "Unknown"
            counts[jur] += 1
        return dict(counts)
    
    def get_sample_records(self, n: int = 25) -> List[Dict[str, Any]]:
        """
        Get a random sample of records for spot-checking.
        
        Args:
            n: Number of records to sample
            
        Returns:
            List of record dictionaries
        """
        if len(self.churches) <= n:
            sample = self.churches
        else:
            sample = random.sample(self.churches, n)
        
        return [c.to_dict() for c in sample]
    
    def generate_report(
        self,
        source_file: str,
        scrape_errors: Optional[List[Dict[str, Any]]] = None
    ) -> ValidationReport:
        """
        Generate a complete validation report.
        
        Args:
            source_file: Path to the source file being validated
            scrape_errors: Optional list of errors from the scraping phase
            
        Returns:
            Complete validation report
        """
        # Reset issues
        self.issues = []
        
        # Run all validations
        missing_counts = self.validate_completeness()
        duplicates = self.find_duplicates()
        state_coverage = self.check_state_coverage()
        
        # Determine success
        has_critical_errors = any(i.severity == 'error' for i in self.issues)
        has_scrape_errors = bool(scrape_errors)
        success = not has_critical_errors and not has_scrape_errors
        
        report = ValidationReport(
            generated_at=datetime.now().isoformat(),
            source_file=source_file,
            total_churches=len(self.churches),
            counts_by_state=self.get_counts_by_state(),
            counts_by_jurisdiction=self.get_counts_by_jurisdiction(),
            missing_field_counts=missing_counts,
            duplicate_candidates=duplicates,
            state_coverage=state_coverage,
            sample_records=self.get_sample_records(),
            issues=self.issues,
            scrape_errors=scrape_errors or [],
            success=success
        )
        
        return report


def validate_canonical_file(
    file_path: str,
    scrape_errors: Optional[List[Dict[str, Any]]] = None
) -> ValidationReport:
    """
    Validate a canonical churches JSON file.
    
    Args:
        file_path: Path to the canonical JSON file
        scrape_errors: Optional scrape errors to include in report
        
    Returns:
        Validation report
    """
    import json
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    churches = [CanonicalChurch.from_dict(c) for c in data.get('churches', [])]
    
    validator = ChurchValidator(churches)
    return validator.generate_report(file_path, scrape_errors)


def validate_churches(
    churches: List[CanonicalChurch],
    source_file: str = "memory",
    scrape_errors: Optional[List[Dict[str, Any]]] = None
) -> ValidationReport:
    """
    Validate a list of canonical churches.
    
    Args:
        churches: List of canonical church records
        source_file: Description of the source
        scrape_errors: Optional scrape errors to include
        
    Returns:
        Validation report
    """
    validator = ChurchValidator(churches)
    return validator.generate_report(source_file, scrape_errors)
