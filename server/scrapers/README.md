# Orthodox Church Directory Builder

An autonomous system for compiling, verifying, and maintaining a comprehensive directory of Orthodox churches in the United States.

## 🎯 Overview

This system automatically scrapes church information from various Orthodox jurisdictions, validates the data, and stores it in a structured database. It supports multiple jurisdictions including OCA, GOARCH, Antiochian, ROCOR, Serbian, Romanian, and Bulgarian Orthodox churches.

## 🏗️ Architecture

### Core Components

1. **Main Orchestrator** (`scrapers/index.js`)
   - Coordinates all scraping activities
   - Manages data processing pipeline
   - Handles error logging and statistics

2. **Jurisdiction Scrapers** (`scrapers/jurisdictions/`)
   - Individual scrapers for each Orthodox jurisdiction
   - Extensible base class for easy addition of new jurisdictions
   - Intelligent content extraction with multiple fallback strategies

3. **Utility Modules** (`scrapers/utils/`)
   - **URL Validator**: Verifies website accessibility and validity
   - **Data Cleaner**: Standardizes and normalizes church data
   - **Duplicate Detector**: Identifies and resolves duplicate entries

4. **Database Integration** (`scrapers/database/`)
   - Automated schema management
   - Efficient bulk data operations
   - Comprehensive statistics and reporting

5. **API Layer** (`routes/church-scraper.js`)
   - RESTful endpoints for church data access
   - Search and filtering capabilities
   - Scraping session management

## 🚀 Quick Start

### 1. Database Setup

First, set up the database schema:

```bash
# Set up database tables and schema
npm run scraper:setup

# Verify database connection
npm run scraper:verify
```

### 2. Run the Scraper

```bash
# Full scraping with all features
npm run scraper:run

# Quick test run (faster, no URL validation)
npm run scraper:run-quick

# Test the scraper system
npm run scraper:test
```

### 3. CLI Usage

The scraper includes a comprehensive command-line interface:

```bash
# Basic usage
node scrapers/cli.js

# Custom options
node scrapers/cli.js --output /custom/path --log-level debug --concurrent 5

# Skip URL validation for faster processing
node scrapers/cli.js --no-validate-urls

# Skip duplicate detection
node scrapers/cli.js --no-duplicate-detection

# Show help
node scrapers/cli.js --help
```

## 📊 Database Schema

### Core Tables

#### `orthodox_churches`
Main table storing church information:
- Basic info: name, jurisdiction, location
- Contact info: website, email, phone
- Additional metadata: establishment year, clergy
- Search optimization: normalized names, keywords
- Data quality: source tracking, validation status

#### `scraping_sessions`
Tracks scraping activities:
- Session metadata: start/end times, configuration
- Statistics: churches scraped, duplicates found, errors
- Status tracking: running, completed, failed

#### `scraping_errors`
Detailed error logging:
- Error categorization by jurisdiction and type
- Full error messages and context
- Associated URLs and timestamps

#### Additional Tables
- `url_validations`: Website validation results
- `duplicate_groups`: Duplicate detection results

### Views and Procedures

The schema includes optimized views for common queries:
- `v_churches_by_jurisdiction`: Summary statistics by jurisdiction
- `v_churches_by_state`: Geographic distribution
- `v_recent_scraping_activity`: Recent scraping sessions

Stored procedures for efficient operations:
- `GetChurchesByJurisdiction(jurisdiction)`
- `GetChurchesByLocation(state, city)`
- `SearchChurches(search_term)`
- `GetScrapingStatistics()`

## 🌐 API Endpoints

### Church Data Access

```http
# Get all churches with filtering
GET /api/church-scraper/churches?jurisdiction=OCA&state=NY&limit=50

# Search churches
GET /api/church-scraper/churches/search?q=saint nicholas

# Get churches by jurisdiction
GET /api/church-scraper/churches/jurisdiction/GOARCH

# Get statistics
GET /api/church-scraper/statistics

# Get scraper status
GET /api/church-scraper/status
```

### Scraping Operations

```http
# Start new scraping session
POST /api/church-scraper/scrape
Content-Type: application/json
{
  "validateUrls": true,
  "maxConcurrentScrapers": 3,
  "logLevel": "info"
}

# Get scraping sessions history
GET /api/church-scraper/sessions
```

## 🔧 Configuration

### Environment Variables

```env
# Database configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=orthodoxmetrics

# Optional: Scraper settings
SCRAPER_CONCURRENT_LIMIT=3
SCRAPER_URL_VALIDATION=true
SCRAPER_LOG_LEVEL=info
```

### Programmatic Configuration

```javascript
const ChurchDirectoryBuilder = require('./scrapers/index');

const scraper = new ChurchDirectoryBuilder({
    outputDir: '/custom/output',
    logLevel: 'debug',
    maxConcurrentScrapers: 5,
    validateUrls: true,
    enableDuplicateDetection: true,
    saveToDatabase: true,
    databaseConfig: {
        host: 'localhost',
        user: 'root',
        password: 'password',
        database: 'orthodoxmetrics'
    }
});

const results = await scraper.runAutonomousScraping();
```

## 📈 Monitoring and Statistics

### Built-in Metrics

The system tracks comprehensive metrics:
- **Church Count**: Total churches by jurisdiction and state
- **Data Quality**: Percentage with websites, contact info, full addresses
- **Validation Results**: URL accessibility rates
- **Duplicate Detection**: Duplicate groups and resolution rates
- **Performance**: Scraping duration, success/error rates

### Example Statistics Output

```json
{
  "overall": {
    "total_churches": 2847,
    "total_jurisdictions": 7,
    "churches_with_websites": 1923,
    "validated_websites": 1634,
    "avg_establishment_year": 1952
  },
  "byJurisdiction": [
    { "jurisdiction": "GOARCH", "count": 1234 },
    { "jurisdiction": "OCA", "count": 678 },
    { "jurisdiction": "Antiochian", "count": 456 }
  ]
}
```

## 🛠️ Development

### Adding New Jurisdictions

1. Create a new scraper class extending `BaseScraper`:

```javascript
const BaseScraper = require('./base-scraper');

class NewJurisdictionScraper extends BaseScraper {
    constructor(options = {}) {
        super({
            jurisdiction: 'New Jurisdiction Name',
            baseUrl: 'https://example.org',
            ...options
        });
    }

    async scrapeChurches() {
        // Implementation specific to this jurisdiction
        const churches = [];
        // ... scraping logic
        return churches;
    }
}
```

2. Add to the main scraper list in `scrapers/index.js`
3. Test with the jurisdiction-specific test suite

### Testing

```bash
# Run comprehensive test
npm run scraper:test

# Performance testing
node scrapers/test-scraper.js --performance

# Debug mode testing
node scrapers/test-scraper.js --debug
```

### Database Management

```bash
# Reset database (WARNING: Deletes all data)
npm run scraper:reset

# Verify connection and show current stats
npm run scraper:verify
```

## 🔒 Data Privacy and Ethics

This scraper is designed to:
- Only collect publicly available information
- Respect website robots.txt files
- Implement rate limiting to avoid overloading servers
- Provide clear attribution to data sources
- Support opt-out requests from church administrators

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify database credentials in `.env`
   - Ensure database server is running
   - Check network connectivity

2. **Scraping Timeouts**
   - Reduce concurrent scrapers: `--concurrent 1`
   - Increase timeout in scraper configuration
   - Check internet connectivity

3. **Memory Issues**
   - Process churches in smaller batches
   - Disable URL validation for initial runs
   - Monitor memory usage with built-in logging

### Debug Mode

Enable detailed logging:

```bash
node scrapers/cli.js --log-level debug
```

### Error Analysis

Review error logs in the database:

```sql
SELECT jurisdiction, error_type, COUNT(*) as error_count
FROM scraping_errors 
GROUP BY jurisdiction, error_type
ORDER BY error_count DESC;
```

## 📝 Contributing

1. Follow the established patterns for new jurisdiction scrapers
2. Include comprehensive error handling
3. Add appropriate tests for new functionality
4. Update documentation for any API changes
5. Ensure data privacy compliance

## 📄 License

This project is part of the OrthodoxMetrics system and follows the same licensing terms.
