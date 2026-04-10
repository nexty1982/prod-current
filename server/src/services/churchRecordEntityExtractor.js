const { getAppPool } = require('../config/db-compat');
// services/churchRecordEntityExtractor.js
const { promisePool } = require('../config/db-compat');
const { getChurchDbConnection } = require('../utils/dbSwitcher');

/**
 * AI-Powered Entity Extraction Service for Orthodox Church Records
 * Extracts structured data from OCR text using pattern matching and NLP techniques
 */
class ChurchRecordEntityExtractor {
    constructor() {
        this.initializePatterns();
    }

    /**
     * Initialize regex patterns and knowledge bases for Orthodox church records
     */
    initializePatterns() {
        // Date patterns for various formats and languages
        this.datePatterns = [
            // English formats
            /(\d{1,2})[\/\-\.]\s*(\d{1,2})[\/\-\.]\s*(\d{4})/g, // MM/DD/YYYY or DD/MM/YYYY
            /(\d{4})[\/\-\.]\s*(\d{1,2})[\/\-\.]\s*(\d{1,2})/g, // YYYY/MM/DD
            /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/gi,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(\d{4})/gi,
            
            // Greek date patterns
            /(\d{1,2})[\/\-\.]\s*(Ιανουαρίου|Φεβρουαρίου|Μαρτίου|Απριλίου|Μαΐου|Ιουνίου|Ιουλίου|Αυγούστου|Σεπτεμβρίου|Οκτωβρίου|Νοεμβρίου|Δεκεμβρίου)\s+(\d{4})/gi,
            
            // Russian date patterns  
            /(\d{1,2})[\/\-\.]\s*(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})/gi,
            
            // Serbian date patterns
            /(\d{1,2})[\/\-\.]\s*(јануар|фебруар|март|април|мај|јун|јул|август|септембар|октобар|новембар|децембар)\s+(\d{4})/gi,
        ];

        // Name patterns with Orthodox naming conventions
        this.namePatterns = {
            // Full names with patronymics
            fullNameWithPatronymic: /([А-ЯA-Z][а-яa-z]+)\s+([А-ЯA-Z][а-яa-z]+)\s+([А-ЯA-Z][а-яa-z]+)/g,
            
            // Greek names
            greekName: /([Α-Ω][α-ω]+)\s+([Α-Ω][α-ω]+)/g,
            
            // Western format names
            westernName: /([A-Z][a-z]+)\s+([A-Z][a-z]+)/g,
            
            // Names with titles
            nameWithTitle: /(Π\.|Πατήρ|Αρχιεπίσκοπος|Επίσκοπος|Father|Fr\.|Rev\.|Archb\.|Bishop)\s+([А-ЯA-ZΑ-Ω][а-яa-zα-ω]+(?:\s+[А-ЯA-ZΑ-Ω][а-яa-zα-ω]+)?)/gi
        };

        // Orthodox church terminology patterns
        this.orthodoxTerms = {
            baptismTerms: [
                /βαπτ[ίι]ζ|baptiz|крестить|крешт/gi,
                /βεβαιώ|certify|удостоверяю/gi,
                /νονός|νονά|godparent|крестн/gi,
                /ανάδοχος|sponsor/gi,
                // Orthodox registry book terms
                /метрическая\s+книга/gi,
                /о\s+рождениях/gi,
                /received\s+into\s+the\s+holy\s+orthodox\s+church/gi,
                /by\s+chrismation/gi
            ],
            
            marriageTerms: [
                /γάμος|marriage|венчание|брак/gi,
                /νύμφη|bride|невеста/gi,
                /γαμπρός|groom|жених/gi,
                /κουμπάρος|best man|шафер/gi,
                /στεφάνωση|crown|венчание/gi
            ],
            
            funeralTerms: [
                /κηδεία|funeral|похороны/gi,
                /θάνατος|death|смерть/gi,
                /ταφή|burial|погребение/gi,
                /μακαρίτης|deceased|покойный/gi,
                /επικήδειος|memorial|πανихίδα/gi
            ],
            
            clergyTitles: [
                /πατήρ|father|отец|протоиерей|иерей/gi,
                /αρχιεπίσκοπος|archbishop|архиепископ/gi,
                /επίσκοπος|bishop|епископ/gi,
                /πρεσβύτερος|presbyter|пресвитер/gi,
                /διάκονος|deacon|диакон/gi,
                /ιερέας|priest|священник/gi,
                // Orthodox specific titles
                /rev\.|father|fr\.|bishop/gi,
                /протоиерей|архимандрит/gi
            ],

            // Orthodox reception/conversion terms
            receptionTerms: [
                /received\s+into\s+the\s+holy\s+orthodox\s+church/gi,
                /from\s+the\s+byzantine\s+catholic\s+church/gi,
                /by\s+chrismation/gi,
                /where\s+he\s+was\s+baptized/gi,
                /pentecost\s+sunday/gi
            ]
        };

        // Field extraction patterns
        this.fieldPatterns = {
            // Personal information
            firstName: /(?:first\s+name|όνομα|имя)[:\s]+([А-ЯA-ZΑ-Ω][а-яa-zα-ω]+)/gi,
            lastName: /(?:last\s+name|επώνυμο|фамилия)[:\s]+([А-ЯA-ZΑ-Ω][а-яa-zα-ω]+)/gi,
            gender: /(?:gender|φύλο|пол)[:\s]+(male|female|άρρεν|θήλυ|мужской|женский)/gi,
            
            // Baptism specific
            baptismDate: /(?:date\s+of\s+baptism|ημερομηνία\s+βαπτίσματος|дата\s+крещения)[:\s]+([^,\n]+)/gi,
            godparents: /(?:godparents|ανάδοχοι|крестные)[:\s]+([^,\n]+)/gi,
            parents: /(?:parents|γονείς|родители)[:\s]+([^,\n]+)/gi,
            
            // Marriage specific
            marriageDate: /(?:date\s+of\s+marriage|ημερομηνία\s+γάμου|дата\s+брака)[:\s]+([^,\n]+)/gi,
            groomName: /(?:groom|γαμπρός|жених)[:\s]+([^,\n]+)/gi,
            brideName: /(?:bride|νύμφη|невеста)[:\s]+([^,\n]+)/gi,
            witnesses: /(?:witnesses|μάρτυρες|свидетели)[:\s]+([^,\n]+)/gi,
            
            // Death/Funeral specific
            deathDate: /(?:date\s+of\s+death|ημερομηνία\s+θανάτου|дата\s+смерти)[:\s]+([^,\n]+)/gi,
            funeralDate: /(?:date\s+of\s+funeral|ημερομηνία\s+κηδείας|дата\s+похорон)[:\s]+([^,\n]+)/gi,
            placeOfBurial: /(?:place\s+of\s+burial|τόπος\s+ταφής|место\s+погребения)[:\s]+([^,\n]+)/gi,
            
            // Common fields
            church: /(?:church|εκκλησία|церковь|parish|ναός)[:\s]+([^,\n]+)/gi,
            priest: /(?:priest|officiating|ιερέας|священник|πατήρ)[:\s]+([^,\n]+)/gi,
            place: /(?:place|τόπος|место)[:\s]+([^,\n]+)/gi,
            
            // Age patterns
            age: /(?:age|ηλικία|возраст)[:\s]+(\d+)/gi,
            ageAtDeath: /(?:age\s+at\s+death|ηλικία\s+θανάτου|возраст\s+на\s+момент\s+смерти)[:\s]+(\d+)/gi
        };

        // Orthodox calendar considerations
        this.calendarPatterns = {
            oldCalendar: /(?:old\s+style|παλαιό\s+ημερολόγιο|старый\s+стиль)/gi,
            newCalendar: /(?:new\s+style|νέο\s+ημερολόγιο|новый\s+стиль)/gi,
            julianDate: /(?:julian|ιουλιανό)/gi,
            gregorianDate: /(?:gregorian|γρηγοριανό)/gi
        };

        // Registry-specific patterns for tabular Orthodox records
        this.registryPatterns = {
            // Entry number pattern (usually first column)
            entryNumber: /(?:^|\n|\s)(\d{1,4})(?:\s|\.)/gm,
            
            // Column divider patterns - spaces, pipes, tabs
            columnDividers: /\s{3,}|\t+|\|/g,
            
            // Row indicators
            rowSeparators: /\n|\r\n/g,
            
            // Child name patterns (Last, First format common in registries)
            childNameLastFirst: /([A-ZА-Я][a-zа-я]+),\s*([A-ZА-Я][a-zа-я]+(?:\s+[A-ZА-Я][a-zа-я]+)?)/g,
            childNameFirstLast: /([A-ZА-Я][a-zа-я]+(?:\s+[A-ZА-Я][a-zа-я]+)?)\s+([A-ZА-Я][a-zа-я]+)/g,
            
            // Parent name patterns (often includes father and mother)
            fatherName: /([A-ZА-Я][a-zа-я]+)\s+([A-ZА-Я][a-zа-я]+)(?:\s+and|\s+&|\s+и)/gi,
            motherName: /(?:and|&|и)\s+([A-ZА-Я][a-zа-я]+)\s+([A-ZА-Я][a-zа-я]+)/gi,
            
            // Date patterns specific to registry format
            registryDate: /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/g,
            
            // Orthodox priest name patterns
            priestName: /(?:Rev\.|Father|Fr\.)\s+([A-ZА-Я][a-zа-я]+(?:\s+[A-ZА-Я][a-zа-я]+)?)/gi,
            
            // Godparent patterns
            godparentPattern: /([A-ZА-Я][a-zа-я]+\s+[A-ZА-Я][a-zа-я]+)(?:\s+(?:and|&|и)\s+([A-ZА-Я][a-zа-я]+\s+[A-ZА-Я][a-zа-я]+))?/g,
            
            // Place/church patterns
            churchPlace: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})/g,
            
            // Mixed language indicators
            mixedLanguageMarkers: {
                greek: /[Α-Ωα-ω]/,
                cyrillic: /[А-Яа-я]/,
                latin: /[A-Za-z]/
            },
            
            // Registry book headers (help identify structure)
            headerPatterns: [
                /Entry\s+No\.?/gi,
                /Child\s+Name/gi,
                /Date\s+of\s+Birth/gi,
                /Date\s+of\s+Baptism/gi,
                /Parents/gi,
                /Godparents/gi,
                /Officiating\s+Priest/gi,
                /Place/gi,
                /Remarks/gi
            ],
            
            // Marriage-specific patterns
            marriagePatterns: {
                groomInfo: /(?:Full\s+Name\s+of\s+)?Groom/gi,
                brideInfo: /(?:Full\s+Name\s+of\s+)?Bride/gi,
                residence: /(\d+\s+[A-Za-z\s]+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?))[,\s]*([A-Za-z\s]+)[,\s]*([A-Z]{2})\s*(\d{5})?/gi,
                age: /\(Age[:\s]*(\d{1,2})\)|Age[:\s]*(\d{1,2})|(\d{1,2})\s*(?:years?\s*old|yr\.?s?)/gi,
                maritalStatus: /(1st|2nd|3rd|first|second|third)\s*marriage/gi,
                religion: /(Orthodox\s+Christian|Catholic|Protestant|Jewish|Muslim)/gi,
                license: /(?:License|Marriage\s+License)[:\s]*([^,\n]+)/gi
            }
        };
    }

    /**
     * Main entity extraction method
     */
    async extractEntities(ocrText, recordType = null, language = 'en', churchId = null) {
        try {
            console.log(`🤖 Starting AI entity extraction for ${recordType || 'unknown'} record...`);
            
            // Pre-process text
            const cleanedText = this.preprocessText(ocrText);
            
            // Detect language if not provided
            if (language === 'multi') {
                language = this.detectLanguage(cleanedText);
            }
            
            // Auto-detect record type if not provided
            const detectedRecordType = recordType || this.detectRecordType(cleanedText);
            
            console.log(`📝 Detected record type: ${detectedRecordType}, Language: ${language}`);
            
            const extractedData = {
                recordType: detectedRecordType,
                confidence: 0,
                fields: {},
                metadata: {
                    language: language,
                    extractionDate: new Date().toISOString(),
                    sourceText: cleanedText,
                    churchId: churchId
                }
            };

            // Perform record-type specific extraction
            switch (detectedRecordType) {
                case 'baptism':
                    extractedData.fields = await this.extractBaptismData(cleanedText, language);
                    break;
                case 'marriage':
                    extractedData.fields = await this.extractMarriageData(cleanedText, language);
                    break;
                case 'funeral':
                case 'death':
                    extractedData.fields = await this.extractFuneralData(cleanedText, language);
                    break;
                default:
                    extractedData.fields = await this.extractCommonData(cleanedText, language);
            }

            // Calculate overall confidence score
            extractedData.confidence = this.calculateOverallConfidence(extractedData.fields);
            
            // Store extraction results for learning
            if (churchId) {
                await this.storeExtractionResult(extractedData, churchId);
            }
            
            console.log(`✅ Entity extraction completed with ${(extractedData.confidence * 100).toFixed(1)}% confidence`);
            return extractedData;
            
        } catch (error) {
            console.error('❌ Entity extraction failed:', error);
            return {
                recordType: recordType || 'unknown',
                confidence: 0,
                fields: {},
                error: error.message,
                metadata: {
                    language: language,
                    extractionDate: new Date().toISOString(),
                    churchId: churchId
                }
            };
        }
    }

    /**
     * Basic text preprocessing
     */
    preprocessText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\-\.,;:()]/g, ' ')
            .trim();
    }

    /**
     * Detect language from text content
     */
    detectLanguage(text) {
        if (/[Α-Ωα-ω]/.test(text)) return 'gr';
        if (/[А-Яа-я]/.test(text)) return 'ru';
        if (/[Ћћџђнљшч]/.test(text)) return 'sr';
        return 'en';
    }

    /**
     * Auto-detect record type based on content
     */
    detectRecordType(text) {
        const lowerText = text.toLowerCase();
        const scores = { baptism: 0, marriage: 0, funeral: 0 };

        // Check baptism terms
        this.orthodoxTerms.baptismTerms.forEach(pattern => {
            const matches = text.match(pattern) || [];
            scores.baptism += matches.length * 2;
        });

        // Check marriage terms
        this.orthodoxTerms.marriageTerms.forEach(pattern => {
            const matches = text.match(pattern) || [];
            scores.marriage += matches.length * 2;
        });

        // Check funeral terms
        this.orthodoxTerms.funeralTerms.forEach(pattern => {
            const matches = text.match(pattern) || [];
            scores.funeral += matches.length * 2;
        });

        // Additional keyword scoring
        if (lowerText.includes('baptism') || lowerText.includes('βάπτισμα') || lowerText.includes('крещение')) {
            scores.baptism += 3;
        }
        if (lowerText.includes('marriage') || lowerText.includes('γάμος') || lowerText.includes('венчание')) {
            scores.marriage += 3;
        }
        if (lowerText.includes('funeral') || lowerText.includes('κηδεία') || lowerText.includes('похороны')) {
            scores.funeral += 3;
        }

        // Return the highest scoring type
        const maxScore = Math.max(...Object.values(scores));
        if (maxScore === 0) return 'unknown';
        
        return Object.keys(scores).find(key => scores[key] === maxScore);
    }

    /**
     * Extract baptism-specific data
     */
    async extractBaptismData(text, language) {
        const fields = {};
        
        // Check if this is a registry format (tabular data)
        if (this.isRegistryFormat(text)) {
            console.log('📊 Detected registry/tabular format - using specialized extraction');
            Object.assign(fields, await this.extractRegistryData(text, language));
        }
        
        // Standard baptism field extraction
        return fields;
    }

    /**
     * Extract marriage-specific data
     */
    async extractMarriageData(text, language) {
        const fields = {};
        
        // Check if this is a registry format (tabular data)
        if (this.isRegistryFormat(text)) {
            console.log('💒 Detected marriage registry format - using specialized extraction');
            Object.assign(fields, await this.extractMarriageRegistryData(text, language));
        }
        
        return fields;
    }

    /**
     * Calculate overall confidence score
     */
    calculateOverallConfidence(fields) {
        const fieldCount = Object.keys(fields).length;
        if (fieldCount === 0) return 0;
        
        // Basic confidence based on number of extracted fields
        const baseConfidence = Math.min(fieldCount * 0.15, 0.9);
        return Math.round(baseConfidence * 100) / 100;
    }

    /**
     * Extract common data fields
     */
    async extractCommonData(text, language) {
        const fields = {};
        // Basic extraction logic would go here
        return fields;
    }

    /**
     * Extract funeral-specific data
     */
    async extractFuneralData(text, language) {
        const fields = {};
        // Funeral-specific extraction logic would go here
        return fields;
    }

    /**
     * Store extraction results for learning
     */
    async storeExtractionResult(extractedData, churchId) {
        try {
            console.log('💾 Storing extraction result for ML learning');
            // Storage logic would go here
        } catch (error) {
            console.warn('Failed to store extraction result:', error);
        }
    }

    /**
     * Detect if the text is in tabular registry format
     */
    isRegistryFormat(text) {
        // Check for table structure indicators
        const hasEntryNumbers = this.registryPatterns.entryNumber.test(text);
        const hasColumnDividers = this.registryPatterns.columnDividers.test(text);
        const hasTableStructure = /^[^\n]*\|[^\n]*\|[^\n]*$/gm.test(text);
        const hasHeaders = this.registryPatterns.headerPatterns.some(pattern => pattern.test(text));
        
        console.log(`📋 Registry format detection:
        - Entry numbers: ${hasEntryNumbers}
        - Column dividers: ${hasColumnDividers}
        - Table structure: ${hasTableStructure}
        - Headers: ${hasHeaders}`);
        
        return hasEntryNumbers || (hasColumnDividers && hasTableStructure) || hasHeaders;
    }

    /**
     * Extract data from tabular registry format
     */
    async extractRegistryData(text, language) {
        console.log('🗂️ Processing tabular registry data...');
        
        const fields = {};
        
        try {
            // Detect column structure
            const columns = this.detectRegistryColumns(text);
            console.log(`📊 Detected ${columns.length} columns in registry`);
            
            // Split text into rows and extract first data row for demo
            const rows = text.split(/\n|\r\n/).filter(row => row.trim().length > 0);
            
            // Find first data row
            for (const row of rows) {
                if (this.isDataRow(row)) {
                    const extractedRow = this.extractRowData(row, columns);
                    if (Object.keys(extractedRow).length > 0) {
                        Object.assign(fields, extractedRow);
                        break;
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Error extracting registry data:', error);
        }
        
        return fields;
    }

    /**
     * Extract data from marriage registry format
     */
    async extractMarriageRegistryData(text, language) {
        console.log('💒 Processing marriage registry data...');
        
        const fields = {};
        
        try {
            // Detect marriage-specific columns
            const columns = this.detectMarriageRegistryColumns(text);
            console.log(`💒 Detected ${columns.length} marriage columns`);
            
            // Extract marriage-specific data
            // This would include groom/bride parsing, residence extraction, etc.
            
        } catch (error) {
            console.error('❌ Error extracting marriage registry data:', error);
        }
        
        return fields;
    }

    /**
     * Detect column structure in registry text
     */
    detectRegistryColumns(text) {
        const lines = text.split(/\n|\r\n/);
        
        // Find the header line or a line with clear column separators
        for (const line of lines) {
            if (line.includes('|')) {
                // Split by column separators
                const parts = line.split('|').map(part => part.trim()).filter(part => part);
                return parts.map((part, index) => ({
                    index,
                    header: part,
                    type: this.guessColumnType(part)
                }));
            }
        }
        
        // Default column structure for Orthodox baptism registries
        return [
            { index: 0, header: 'Entry No', type: 'entryNumber' },
            { index: 1, header: 'Child Name', type: 'childName' },
            { index: 2, header: 'Date of Birth', type: 'birthDate' },
            { index: 3, header: 'Date of Baptism', type: 'baptismDate' },
            { index: 4, header: 'Parents', type: 'parents' },
            { index: 5, header: 'Godparents', type: 'godparents' },
            { index: 6, header: 'Priest', type: 'priest' }
        ];
    }

    /**
     * Detect marriage-specific column structure
     */
    detectMarriageRegistryColumns(text) {
        const lines = text.split(/\n|\r\n/);
        
        // Find marriage registry header
        for (const line of lines) {
            if (line.includes('|') && (line.toLowerCase().includes('groom') || line.toLowerCase().includes('bride'))) {
                const parts = line.split('|').map(part => part.trim()).filter(part => part);
                return parts.map((part, index) => ({
                    index,
                    header: part,
                    type: this.guessMarriageColumnType(part)
                }));
            }
        }
        
        // Default marriage registry structure
        return [
            { index: 0, header: 'Number', type: 'entryNumber' },
            { index: 1, header: 'Date', type: 'marriageDate' },
            { index: 2, header: 'Groom Info', type: 'groomInfo' },
            { index: 3, header: 'Bride Info', type: 'brideInfo' },
            { index: 4, header: 'Witnesses', type: 'witnesses' },
            { index: 5, header: 'License', type: 'license' }
        ];
    }

    /**
     * Guess the type of data in a column based on header text
     */
    guessColumnType(header) {
        const lowerHeader = header.toLowerCase();
        
        if (/entry|no\.?|#|number/i.test(header)) return 'entryNumber';
        if (/child|name|infant|baby/i.test(header)) return 'childName';
        if (/birth|born/i.test(header)) return 'birthDate';
        if (/baptism|baptiz|christen/i.test(header)) return 'baptismDate';
        if (/parent|father|mother/i.test(header)) return 'parents';
        if (/godparent|sponsor|witness/i.test(header)) return 'godparents';
        if (/priest|clergy|officiat/i.test(header)) return 'priest';
        if (/place|location|church/i.test(header)) return 'place';
        if (/remark|note|comment/i.test(header)) return 'remarks';
        
        return 'unknown';
    }

    /**
     * Guess marriage-specific column types
     */
    guessMarriageColumnType(header) {
        const lowerHeader = header.toLowerCase();
        
        if (/number|no\.?|entry/i.test(header)) return 'entryNumber';
        if (/date/i.test(header)) return 'marriageDate';
        if (/groom/i.test(header)) return 'groomInfo';
        if (/bride/i.test(header)) return 'brideInfo';
        if (/witness/i.test(header)) return 'witnesses';
        if (/license/i.test(header)) return 'license';
        if (/priest|clergy|officiat/i.test(header)) return 'priest';
        
        return 'unknown';
    }

    /**
     * Check if a row contains actual data
     */
    isDataRow(row) {
        // Must have some alphanumeric content
        if (!/[A-Za-zА-Яа-я0-9]/.test(row)) return false;
        
        // Should not be all caps (likely header)
        if (row === row.toUpperCase() && row.length > 10) return false;
        
        // Should not be just dashes (separator)
        if (/^[\-\|\s]+$/.test(row)) return false;
        
        return true;
    }

    /**
     * Extract data from a single registry row
     */
    extractRowData(row, columns) {
        const fields = {};
        
        // Split row into cells
        const cells = row.split('|').map(cell => cell.trim());
        
        // Map cells to column types
        for (let i = 0; i < Math.min(cells.length, columns.length); i++) {
            const cell = cells[i];
            const columnType = columns[i].type;
            
            if (cell && cell.length > 0) {
                this.mapCellToField(cell, columnType, fields);
            }
        }
        
        return fields;
    }

    /**
     * Map a cell value to the appropriate field
     */
    mapCellToField(cell, columnType, fields) {
        switch (columnType) {
            case 'entryNumber':
                fields.entryNumber = parseInt(cell) || cell;
                break;
                
            case 'childName':
                const childName = this.parsePersonName(cell);
                if (childName.firstName) fields.childFirstName = childName.firstName;
                if (childName.lastName) fields.childLastName = childName.lastName;
                break;
                
            case 'birthDate':
            case 'baptismDate':
            case 'marriageDate':
                const date = this.parseDate(cell);
                if (date) {
                    if (columnType === 'birthDate') fields.dateOfBirth = date;
                    else if (columnType === 'baptismDate') fields.dateOfBaptism = date;
                    else if (columnType === 'marriageDate') fields.dateOfMarriage = date;
                }
                break;
                
            case 'parents':
                const parentNames = this.parseParentNames(cell);
                if (parentNames.father) fields.fatherName = parentNames.father;
                if (parentNames.mother) fields.motherName = parentNames.mother;
                break;
                
            case 'godparents':
                fields.godparents = cell;
                break;
                
            case 'priest':
                fields.officiantName = cell;
                break;
                
            default:
                // Store as-is for unknown types
                fields[columnType] = cell;
        }
    }

    /**
     * Parse person name from various formats
     */
    parsePersonName(nameText) {
        const result = { fullName: nameText.trim() };
        
        // Clean up the name text first
        const cleanName = nameText.trim().replace(/\s+/g, ' ');
        
        // Try "Last, First" format (common in registries)
        const lastFirstMatch = cleanName.match(/([A-ZА-ЯΑ-Ω][a-zа-яα-ω]+),\s*([A-ZА-ЯΑ-Ω][a-zа-яα-ω]+(?:\s+[A-ZА-ЯΑ-Ω][a-zа-яα-ω]+)?)/);
        if (lastFirstMatch) {
            result.lastName = lastFirstMatch[1];
            result.firstName = lastFirstMatch[2];
            return result;
        }
        
        // Try "First Last" format or "First Middle Last"
        const nameParts = cleanName.split(/\s+/).filter(part => part.length > 0);
        if (nameParts.length >= 2) {
            result.firstName = nameParts[0];
            if (nameParts.length === 2) {
                result.lastName = nameParts[1];
            } else if (nameParts.length >= 3) {
                result.middleName = nameParts.slice(1, -1).join(' ');
                result.lastName = nameParts[nameParts.length - 1];
            }
        } else if (nameParts.length === 1) {
            result.firstName = nameParts[0];
        }
        
        return result;
    }

    /**
     * Parse parent names from combined text
     */
    parseParentNames(parentText) {
        const result = {};
        
        // Clean the text first
        const cleanText = parentText.trim();
        
        // Look for various "and" separators in different languages
        const andPatterns = [
            /\s+and\s+/gi,     // English
            /\s+&\s+/g,        // Ampersand
            /\s+и\s+/gi,       // Russian/Serbian
            /\s+και\s+/gi,     // Greek
            /\s*,\s*/g         // Comma separator (fallback)
        ];
        
        let parts = [cleanText];
        
        // Try each pattern to split the text
        for (const pattern of andPatterns) {
            const split = cleanText.split(pattern);
            if (split.length === 2) {
                parts = split.map(part => part.trim());
                break;
            }
        }
        
        if (parts.length >= 2) {
            result.father = parts[0].trim();
            result.mother = parts[1].trim();
        } else {
            // If no separator found, assume it's the father's name
            result.father = cleanText;
        }
        
        return result;
    }

    /**
     * Parse date from various formats
     */
    parseDate(dateText) {
        if (!dateText || typeof dateText !== 'string') return null;
        
        const cleaned = dateText.trim();
        
        // Try various date formats common in Orthodox registries.
        // ORDER MATTERS: YYYY-MM-DD must come first, otherwise the second
        // pattern would greedily match "20-05-12" inside "2020-05-12" and
        // misinterpret it as DD/MM/YY (see OMD-874).
        const patterns = [
            /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,    // YYYY/MM/DD (ISO)
            /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/   // MM/DD/YY or DD/MM/YY
        ];
        
        for (const pattern of patterns) {
            const match = cleaned.match(pattern);
            if (match) {
                let year, month, day;
                
                if (match[1].length === 4) {
                    // YYYY format
                    year = parseInt(match[1]);
                    month = parseInt(match[2]);
                    day = parseInt(match[3]);
                } else {
                    // Handle DD/MM or MM/DD ambiguity
                    const first = parseInt(match[1]);
                    const second = parseInt(match[2]);
                    year = parseInt(match[3]);
                    
                    // Handle 2-digit years
                    if (year < 100) {
                        year = year < 50 ? 2000 + year : 1900 + year;
                    }
                    
                    // If first number > 12, it must be day (DD/MM format)
                    if (first > 12 && second >= 1 && second <= 12) {
                        day = first;
                        month = second;
                    }
                    // If second number > 12, it must be day (MM/DD format)
                    else if (second > 12 && first >= 1 && first <= 12) {
                        month = first;
                        day = second;
                    }
                    // Both are <= 12, try DD/MM first (European Orthodox tradition)
                    else if (first >= 1 && first <= 31 && second >= 1 && second <= 12) {
                        day = first;
                        month = second;
                    }
                    // Fallback to MM/DD (US format)
                    else {
                        month = first;
                        day = second;
                    }
                }
                
                // Validate and return
                if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1800 && year <= 2100) {
                    return new Date(year, month - 1, day).toISOString().split('T')[0];
                }
            }
        }
        
        return null;
    }
}

module.exports = ChurchRecordEntityExtractor;