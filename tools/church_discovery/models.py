"""
Data models for Orthodox Church Discovery pipeline.

These models define the structure for:
- Raw scraped parish data
- Normalized/canonical church records
- Validation reports

Designed for JSON storage with MariaDB import compatibility.
"""

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any
from datetime import datetime
import hashlib
import json


@dataclass
class Address:
    """Canonical address structure."""
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None  # 2-letter code
    zip: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    def is_complete(self) -> bool:
        """Check if address has minimum required fields."""
        return bool(self.city and self.state)
    
    def normalized_key(self) -> str:
        """Generate normalized key for deduplication."""
        parts = [
            (self.street or "").upper().strip(),
            (self.city or "").upper().strip(),
            (self.state or "").upper().strip(),
            (self.zip or "").strip()
        ]
        return "|".join(parts)


@dataclass
class Contact:
    """Contact information for a parish."""
    phone: Optional[str] = None
    fax: Optional[str] = None
    website: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class GeoLocation:
    """Geographic coordinates."""
    lat: Optional[float] = None
    lng: Optional[float] = None
    accuracy: Optional[str] = None  # 'exact', 'approximate', etc.
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SourceMeta:
    """Metadata about data sources for a church record."""
    source: str  # e.g., 'assembly_of_bishops'
    source_id_or_url: Optional[str] = None
    fetched_at: Optional[str] = None  # ISO 8601 timestamp
    raw_html_snippet: Optional[str] = None  # For audit purposes
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Flags:
    """Status flags for church records."""
    has_metrical_data: Optional[bool] = None  # null initially
    is_om_client: Optional[bool] = None  # null initially
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Timestamps:
    """Timestamp tracking for church records."""
    discovered_at: Optional[str] = None  # ISO 8601
    last_verified_at: Optional[str] = None  # ISO 8601
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Clergy:
    """Clergy member information."""
    title: Optional[str] = None  # e.g., 'Fr.', 'V. Rev.', 'Bishop'
    name: str = ""
    role: Optional[str] = None  # e.g., 'Pastor', 'Assistant'
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RawParishRecord:
    """
    Raw parish record as scraped from source.
    Preserves original data exactly as seen.
    """
    name: str
    jurisdiction: Optional[str] = None
    jurisdiction_code: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None  # City, State ZIP
    phone: Optional[str] = None
    fax: Optional[str] = None
    website: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_accuracy: Optional[str] = None
    clergy: List[Clergy] = field(default_factory=list)
    source: str = ""
    source_url: Optional[str] = None
    fetched_at: str = ""
    raw_html: Optional[str] = None  # Original HTML snippet for audit
    
    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d['clergy'] = [c.to_dict() if hasattr(c, 'to_dict') else c for c in self.clergy]
        return d
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RawParishRecord':
        clergy_list = data.pop('clergy', [])
        record = cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})
        record.clergy = [
            Clergy(**c) if isinstance(c, dict) else c 
            for c in clergy_list
        ]
        return record


@dataclass
class CanonicalChurch:
    """
    Canonical/normalized church record.
    This is the deduplicated, validated output format.
    """
    id: str  # Deterministic hash ID
    name: str
    jurisdiction: Optional[str] = None
    jurisdiction_code: Optional[str] = None
    address: Address = field(default_factory=Address)
    contact: Contact = field(default_factory=Contact)
    geo: GeoLocation = field(default_factory=GeoLocation)
    clergy: List[Clergy] = field(default_factory=list)
    flags: Flags = field(default_factory=Flags)
    source_meta: List[SourceMeta] = field(default_factory=list)
    timestamps: Timestamps = field(default_factory=Timestamps)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'jurisdiction': self.jurisdiction,
            'jurisdiction_code': self.jurisdiction_code,
            'address': self.address.to_dict(),
            'contact': self.contact.to_dict(),
            'geo': self.geo.to_dict(),
            'clergy': [c.to_dict() for c in self.clergy],
            'flags': self.flags.to_dict(),
            'source_meta': [s.to_dict() for s in self.source_meta],
            'timestamps': self.timestamps.to_dict()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CanonicalChurch':
        return cls(
            id=data['id'],
            name=data['name'],
            jurisdiction=data.get('jurisdiction'),
            jurisdiction_code=data.get('jurisdiction_code'),
            address=Address(**data.get('address', {})),
            contact=Contact(**data.get('contact', {})),
            geo=GeoLocation(**data.get('geo', {})),
            clergy=[Clergy(**c) for c in data.get('clergy', [])],
            flags=Flags(**data.get('flags', {})),
            source_meta=[SourceMeta(**s) for s in data.get('source_meta', [])],
            timestamps=Timestamps(**data.get('timestamps', {}))
        )
    
    @staticmethod
    def generate_id(name: str, address: Address, state: str) -> str:
        """
        Generate a stable, deterministic ID based on normalized name + address + state.
        Uses SHA-256 hash truncated to 16 hex chars for reasonable uniqueness.
        """
        from .normalize import normalize_name, normalize_address_for_id
        
        normalized_name = normalize_name(name)
        normalized_addr = normalize_address_for_id(address)
        normalized_state = (state or "").upper().strip()
        
        key = f"{normalized_name}|{normalized_addr}|{normalized_state}"
        hash_digest = hashlib.sha256(key.encode('utf-8')).hexdigest()
        return hash_digest[:16]


@dataclass
class ValidationIssue:
    """Single validation issue."""
    severity: str  # 'error', 'warning', 'info'
    field: str
    message: str
    church_id: Optional[str] = None
    church_name: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class DuplicateCandidate:
    """Pair of potentially duplicate churches."""
    church_id_1: str
    church_name_1: str
    church_id_2: str
    church_name_2: str
    reason: str  # e.g., 'same_name_address', 'same_phone_city', 'same_website'
    confidence: float  # 0.0 - 1.0
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class StateCoverage:
    """Coverage information for a state."""
    state: str
    count: int
    expected_minimum: int = 1
    status: str = "ok"  # 'ok', 'warning', 'missing'
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ValidationReport:
    """Complete validation report."""
    generated_at: str
    source_file: str
    total_churches: int = 0
    counts_by_state: Dict[str, int] = field(default_factory=dict)
    counts_by_jurisdiction: Dict[str, int] = field(default_factory=dict)
    missing_field_counts: Dict[str, int] = field(default_factory=dict)
    duplicate_candidates: List[DuplicateCandidate] = field(default_factory=list)
    state_coverage: List[StateCoverage] = field(default_factory=list)
    sample_records: List[Dict[str, Any]] = field(default_factory=list)
    issues: List[ValidationIssue] = field(default_factory=list)
    scrape_errors: List[Dict[str, Any]] = field(default_factory=list)
    success: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'generated_at': self.generated_at,
            'source_file': self.source_file,
            'total_churches': self.total_churches,
            'counts_by_state': self.counts_by_state,
            'counts_by_jurisdiction': self.counts_by_jurisdiction,
            'missing_field_counts': self.missing_field_counts,
            'duplicate_candidates': [d.to_dict() for d in self.duplicate_candidates],
            'state_coverage': [s.to_dict() for s in self.state_coverage],
            'sample_records': self.sample_records,
            'issues': [i.to_dict() for i in self.issues],
            'scrape_errors': self.scrape_errors,
            'success': self.success
        }
    
    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)
    
    def to_markdown(self) -> str:
        """Generate markdown report."""
        lines = [
            f"# Church Discovery Validation Report",
            f"",
            f"**Generated:** {self.generated_at}",
            f"**Source:** `{self.source_file}`",
            f"**Status:** {'✅ Success' if self.success else '❌ Failed'}",
            f"",
            f"## Summary",
            f"",
            f"- **Total Churches:** {self.total_churches}",
            f"- **Duplicate Candidates:** {len(self.duplicate_candidates)}",
            f"- **Validation Issues:** {len(self.issues)}",
            f"",
            f"## Coverage by State",
            f"",
            f"| State | Count | Status |",
            f"|-------|-------|--------|"
        ]
        
        for sc in sorted(self.state_coverage, key=lambda x: x.state):
            status_icon = "✅" if sc.status == "ok" else ("⚠️" if sc.status == "warning" else "❌")
            lines.append(f"| {sc.state} | {sc.count} | {status_icon} {sc.status} |")
        
        lines.extend([
            f"",
            f"## Coverage by Jurisdiction",
            f"",
            f"| Jurisdiction | Count |",
            f"|--------------|-------|"
        ])
        
        for jur, count in sorted(self.counts_by_jurisdiction.items(), key=lambda x: -x[1]):
            lines.append(f"| {jur or 'Unknown'} | {count} |")
        
        lines.extend([
            f"",
            f"## Missing Fields",
            f"",
            f"| Field | Count |",
            f"|-------|-------|"
        ])
        
        for field_name, count in sorted(self.missing_field_counts.items(), key=lambda x: -x[1]):
            lines.append(f"| {field_name} | {count} |")
        
        if self.duplicate_candidates:
            lines.extend([
                f"",
                f"## Duplicate Candidates",
                f"",
                f"| Church 1 | Church 2 | Reason | Confidence |",
                f"|----------|----------|--------|------------|"
            ])
            for dup in self.duplicate_candidates[:20]:  # Limit to 20
                lines.append(
                    f"| {dup.church_name_1[:30]} | {dup.church_name_2[:30]} | "
                    f"{dup.reason} | {dup.confidence:.0%} |"
                )
            if len(self.duplicate_candidates) > 20:
                lines.append(f"| ... | ({len(self.duplicate_candidates) - 20} more) | ... | ... |")
        
        if self.sample_records:
            lines.extend([
                f"",
                f"## Sample Records (25 random)",
                f"",
            ])
            for i, rec in enumerate(self.sample_records[:25], 1):
                lines.append(f"{i}. **{rec.get('name', 'Unknown')}**")
                if rec.get('address'):
                    addr = rec['address']
                    addr_str = ", ".join(filter(None, [
                        addr.get('street'), addr.get('city'),
                        addr.get('state'), addr.get('zip')
                    ]))
                    lines.append(f"   - {addr_str}")
                if rec.get('jurisdiction'):
                    lines.append(f"   - Jurisdiction: {rec['jurisdiction']}")
                lines.append("")
        
        if self.issues:
            lines.extend([
                f"",
                f"## Validation Issues",
                f"",
            ])
            for issue in self.issues[:50]:
                icon = "❌" if issue.severity == "error" else ("⚠️" if issue.severity == "warning" else "ℹ️")
                lines.append(f"- {icon} [{issue.field}] {issue.message}")
            if len(self.issues) > 50:
                lines.append(f"- ... and {len(self.issues) - 50} more issues")
        
        if self.scrape_errors:
            lines.extend([
                f"",
                f"## Scrape Errors",
                f"",
            ])
            for err in self.scrape_errors:
                lines.append(f"- **{err.get('jurisdiction', 'Unknown')}**: {err.get('error', 'Unknown error')}")
        
        return "\n".join(lines)


# Jurisdiction codes and names for reference
JURISDICTION_CODES = {
    'goa': 'Greek Orthodox Archdiocese of America',
    'oca': 'Orthodox Church in America',
    'aocana': 'Antiochian Orthodox Christian Archdiocese of North America',
    'roc': 'Russian Orthodox Church (Patriarchal Parishes)',
    'rocor': 'Russian Orthodox Church Outside Russia',
    'serb': 'Serbian Orthodox Church in North and South America',
    'goaa': 'Georgian Orthodox Church',
    'bulg': 'Bulgarian Orthodox Diocese of the USA, Canada, and Australia',
    'rom': 'Romanian Orthodox Archdiocese in the Americas',
    'ukr': 'Ukrainian Orthodox Church of the USA',
    'alb': 'Albanian Orthodox Diocese of America',
    'carpath': 'American Carpatho-Russian Orthodox Diocese',
}

# All US states and territories (including DC)
US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
    'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
    'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
    'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
    'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]
