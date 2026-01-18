"""
Command-line interface for the Orthodox Church Discovery pipeline.

Commands:
    fetch           Fetch raw parish data from a source
    build-canonical Build canonical JSON from raw data
    validate        Validate canonical data and generate reports
    run-all         Run complete pipeline (fetch + build + validate)

Usage:
    python -m tools.church_discovery.cli fetch --source assembly
    python -m tools.church_discovery.cli build-canonical --in raw.json --out canonical.json
    python -m tools.church_discovery.cli validate --in canonical.json --out reports/
    python -m tools.church_discovery.cli run-all
"""

from __future__ import annotations

import argparse
import json
import sys
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

from .models import (
    RawParishRecord,
    CanonicalChurch,
    Address,
    Contact,
    GeoLocation,
    Clergy,
    SourceMeta,
    Timestamps,
    Flags,
    US_STATES,
)
from .sources.assembly_of_bishops import (
    AssemblyOfBishopsSource,
    fetch_assembly_parishes,
    RobotsDisallowedError,
)
from .normalize import (
    normalize_name_display,
    normalize_state,
    normalize_zip,
    normalize_phone,
    normalize_website,
    parse_city_state_zip,
    normalize_jurisdiction_name,
)
from .validate import validate_churches, ChurchValidator


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_default_paths() -> Dict[str, Path]:
    """Get default paths for data files."""
    today = datetime.now().strftime('%Y%m%d')
    base = Path('data/church_discovery')
    
    return {
        'raw_dir': base / 'raw',
        'canonical_dir': base / 'canonical',
        'reports_dir': base / 'reports',
        'raw_file': base / 'raw' / f'assembly_of_bishops_{today}.json',
        'canonical_file': base / 'canonical' / 'churches_us_canonical.json',
        'validation_json': base / 'reports' / f'validation_{today}.json',
        'validation_md': base / 'reports' / f'validation_{today}.md',
    }


def ensure_directories(paths: Dict[str, Path]) -> None:
    """Ensure all output directories exist."""
    for key in ['raw_dir', 'canonical_dir', 'reports_dir']:
        paths[key].mkdir(parents=True, exist_ok=True)


def raw_to_canonical(raw: RawParishRecord) -> CanonicalChurch:
    """
    Convert a raw parish record to canonical format.
    
    Args:
        raw: Raw parish record from scraping
        
    Returns:
        Canonical church record
    """
    # Parse city/state/zip from combined line
    city, state, zip_code = parse_city_state_zip(raw.address_line2)
    
    # Override with normalized state
    state = normalize_state(state)
    
    # Build address
    address = Address(
        street=raw.address_line1,
        city=city,
        state=state,
        zip=normalize_zip(zip_code)
    )
    
    # Build contact
    contact = Contact(
        phone=normalize_phone(raw.phone),
        website=normalize_website(raw.website)
    )
    
    # Build geo location
    geo = GeoLocation(
        lat=raw.latitude,
        lng=raw.longitude,
        accuracy=raw.location_accuracy
    )
    
    # Build source metadata
    source_meta = [SourceMeta(
        source=raw.source,
        source_id_or_url=raw.source_url,
        fetched_at=raw.fetched_at,
        raw_html_snippet=raw.raw_html[:500] if raw.raw_html else None
    )]
    
    # Generate deterministic ID
    church_id = CanonicalChurch.generate_id(
        name=raw.name,
        address=address,
        state=state or ""
    )
    
    # Build canonical record
    return CanonicalChurch(
        id=church_id,
        name=normalize_name_display(raw.name) or raw.name,
        jurisdiction=normalize_jurisdiction_name(raw.jurisdiction),
        jurisdiction_code=raw.jurisdiction_code,
        address=address,
        contact=contact,
        geo=geo,
        clergy=raw.clergy,
        flags=Flags(),
        source_meta=source_meta,
        timestamps=Timestamps(
            discovered_at=raw.fetched_at,
            last_verified_at=raw.fetched_at
        )
    )


def deduplicate_churches(churches: List[CanonicalChurch]) -> List[CanonicalChurch]:
    """
    Deduplicate churches by ID, merging source metadata.
    
    Churches with the same ID (based on normalized name + address)
    are merged, keeping the first occurrence but combining source_meta.
    
    Args:
        churches: List of canonical churches (may contain duplicates)
        
    Returns:
        Deduplicated list with merged source metadata
    """
    seen: Dict[str, CanonicalChurch] = {}
    merge_log: List[Dict[str, Any]] = []
    
    for church in churches:
        if church.id in seen:
            # Merge source metadata
            existing = seen[church.id]
            
            # Add new source metadata
            for sm in church.source_meta:
                # Check if this source is already recorded
                if not any(
                    es.source == sm.source and es.source_id_or_url == sm.source_id_or_url
                    for es in existing.source_meta
                ):
                    existing.source_meta.append(sm)
            
            merge_log.append({
                'id': church.id,
                'kept': existing.name,
                'merged': church.name,
                'reason': 'duplicate_id'
            })
        else:
            seen[church.id] = church
    
    if merge_log:
        logger.info(f"Merged {len(merge_log)} duplicate records")
    
    return list(seen.values())


def is_us_record(church: CanonicalChurch) -> tuple[bool, str]:
    """
    Determine if a church record is in the United States using robust heuristics.
    
    A record is considered US if ANY of the following are true:
    1. state is one of the 2-letter US states/DC
    2. zip matches US ZIP format (5 digits or 5+4)
    3. address contains ", USA" or "United States"
    4. Source is known to be US-focused (Assembly of Bishops)
    
    Missing country does NOT cause exclusion.
    
    Args:
        church: Canonical church record
        
    Returns:
        Tuple of (is_us: bool, reason: str)
    """
    import re
    
    # Check 1: State is a valid US state code
    state = church.address.state
    if state and state.upper() in US_STATES:
        return True, "by_state"
    
    # Check 2: ZIP code matches US format (5 digits or 5+4)
    zip_code = church.address.zip
    if zip_code:
        # US ZIP: 5 digits, optionally followed by -4 digits
        if re.match(r'^\d{5}(-\d{4})?$', zip_code.strip()):
            return True, "by_zip"
    
    # Check 3: Address contains USA or United States
    # Build full address string for checking
    addr_parts = [
        church.address.street or "",
        church.address.city or "",
        church.address.state or "",
    ]
    full_addr = " ".join(addr_parts).upper()
    
    if ", USA" in full_addr or "UNITED STATES" in full_addr:
        return True, "by_address"
    
    # Check 4: Source is known to be US-focused
    # Assembly of Bishops directory is primarily US parishes
    for sm in church.source_meta:
        if sm.source == "assembly_of_bishops":
            # Assembly is US-focused, but we should still try to filter
            # non-US entries like Bahamas, Canada based on other signals
            pass
    
    # Check for known non-US indicators
    city = (church.address.city or "").upper()
    state_raw = (church.address.state or "").upper()
    
    # Known non-US locations
    non_us_indicators = [
        "BAHAMAS", "CANADA", "MEXICO", "PUERTO RICO", 
        "VIRGIN ISLANDS", "GUAM", "BERMUDA",
        # Canadian provinces
        "ONTARIO", "QUEBEC", "BRITISH COLUMBIA", "ALBERTA",
        "MANITOBA", "SASKATCHEWAN", "NOVA SCOTIA",
        "ON", "QC", "BC", "AB",  # Canadian province codes
    ]
    
    for indicator in non_us_indicators:
        if indicator in city or indicator == state_raw:
            return False, "non_us_indicator"
    
    # If we have a city but no recognizable state/zip, 
    # and source is assembly_of_bishops, give benefit of doubt
    # (the directory is US-focused)
    for sm in church.source_meta:
        if sm.source == "assembly_of_bishops" and church.address.city:
            return True, "by_source_us_focused"
    
    # Default: if we can't determine, exclude
    return False, "unknown"


def filter_us_only(churches: List[CanonicalChurch]) -> List[CanonicalChurch]:
    """
    Filter to only include US parishes using robust heuristics.
    
    A record qualifies as US if:
    - state is in US_STATES/DC, OR
    - zip matches US ZIP regex, OR  
    - address contains "USA"/"United States", OR
    - source is known US-focused and no non-US indicators found
    
    Missing country does NOT cause exclusion.
    
    Args:
        churches: List of all churches
        
    Returns:
        List of US-only churches
    """
    us_churches = []
    excluded = []
    
    # Track qualification reasons for debug summary
    qualification_counts = {
        'by_state': 0,
        'by_zip': 0,
        'by_address': 0,
        'by_source_us_focused': 0,
    }
    exclusion_counts = {
        'non_us_indicator': 0,
        'unknown': 0,
    }
    
    for church in churches:
        is_us, reason = is_us_record(church)
        
        if is_us:
            us_churches.append(church)
            if reason in qualification_counts:
                qualification_counts[reason] += 1
        else:
            excluded.append((church, reason))
            if reason in exclusion_counts:
                exclusion_counts[reason] += 1
    
    # Log debug summary
    total_qualified = len(us_churches)
    total_excluded = len(excluded)
    
    logger.info(f"US classification results: {total_qualified} US, {total_excluded} excluded")
    logger.info(f"  Qualified by state: {qualification_counts['by_state']}")
    logger.info(f"  Qualified by ZIP: {qualification_counts['by_zip']}")
    logger.info(f"  Qualified by address text: {qualification_counts['by_address']}")
    logger.info(f"  Qualified by US-focused source: {qualification_counts['by_source_us_focused']}")
    
    if total_excluded > 0:
        logger.info(f"  Excluded (non-US indicator): {exclusion_counts['non_us_indicator']}")
        logger.info(f"  Excluded (unknown): {exclusion_counts['unknown']}")
        
        # Log first few excluded for debugging
        for church, reason in excluded[:5]:
            logger.debug(
                f"Excluded: {church.name} | city={church.address.city} | "
                f"state={church.address.state} | zip={church.address.zip} | reason={reason}"
            )
        if len(excluded) > 5:
            logger.debug(f"  ... and {len(excluded) - 5} more excluded")
    
    return us_churches


def cmd_fetch(args: argparse.Namespace) -> int:
    """Execute the fetch command."""
    paths = get_default_paths()
    ensure_directories(paths)
    
    source = args.source
    output_path = Path(args.out) if args.out else paths['raw_file']
    
    logger.info(f"Fetching from source: {source}")
    
    if source != 'assembly':
        logger.error(f"Unknown source: {source}. Only 'assembly' is supported.")
        return 1
    
    try:
        # Create scraper
        scraper = AssemblyOfBishopsSource(
            delay_seconds=args.delay,
            cache_enabled=not args.no_cache
        )
        
        # Check robots.txt
        scraper.check_robots_txt()
        
        # Fetch all jurisdictions
        result = scraper.fetch_all()
        
        # Save raw data
        output_data = {
            'source': 'assembly_of_bishops',
            'fetched_at': datetime.now().isoformat(),
            'total_records': len(result.records),
            'jurisdictions_scraped': result.jurisdictions_scraped,
            'errors': result.errors,
            'cache_stats': {
                'hits': result.cache_hits,
                'misses': result.cache_misses
            },
            'records': [r.to_dict() for r in result.records]
        }
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved {len(result.records)} records to {output_path}")
        
        if result.errors:
            logger.warning(f"Encountered {len(result.errors)} errors during fetch")
            for err in result.errors:
                logger.warning(f"  - {err['jurisdiction']}: {err['error']}")
            return 1
        
        return 0
        
    except RobotsDisallowedError as e:
        logger.error(f"robots.txt disallows scraping: {e}")
        return 2
    
    except Exception as e:
        logger.error(f"Fetch failed: {e}")
        return 1


def cmd_build_canonical(args: argparse.Namespace) -> int:
    """Execute the build-canonical command."""
    paths = get_default_paths()
    ensure_directories(paths)
    
    input_path = Path(args.input) if args.input else paths['raw_file']
    output_path = Path(args.out) if args.out else paths['canonical_file']
    
    if not input_path.exists():
        logger.error(f"Input file not found: {input_path}")
        return 1
    
    logger.info(f"Building canonical from: {input_path}")
    
    try:
        # Load raw data
        with open(input_path, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
        
        # Convert records
        raw_records = [
            RawParishRecord.from_dict(r) 
            for r in raw_data.get('records', [])
        ]
        
        logger.info(f"Loaded {len(raw_records)} raw records")
        
        # Convert to canonical
        canonical = [raw_to_canonical(r) for r in raw_records]
        
        # Filter US only
        canonical = filter_us_only(canonical)
        
        # Deduplicate
        canonical = deduplicate_churches(canonical)
        
        logger.info(f"Produced {len(canonical)} canonical records after deduplication")
        
        # Build output
        output_data = {
            'schema_version': '1.0',
            'generated_at': datetime.now().isoformat(),
            'source_file': str(input_path),
            'total_churches': len(canonical),
            'churches': [c.to_dict() for c in canonical]
        }
        
        # Save
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved canonical data to {output_path}")
        return 0
        
    except Exception as e:
        logger.error(f"Build failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


def cmd_validate(args: argparse.Namespace) -> int:
    """Execute the validate command."""
    paths = get_default_paths()
    ensure_directories(paths)
    
    input_path = Path(args.input) if args.input else paths['canonical_file']
    output_dir = Path(args.out) if args.out else paths['reports_dir']
    
    if not input_path.exists():
        logger.error(f"Input file not found: {input_path}")
        return 1
    
    logger.info(f"Validating: {input_path}")
    
    try:
        # Load canonical data
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        churches = [CanonicalChurch.from_dict(c) for c in data.get('churches', [])]
        
        logger.info(f"Loaded {len(churches)} churches for validation")
        
        # Run validation
        report = validate_churches(churches, str(input_path))
        
        # Save reports
        output_dir.mkdir(parents=True, exist_ok=True)
        today = datetime.now().strftime('%Y%m%d')
        
        json_path = output_dir / f'validation_{today}.json'
        md_path = output_dir / f'validation_{today}.md'
        
        with open(json_path, 'w', encoding='utf-8') as f:
            f.write(report.to_json())
        
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(report.to_markdown())
        
        logger.info(f"Validation report saved to:")
        logger.info(f"  JSON: {json_path}")
        logger.info(f"  Markdown: {md_path}")
        
        # Summary
        print(f"\n{'='*60}")
        print(f"VALIDATION SUMMARY")
        print(f"{'='*60}")
        print(f"Total churches: {report.total_churches}")
        print(f"Duplicate candidates: {len(report.duplicate_candidates)}")
        print(f"Validation issues: {len(report.issues)}")
        print(f"Success: {'Yes' if report.success else 'No'}")
        print(f"{'='*60}\n")
        
        return 0 if report.success else 1
        
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


def cmd_run_all(args: argparse.Namespace) -> int:
    """Execute the complete pipeline."""
    paths = get_default_paths()
    ensure_directories(paths)
    
    logger.info("="*60)
    logger.info("CHURCH DISCOVERY PIPELINE - FULL RUN")
    logger.info("="*60)
    
    # Step 1: Fetch
    logger.info("\n[1/3] FETCHING RAW DATA")
    logger.info("-"*40)
    
    fetch_args = argparse.Namespace(
        source='assembly',
        out=str(paths['raw_file']),
        delay=args.delay if hasattr(args, 'delay') else 1.0,
        no_cache=args.no_cache if hasattr(args, 'no_cache') else False
    )
    
    result = cmd_fetch(fetch_args)
    if result != 0:
        logger.error("Fetch failed, aborting pipeline")
        return result
    
    # Step 2: Build canonical
    logger.info("\n[2/3] BUILDING CANONICAL DATA")
    logger.info("-"*40)
    
    build_args = argparse.Namespace(
        input=str(paths['raw_file']),
        out=str(paths['canonical_file'])
    )
    
    result = cmd_build_canonical(build_args)
    if result != 0:
        logger.error("Build failed, aborting pipeline")
        return result
    
    # Step 3: Validate
    logger.info("\n[3/3] VALIDATING DATA")
    logger.info("-"*40)
    
    validate_args = argparse.Namespace(
        input=str(paths['canonical_file']),
        out=str(paths['reports_dir'])
    )
    
    result = cmd_validate(validate_args)
    
    logger.info("\n" + "="*60)
    logger.info("PIPELINE COMPLETE")
    logger.info("="*60)
    
    return result


def cmd_export_excel(args: argparse.Namespace) -> int:
    """Execute the export-excel command."""
    from .excel_export import export_from_canonical_json
    
    paths = get_default_paths()
    
    # Determine input path
    input_path = Path(args.input) if args.input else paths['canonical_file']
    
    if not input_path.exists():
        logger.error(f"Input file not found: {input_path}")
        logger.info("Run 'run-all' first to generate canonical data")
        return 1
    
    # Determine output path
    if args.out:
        output_path = Path(args.out)
    else:
        # Default: tools/church_discovery/MM-DD-YYYY.orthodox-church.xlsx
        date_str = datetime.now().strftime("%m-%d-%Y")
        output_path = Path("tools/church_discovery") / f"{date_str}.orthodox-church.xlsx"
    
    logger.info(f"Exporting to Excel: {output_path}")
    logger.info(f"Source: {input_path}")
    
    try:
        result_path = export_from_canonical_json(str(input_path), str(output_path))
        logger.info(f"Excel export complete: {result_path}")
        
        print(f"\n{'='*60}")
        print("EXCEL EXPORT COMPLETE")
        print(f"{'='*60}")
        print(f"Output file: {result_path}")
        print(f"{'='*60}\n")
        
        return 0
        
    except Exception as e:
        logger.error(f"Export failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


def main():
    """Main entry point for CLI."""
    parser = argparse.ArgumentParser(
        prog='church_discovery',
        description='Orthodox Church Discovery Pipeline - Find and catalog Orthodox parishes in the US'
    )
    
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # fetch command
    fetch_parser = subparsers.add_parser(
        'fetch',
        help='Fetch raw parish data from a source'
    )
    fetch_parser.add_argument(
        '--source',
        choices=['assembly'],
        default='assembly',
        help='Data source to fetch from (default: assembly)'
    )
    fetch_parser.add_argument(
        '--out',
        help='Output file path (default: data/church_discovery/raw/assembly_of_bishops_YYYYMMDD.json)'
    )
    fetch_parser.add_argument(
        '--delay',
        type=float,
        default=1.0,
        help='Delay between requests in seconds (default: 1.0)'
    )
    fetch_parser.add_argument(
        '--no-cache',
        action='store_true',
        help='Disable disk caching'
    )
    
    # build-canonical command
    build_parser = subparsers.add_parser(
        'build-canonical',
        help='Build canonical JSON from raw data'
    )
    build_parser.add_argument(
        '--in', '--input',
        dest='input',
        help='Input raw data file'
    )
    build_parser.add_argument(
        '--out',
        help='Output canonical file path'
    )
    
    # validate command
    validate_parser = subparsers.add_parser(
        'validate',
        help='Validate canonical data and generate reports'
    )
    validate_parser.add_argument(
        '--in', '--input',
        dest='input',
        help='Input canonical data file'
    )
    validate_parser.add_argument(
        '--out',
        help='Output directory for reports'
    )
    
    # run-all command
    runall_parser = subparsers.add_parser(
        'run-all',
        help='Run complete pipeline (fetch + build + validate)'
    )
    runall_parser.add_argument(
        '--delay',
        type=float,
        default=1.0,
        help='Delay between requests in seconds (default: 1.0)'
    )
    runall_parser.add_argument(
        '--no-cache',
        action='store_true',
        help='Disable disk caching'
    )
    
    # export-excel command
    export_parser = subparsers.add_parser(
        'export-excel',
        help='Export canonical data to Excel workbook (one sheet per jurisdiction)'
    )
    export_parser.add_argument(
        '--in', '--input',
        dest='input',
        help='Input canonical data file (default: latest canonical JSON)'
    )
    export_parser.add_argument(
        '--out',
        help='Output Excel file path (default: tools/church_discovery/MM-DD-YYYY.orthodox-church.xlsx)'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    if args.command is None:
        parser.print_help()
        return 0
    
    # Dispatch to command handler
    handlers = {
        'fetch': cmd_fetch,
        'build-canonical': cmd_build_canonical,
        'validate': cmd_validate,
        'run-all': cmd_run_all,
        'export-excel': cmd_export_excel,
    }
    
    handler = handlers.get(args.command)
    if handler:
        return handler(args)
    else:
        parser.print_help()
        return 1


if __name__ == '__main__':
    sys.exit(main())
