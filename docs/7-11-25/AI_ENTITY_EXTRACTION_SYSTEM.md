# AI-Powered Entity Extraction System for Orthodox Church Records

## 🤖 Overview

The AI-Powered Entity Extraction System is an advanced post-processing enhancement that builds upon the existing OCR pipeline to automatically extract structured data from Orthodox church records. This system uses pattern matching, natural language processing, and machine learning techniques to identify and extract key information from baptism certificates, marriage records, funeral documents, and other church records.

## ✨ Key Features

### 🧠 Intelligent Entity Extraction
- **Multi-Record Type Support**: Baptism, marriage, funeral/death records
- **Orthodox-Specific Knowledge**: Built-in understanding of Orthodox church terminology, naming conventions, and practices
- **Multi-Language Support**: Processes records in Greek, Russian, Serbian, Romanian, English, and other Orthodox languages
- **Field-Specific Patterns**: Specialized extraction for names, dates, places, clergy, family relationships, and religious information

### 📊 Confidence Scoring
- **Field-Level Confidence**: Each extracted field receives a confidence score (0-100%)
- **Overall Extraction Confidence**: Aggregated confidence for the entire record
- **Automatic Review Flagging**: Low-confidence extractions are flagged for human review
- **Context-Aware Scoring**: Confidence based on pattern strength, field length, and contextual clues

### 🎓 Machine Learning & Improvement
- **User Correction Learning**: System learns from user corrections to improve future extractions
- **Pattern Evolution**: Extraction patterns improve based on feedback
- **Correction Logging**: All user corrections are logged for analysis and training
- **Performance Analytics**: Detailed statistics on extraction accuracy and improvement

### 🔍 Review & Quality Control
- **Human Review Workflow**: Systematic review of low-confidence extractions
- **Bulk Operations**: Process multiple records simultaneously
- **Correction Interface**: User-friendly editing interface for extracted fields
- **Audit Trail**: Complete history of extractions and corrections

## 🏗️ Architecture

### Backend Components

#### 1. ChurchRecordEntityExtractor Service
**File**: `server/services/churchRecordEntityExtractor.js`

Core extraction engine that:
- Processes OCR text using regex patterns and NLP techniques
- Detects record types automatically
- Extracts structured fields based on record type
- Calculates confidence scores
- Stores results for learning and analytics

#### 2. Enhanced OCR Processing Service
**File**: `server/services/ocrProcessingService.js`

Updated to include entity extraction:
- Automatically triggers entity extraction after OCR completion
- Stores extracted entities in database
- Flags low-confidence extractions for review
- Logs extraction performance

#### 3. Entity Extraction Controller
**File**: `server/controllers/entityExtractionController.js`

API endpoints for:
- Retrieving extracted entities for specific jobs
- Updating entities with user corrections
- Manually triggering extraction
- Getting extraction statistics
- Managing review queues
- Bulk operations

#### 4. Database Schema Enhancements
**File**: `server/database/migrations/add_entity_extraction_tables.sql`

New tables:
- `ocr_extraction_results`: Stores extraction results for analytics
- `ocr_correction_log`: Logs user corrections for learning
- `ocr_pattern_improvements`: Tracks pattern evolution
- `orthodox_knowledge_base`: Orthodox-specific terminology and patterns

Enhanced `ocr_jobs` table:
- `extracted_entities`: JSON field with structured extracted data
- `entity_confidence`: Overall extraction confidence score
- `needs_review`: Flag for low-confidence extractions
- `reviewed_by`, `review_date`, `review_notes`: Human review tracking

### Frontend Components

#### 1. EntityExtractionViewer
**File**: `front-end/src/components/ocr/EntityExtractionViewer.tsx`

Interactive component for:
- Displaying extracted entities organized by category
- Showing confidence scores for each field
- Editing and correcting extracted data
- Triggering manual re-extraction
- Adding review notes

#### 2. ExtractionAnalytics
**File**: `front-end/src/components/ocr/ExtractionAnalytics.tsx`

Analytics dashboard showing:
- Overall extraction performance metrics
- Statistics by record type
- Jobs needing review
- Learning and correction statistics
- Exportable reports

## 🚀 API Endpoints

### Entity Management
```http
# Get extracted entities for a job
GET /api/church/{churchId}/ocr/jobs/{jobId}/entities

# Update entities with user corrections
PUT /api/church/{churchId}/ocr/jobs/{jobId}/entities

# Manually trigger entity extraction
POST /api/church/{churchId}/ocr/jobs/{jobId}/extract
```

### Analytics & Review
```http
# Get extraction statistics
GET /api/church/{churchId}/ocr/extraction/stats?timeframe=30d

# Get jobs needing review
GET /api/church/{churchId}/ocr/extraction/review

# Bulk entity extraction
POST /api/church/{churchId}/ocr/extraction/bulk
```

## 📋 Entity Categories & Fields

### Personal Information
- **Names**: First name, last name, full name, middle name
- **Demographics**: Gender, age, date of birth, place of birth
- **Identification**: Titles, occupations, education level

### Religious Information
- **Clergy**: Priest name, clergy titles (Father, Archbishop, Bishop)
- **Church Details**: Parish name, church name, diocese
- **Sacramental Info**: Baptism dates, confirmation, ordination
- **Sponsors**: Godparents, sponsors, witnesses

### Family Relationships
- **Parents**: Father name, mother name, both parents
- **Marriage**: Groom name, bride name, maiden names
- **Extended Family**: Siblings, guardians, next of kin

### Dates & Events
- **Birth/Death**: Birth date, death date, age at death
- **Sacramental Dates**: Baptism, marriage, funeral dates
- **Administrative**: Issue date, expiry date, registration date

### Location Information
- **Places**: Birth place, marriage place, burial place
- **Addresses**: Residence, church address, cemetery location
- **Geographic**: City, region, country

### Record-Specific Fields

#### Baptism Records
- Child's name and birth details
- Parents' names and information
- Godparents/sponsors
- Baptism date and location
- Officiating clergy
- Entry type (infant, adult convert, conditional, emergency)

#### Marriage Records
- Groom and bride full names
- Marriage date and location
- Parents of both parties
- Witnesses and best man (koumbaros)
- Officiating clergy
- Previous marriage status
- Dispensation information

#### Funeral/Death Records
- Deceased person's full name
- Date of death and funeral
- Age at death and cause
- Place of burial
- Surviving family members
- Officiating clergy

## 🎯 Confidence Scoring System

### Confidence Levels
- **High (80-100%)**: Reliable extraction, minimal review needed
- **Medium (60-79%)**: Good extraction, light review recommended
- **Low (0-59%)**: Requires human review and correction

### Scoring Factors
1. **Pattern Strength**: How well the text matches extraction patterns
2. **Context Clues**: Surrounding text provides validation
3. **Field Length**: Longer matches generally more reliable
4. **Multiple Matches**: Consistent information across document
5. **Knowledge Base**: Matches known Orthodox terminology

### Automatic Review Flagging
- Records with overall confidence < 60% are flagged for review
- Individual fields with confidence < 40% are highlighted
- Missing critical fields trigger review requirements
- Inconsistent information patterns flag for attention

## 🎓 Machine Learning & Improvement

### Learning Mechanisms
1. **User Correction Analysis**: System analyzes differences between AI extraction and user corrections
2. **Pattern Evolution**: Successful correction patterns are incorporated into extraction rules
3. **Confidence Calibration**: Confidence scoring improves based on correction frequency
4. **Knowledge Base Expansion**: New terms and patterns added from successful extractions

### Feedback Loop
1. User corrects extracted fields
2. Corrections logged with original extraction
3. Pattern analysis identifies improvement opportunities
4. Updated patterns tested on similar records
5. Successful patterns incorporated into main system

### Performance Tracking
- Extraction accuracy by record type
- Confidence score calibration
- User correction frequency
- Pattern effectiveness metrics
- Learning curve analysis

## 📊 Analytics & Reporting

### Performance Metrics
- **Extraction Rate**: Percentage of jobs with successful entity extraction
- **Average Confidence**: Mean confidence score across all extractions
- **Review Rate**: Percentage of flagged jobs that have been reviewed
- **Correction Frequency**: How often users correct AI extractions

### Record Type Analysis
- Performance breakdown by baptism, marriage, funeral records
- Language-specific accuracy rates
- Field-specific extraction success rates
- Temporal performance trends

### Quality Indicators
- High/medium/low confidence distribution
- Most commonly corrected fields
- Learning curve progression
- User satisfaction metrics

## 🔧 Setup & Installation

### 1. Database Setup
```bash
# Run the entity extraction setup script
node setup-entity-extraction.js
```

This script:
- Creates new tables for entity extraction
- Adds columns to existing `ocr_jobs` table
- Populates Orthodox knowledge base
- Sets up indexes for performance

### 2. Dependency Installation
```bash
# Install required dependencies (if not already present)
npm install sharp @google-cloud/vision @google-cloud/translate
```

### 3. Configuration
The system uses existing OCR configuration:
- Google Vision API credentials
- Database connections
- Church isolation settings

### 4. Integration
The entity extraction system automatically integrates with:
- Existing OCR processing pipeline
- Church admin panels
- User authentication system
- Activity logging

## 🛠️ Usage Examples

### Basic Entity Extraction
```javascript
const entityExtractor = new ChurchRecordEntityExtractor();

// Extract entities from OCR text
const entities = await entityExtractor.extractEntities(
  ocrText,           // OCR result text
  'baptism',         // Record type
  'el',              // Language
  churchId           // Church ID for learning
);

console.log('Extracted entities:', entities);
```

### API Usage
```javascript
// Get extracted entities for a job
const response = await fetch(`/api/church/14/ocr/jobs/123/entities`);
const data = await response.json();

// Update entities with corrections
await fetch(`/api/church/14/ocr/jobs/123/entities`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    correctedFields: {
      firstName: 'Corrected Name',
      baptismDate: '2024-01-15'
    },
    reviewNotes: 'Corrected name spelling and date format'
  })
});
```

### Frontend Integration
```tsx
import EntityExtractionViewer from '@/components/ocr/EntityExtractionViewer';

// Display entity extraction interface
<EntityExtractionViewer
  jobId={123}
  churchId={14}
  onEntitiesUpdated={(entities) => {
    console.log('Entities updated:', entities);
  }}
/>
```

## 🎯 Best Practices

### For Administrators
1. **Regular Review**: Check jobs flagged for review weekly
2. **Correction Quality**: Provide clear, consistent corrections
3. **Documentation**: Add meaningful review notes
4. **Monitoring**: Track extraction performance trends

### For Users
1. **Accuracy First**: Prioritize correctness over speed in corrections
2. **Consistency**: Use consistent formatting for dates, names, places
3. **Complete Information**: Fill in missing fields when known
4. **Clear Notes**: Explain corrections for AI learning

### For Developers
1. **Pattern Testing**: Test new patterns on diverse record types
2. **Performance Monitoring**: Watch for extraction speed degradation
3. **Error Handling**: Graceful fallbacks for extraction failures
4. **Knowledge Base Maintenance**: Regular updates to Orthodox terminology

## 🔍 Troubleshooting

### Common Issues

#### Low Extraction Confidence
- **Cause**: Poor OCR quality, unclear text, unusual formatting
- **Solution**: Improve OCR preprocessing, adjust confidence thresholds, manual correction

#### Missing Fields
- **Cause**: Text doesn't match extraction patterns, incomplete documents
- **Solution**: Add custom patterns, manual field entry, improve OCR

#### Incorrect Record Type Detection
- **Cause**: Ambiguous terminology, mixed content
- **Solution**: Manual record type specification, pattern refinement

#### Performance Issues
- **Cause**: Large volumes, complex patterns, database queries
- **Solution**: Optimize patterns, index database fields, batch processing

### Debug Tools
- Extraction result logging
- Pattern match analysis
- Confidence score breakdown
- Performance timing metrics

## 📈 Future Enhancements

### Planned Features
1. **Advanced NLP**: Integration with modern language models
2. **Image Analysis**: Direct field extraction from document images
3. **Cross-Record Validation**: Consistency checks across related records
4. **Automated Corrections**: High-confidence auto-corrections
5. **Multi-Document Processing**: Extract from multiple pages/documents

### Integration Opportunities
1. **Record Management**: Auto-populate record forms
2. **Search Enhancement**: Semantic search using extracted entities
3. **Data Validation**: Cross-reference extracted data
4. **Reporting**: Generate statistics from extracted information

## 📚 Additional Resources

### Documentation Files
- `MULTI_TENANT_OCR_SYSTEM_DOCUMENTATION.md`: Base OCR system
- `ORTHODOX_STYLING_GUIDE.md`: UI styling for Orthodox themes
- Database migration files in `database/migrations/`

### Code References
- Entity extraction service: `services/churchRecordEntityExtractor.js`
- Enhanced OCR service: `services/ocrProcessingService.js`
- API controllers: `controllers/entityExtractionController.js`
- Frontend components: `components/ocr/`

### Support
For technical support or questions about the entity extraction system:
1. Check the troubleshooting section above
2. Review extraction analytics for performance insights
3. Examine extraction logs for detailed debugging
4. Consult the user correction log for learning opportunities

---

**System Status**: Production Ready ✅  
**Version**: 1.0  
**Last Updated**: January 2025  
**AI Enhancement**: Fully Implemented 🤖
