# Orthodox Church Discovery Pipeline

A production-grade system for discovering, normalizing, and maintaining a canonical list of Orthodox Christian parishes in the United States.

## Overview

This pipeline scrapes parish data from the Assembly of Canonical Orthodox Bishops directory (and potentially other sources), normalizes the data, deduplicates records, and produces a clean JSON dataset suitable for import into MariaDB.

### Features

- **Multi-source scraping** - Primary: Assembly of Bishops; modular architecture for adding other sources
- **Respectful scraping** - Rate limiting, robots.txt compliance, disk caching
- **Data normalization** - Address parsing, phone formatting, state code standardization
- **Stable IDs** - Deterministic hash-based IDs for reliable deduplication
- **Comprehensive validation** - State coverage checks, duplicate detection, field completeness
- **JSON output** - Ready for MariaDB import with documented schema

## Installation

```bash
# From the project root
pip install -r tools/church_discovery/requirements.txt
```

## Quick Start

```bash
# Run the complete pipeline
python -m tools.church_discovery.cli run-all

# Or run steps individually:

# 1. Fetch raw data from Assembly of Bishops
python -m tools.church_discovery.cli fetch --source assembly

# 2. Build canonical (normalized, deduplicated) dataset
python -m tools.church_discovery.cli build-canonical

# 3. Validate and generate reports
python -m tools.church_discovery.cli validate
```

## CLI Commands

### `fetch`

Fetch raw parish data from a source.

```bash
python -m tools.church_discovery.cli fetch --source assembly \
    --out data/church_discovery/raw/assembly_20260118.json \
    --delay 1.0
```

Options:
- `--source` - Data source: `assembly` (default)
- `--out` - Output file path (default: auto-generated with date)
- `--delay` - Delay between requests in seconds (default: 1.0)
- `--no-cache` - Disable disk caching

### `build-canonical`

Transform raw data into canonical format.

```bash
python -m tools.church_discovery.cli build-canonical \
    --in data/church_discovery/raw/assembly_20260118.json \
    --out data/church_discovery/canonical/churches_us_canonical.json
```

Options:
- `--in` - Input raw data file
- `--out` - Output canonical file path

### `validate`

Validate canonical data and generate reports.

```bash
python -m tools.church_discovery.cli validate \
    --in data/church_discovery/canonical/churches_us_canonical.json \
    --out data/church_discovery/reports/
```

Options:
- `--in` - Input canonical data file
- `--out` - Output directory for reports

### `run-all`

Run the complete pipeline (fetch + build + validate).

```bash
python -m tools.church_discovery.cli run-all --delay 1.0
```

## Output Files

### Raw Data
```
data/church_discovery/raw/assembly_of_bishops_YYYYMMDD.json
```

Contains the exact data as scraped, preserving original formatting.

### Canonical Data
```
data/church_discovery/canonical/churches_us_canonical.json
```

Normalized, deduplicated parish data ready for import.

### Validation Reports
```
data/church_discovery/reports/validation_YYYYMMDD.json
data/church_discovery/reports/validation_YYYYMMDD.md
```

Detailed validation results including coverage checks and duplicate candidates.

## Data Schema

### Canonical Church Object

```json
{
  "id": "a1b2c3d4e5f67890",
  "name": "Saint Nicholas Greek Orthodox Church",
  "jurisdiction": "Greek Orthodox Archdiocese of America",
  "jurisdiction_code": "goa",
  "address": {
    "street": "123 Main Street",
    "city": "Anytown",
    "state": "NY",
    "zip": "12345"
  },
  "contact": {
    "phone": "(555) 123-4567",
    "website": "http://stnicholas.goarch.org"
  },
  "geo": {
    "lat": 40.7128,
    "lng": -74.0060,
    "accuracy": "exact"
  },
  "clergy": [],
  "flags": {
    "has_metrical_data": null,
    "is_om_client": null
  },
  "source_meta": [
    {
      "source": "assembly_of_bishops",
      "source_id_or_url": "https://assemblyofbishops.org/...",
      "fetched_at": "2026-01-18T12:00:00",
      "raw_html_snippet": "..."
    }
  ],
  "timestamps": {
    "discovered_at": "2026-01-18T12:00:00",
    "last_verified_at": "2026-01-18T12:00:00"
  }
}
```

### ID Generation

IDs are deterministic SHA-256 hashes (truncated to 16 hex chars) of:
```
NORMALIZED_NAME | NORMALIZED_ADDRESS | STATE
```

This ensures:
- Same church always gets the same ID
- Changes to unrelated fields don't change the ID
- Duplicates from different sources map to the same ID

## MariaDB Import

The canonical JSON is designed for easy import into MariaDB. Here's the recommended schema:

```sql
CREATE TABLE churches (
    id CHAR(16) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(255),
    jurisdiction_code VARCHAR(20),
    
    -- Address
    street VARCHAR(255),
    city VARCHAR(100),
    state CHAR(2),
    zip VARCHAR(10),
    
    -- Contact
    phone VARCHAR(20),
    website VARCHAR(500),
    
    -- Geo
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    geo_accuracy VARCHAR(20),
    
    -- Flags
    has_metrical_data BOOLEAN DEFAULT NULL,
    is_om_client BOOLEAN DEFAULT NULL,
    
    -- Timestamps
    discovered_at DATETIME,
    last_verified_at DATETIME,
    
    -- Indexes
    INDEX idx_state (state),
    INDEX idx_jurisdiction (jurisdiction_code),
    INDEX idx_city_state (city, state)
);

CREATE TABLE church_sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id CHAR(16) NOT NULL,
    source VARCHAR(50) NOT NULL,
    source_url VARCHAR(500),
    fetched_at DATETIME,
    raw_snippet TEXT,
    
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
    INDEX idx_church (church_id),
    INDEX idx_source (source)
);
```

### Import Script (outline)

```python
import json
import mysql.connector

def import_canonical(json_path, db_config):
    with open(json_path) as f:
        data = json.load(f)
    
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    
    for church in data['churches']:
        cursor.execute('''
            INSERT INTO churches (id, name, jurisdiction, ...)
            VALUES (%s, %s, %s, ...)
            ON DUPLICATE KEY UPDATE
            last_verified_at = VALUES(last_verified_at)
        ''', (
            church['id'],
            church['name'],
            church['jurisdiction'],
            # ...
        ))
        
        for source in church['source_meta']:
            cursor.execute('''
                INSERT INTO church_sources (church_id, source, ...)
                VALUES (%s, %s, ...)
            ''', (church['id'], source['source'], ...))
    
    conn.commit()
```

## Data Sources

### Primary: Assembly of Canonical Orthodox Bishops

URL: https://www.assemblyofbishops.org/directories/parishes/

The official multi-jurisdictional directory maintained by the Assembly. Contains parishes from all canonical Orthodox jurisdictions in the US.

**Jurisdictions included:**
- GOA - Greek Orthodox Archdiocese of America
- OCA - Orthodox Church in America
- AOCANA - Antiochian Orthodox Christian Archdiocese
- ROCOR - Russian Orthodox Church Outside Russia
- Serbian, Romanian, Bulgarian, Ukrainian, Albanian, Carpatho-Russian, and others

### Secondary Sources (Phase 2 - Not Implemented)

The architecture supports adding additional sources for enrichment:
- GOARCH direct (Greek Archdiocese)
- OCA direct
- Antiochian Archdiocese

## Ethics & Compliance

This scraper follows ethical scraping practices:

1. **robots.txt** - Automatically checked before scraping; exits if disallowed
2. **Rate Limiting** - Default 1 second delay between requests
3. **Disk Caching** - Cached responses avoid repeated requests
4. **User-Agent** - Descriptive UA identifying the purpose
5. **Public Data Only** - Only scrapes publicly listed parish information
6. **No Personal Emails** - Does not extract or store personal email addresses

## Development

### Running Tests

```bash
# From project root
pytest tests/church_discovery/ -v
```

### Adding a New Source

1. Create `sources/your_source.py` implementing:
   - `fetch()` - Retrieve data
   - `parse()` - Parse into `RawParishRecord` objects

2. Register in `sources/__init__.py`

3. Add CLI option in `cli.py`

## Troubleshooting

### "robots.txt disallows scraping"

The source website has changed its robots.txt policy. Check manually:
```
curl https://www.assemblyofbishops.org/robots.txt
```

### Low parish counts

Some jurisdictions may have very few parishes. Check the validation report for details. Ensure all jurisdictions were scraped successfully.

### Cache issues

Clear the cache and re-run:
```bash
rm -rf .cache/church_discovery/
python -m tools.church_discovery.cli run-all --no-cache
```

## License

Internal use only. Parish data is sourced from publicly available directories.
