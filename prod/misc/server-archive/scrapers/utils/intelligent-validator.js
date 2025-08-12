// 📁 server/scrapers/utils/intelligent-validator.js
// Step 3: Intelligent Data Validation - Enhanced validation system

const axios = require('axios');
const cheerio = require('cheerio');

class IntelligentValidator {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.timeout = options.timeout || 10000;
        this.retryAttempts = options.retryAttempts || 3;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        
        // Cross-reference sources for validation
        this.validationSources = [
            'https://www.assemblyofbishops.org/directories',
            'https://www.goarch.org/parish-locator',
            'https://www.oca.org/parishes/search'
        ];
        
        this.validationRules = this.initializeValidationRules();
    }

    initializeValidationRules() {
        return {
            // Required field validation
            required: ['name', 'jurisdiction'],
            
            // Data format validation
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
            zipCode: /^\d{5}(-\d{4})?$/,
            year: {
                min: 1600,
                max: new Date().getFullYear()
            },
            
            // URL validation patterns
            validDomains: [
                /\.org$/i, /\.com$/i, /\.net$/i, /\.church$/i, 
                /\.orthodoxchurch$/i, /\.cathedral$/i
            ],
            
            // Suspicious patterns to flag
            suspiciousPatterns: [
                /\b(test|demo|example|sample)\b/i,
                /\b(lorem ipsum)/i,
                /\b(placeholder)/i,
                /\b(todo|fixme|temp)\b/i
            ],
            
            // Orthodox-specific validation
            orthodoxKeywords: [
                'orthodox', 'cathedral', 'church', 'parish', 'monastery',
                'liturgy', 'vespers', 'matins', 'father', 'priest'
            ]
        };
    }

    /**
     * Main validation method - Step 3 implementation
     */
    async validateChurchData(churches) {
        this.logger.info('🔍 Starting Step 3: Intelligent Data Validation...');
        
        const validationResults = [];
        
        for (let i = 0; i < churches.length; i++) {
            const church = churches[i];
            this.logger.info(`Validating church ${i + 1}/${churches.length}: ${church.name}`);
            
            const validation = await this.validateSingleChurch(church);
            validationResults.push(validation);
            
            // Add validation results to church record
            church.validation = validation;
            church.is_validated = validation.isValid;
            church.validation_score = validation.score;
            church.validation_flags = validation.flags;
            church.validation_date = new Date();
        }
        
        this.logger.info('✅ Intelligent validation completed', {
            totalChurches: churches.length,
            validChurches: validationResults.filter(v => v.isValid).length,
            flaggedChurches: validationResults.filter(v => v.flags.length > 0).length
        });
        
        return validationResults;
    }

    async validateSingleChurch(church) {
        const validation = {
            isValid: true,
            score: 0,
            flags: [],
            details: {},
            crossReferences: []
        };

        try {
            // 1. Required field validation
            this.validateRequiredFields(church, validation);
            
            // 2. Data format validation
            this.validateDataFormats(church, validation);
            
            // 3. Enhanced website validation
            if (church.website) {
                await this.validateWebsiteIntelligently(church.website, validation);
            }
            
            // 4. Cross-reference validation
            await this.crossReferenceChurch(church, validation);
            
            // 5. Orthodox-specific validation
            this.validateOrthodoxAuthenticity(church, validation);
            
            // 6. Data consistency checks
            this.validateDataConsistency(church, validation);
            
            // Calculate final validation score
            validation.score = this.calculateValidationScore(validation);
            validation.isValid = validation.score >= 70 && validation.flags.length === 0;
            
        } catch (error) {
            this.logger.error('Validation error', { 
                church: church.name, 
                error: error.message 
            });
            validation.flags.push(`Validation error: ${error.message}`);
            validation.isValid = false;
        }
        
        return validation;
    }

    validateRequiredFields(church, validation) {
        for (const field of this.validationRules.required) {
            if (!church[field] || !church[field].toString().trim()) {
                validation.flags.push(`Missing required field: ${field}`);
                validation.details[field] = 'missing';
            } else {
                validation.details[field] = 'valid';
                validation.score += 20;
            }
        }
    }

    validateDataFormats(church, validation) {
        // Email validation
        if (church.contact_email) {
            if (this.validationRules.email.test(church.contact_email)) {
                validation.details.email = 'valid';
                validation.score += 10;
            } else {
                validation.flags.push('Invalid email format');
                validation.details.email = 'invalid';
            }
        }
        
        // Phone validation
        if (church.contact_phone) {
            if (this.validationRules.phone.test(church.contact_phone)) {
                validation.details.phone = 'valid';
                validation.score += 10;
            } else {
                validation.flags.push('Invalid phone format');
                validation.details.phone = 'invalid';
            }
        }
        
        // ZIP code validation
        if (church.zip_code) {
            if (this.validationRules.zipCode.test(church.zip_code)) {
                validation.details.zipCode = 'valid';
                validation.score += 5;
            } else {
                validation.flags.push('Invalid ZIP code format');
                validation.details.zipCode = 'invalid';
            }
        }
        
        // Establishment year validation
        if (church.establishment_year) {
            const year = parseInt(church.establishment_year);
            if (year >= this.validationRules.year.min && year <= this.validationRules.year.max) {
                validation.details.establishmentYear = 'valid';
                validation.score += 5;
            } else {
                validation.flags.push('Invalid establishment year');
                validation.details.establishmentYear = 'invalid';
            }
        }
    }

    async validateWebsiteIntelligently(website, validation) {
        try {
            // Basic URL format check
            const url = new URL(website);
            validation.details.website = { url: website };
            
            // Check for valid domain patterns
            const hasValidDomain = this.validationRules.validDomains.some(pattern => 
                pattern.test(url.hostname)
            );
            
            if (hasValidDomain) {
                validation.score += 5;
                validation.details.website.domain = 'valid';
            }
            
            // Attempt to fetch and analyze website content
            const response = await axios.get(website, {
                timeout: this.timeout,
                headers: { 'User-Agent': this.userAgent },
                validateStatus: status => status < 500 // Accept 4xx as potentially valid
            });
            
            if (response.status === 200) {
                validation.details.website.accessible = true;
                validation.score += 15;
                
                // Analyze content for Orthodox indicators
                const $ = cheerio.load(response.data);
                const content = $('body').text().toLowerCase();
                
                const orthodoxKeywordCount = this.validationRules.orthodoxKeywords
                    .filter(keyword => content.includes(keyword)).length;
                
                if (orthodoxKeywordCount >= 3) {
                    validation.details.website.orthodoxContent = true;
                    validation.score += 10;
                } else if (orthodoxKeywordCount >= 1) {
                    validation.details.website.orthodoxContent = 'partial';
                    validation.score += 5;
                } else {
                    validation.flags.push('Website lacks Orthodox indicators');
                    validation.details.website.orthodoxContent = false;
                }
                
            } else {
                validation.flags.push(`Website returned status ${response.status}`);
                validation.details.website.accessible = false;
            }
            
        } catch (error) {
            validation.flags.push(`Website validation failed: ${error.message}`);
            validation.details.website.accessible = false;
        }
    }

    async crossReferenceChurch(church, validation) {
        // This is a simplified implementation - in production, you'd want more sophisticated matching
        validation.crossReferences = [];
        
        try {
            // Look for mentions of the church in known Orthodox directories
            const searchTerms = [
                church.name,
                `${church.name} ${church.city}`,
                `${church.name} ${church.state}`
            ];
            
            for (const term of searchTerms) {
                // Simulate cross-reference check (in real implementation, would query external sources)
                const references = await this.searchExternalSources(term);
                validation.crossReferences.push(...references);
            }
            
            if (validation.crossReferences.length > 0) {
                validation.score += 15;
                validation.details.crossReference = 'found';
            } else {
                validation.details.crossReference = 'not_found';
                validation.flags.push('No external references found');
            }
            
        } catch (error) {
            this.logger.warn('Cross-reference validation failed', { error: error.message });
            validation.details.crossReference = 'error';
        }
    }

    async searchExternalSources(searchTerm) {
        // Placeholder for external source searching
        // In production, this would query official Orthodox directories
        return []; // Return empty for now
    }

    validateOrthodoxAuthenticity(church, validation) {
        let orthodoxScore = 0;
        
        // Check for Orthodox jurisdiction
        const orthodoxJurisdictions = [
            'Orthodox Church in America', 'OCA',
            'Greek Orthodox Archdiocese', 'GOARCH',
            'Antiochian Orthodox', 'ROCOR',
            'Serbian Orthodox', 'Romanian Orthodox', 'Bulgarian Orthodox'
        ];
        
        const hasOrthodoxJurisdiction = orthodoxJurisdictions.some(jurisdiction =>
            church.jurisdiction && church.jurisdiction.includes(jurisdiction)
        );
        
        if (hasOrthodoxJurisdiction) {
            orthodoxScore += 20;
        } else {
            validation.flags.push('Non-Orthodox or unclear jurisdiction');
        }
        
        // Check for Orthodox terminology in church name
        const orthodoxTerms = ['orthodox', 'cathedral', 'monastery', 'church'];
        const nameHasOrthodoxTerms = orthodoxTerms.some(term =>
            church.name && church.name.toLowerCase().includes(term)
        );
        
        if (nameHasOrthodoxTerms) {
            orthodoxScore += 10;
        }
        
        validation.score += orthodoxScore;
        validation.details.orthodoxAuthenticity = orthodoxScore >= 20 ? 'high' : 'low';
    }

    validateDataConsistency(church, validation) {
        const inconsistencies = [];
        
        // Check for suspicious patterns
        const allText = Object.values(church)
            .filter(value => typeof value === 'string')
            .join(' ').toLowerCase();
        
        for (const pattern of this.validationRules.suspiciousPatterns) {
            if (pattern.test(allText)) {
                inconsistencies.push(`Suspicious pattern detected: ${pattern.source}`);
            }
        }
        
        // Check data completeness consistency
        const hasWebsite = !!church.website;
        const hasEmail = !!church.contact_email;
        const hasPhone = !!church.contact_phone;
        
        const contactMethods = [hasWebsite, hasEmail, hasPhone].filter(Boolean).length;
        
        if (contactMethods === 0) {
            inconsistencies.push('No contact methods available');
        } else if (contactMethods >= 2) {
            validation.score += 5; // Bonus for multiple contact methods
        }
        
        validation.flags.push(...inconsistencies);
        validation.details.consistency = inconsistencies.length === 0 ? 'good' : 'issues';
    }

    calculateValidationScore(validation) {
        // Base score from individual validations, capped at 100
        let score = Math.min(100, validation.score);
        
        // Penalty for flags
        score -= validation.flags.length * 5;
        
        // Ensure score doesn't go below 0
        return Math.max(0, score);
    }

    /**
     * Generate validation report
     */
    generateValidationReport(churches) {
        const validChurches = churches.filter(c => c.is_validated);
        const flaggedChurches = churches.filter(c => c.validation_flags && c.validation_flags.length > 0);
        
        const report = {
            summary: {
                total: churches.length,
                valid: validChurches.length,
                flagged: flaggedChurches.length,
                validationRate: (validChurches.length / churches.length * 100).toFixed(1)
            },
            scoreDistribution: this.calculateScoreDistribution(churches),
            commonFlags: this.analyzeCommonFlags(flaggedChurches),
            recommendations: this.generateRecommendations(churches)
        };
        
        return report;
    }

    calculateScoreDistribution(churches) {
        const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
        
        churches.forEach(church => {
            const score = church.validation_score || 0;
            if (score >= 90) distribution.excellent++;
            else if (score >= 75) distribution.good++;
            else if (score >= 60) distribution.fair++;
            else distribution.poor++;
        });
        
        return distribution;
    }

    analyzeCommonFlags(flaggedChurches) {
        const flagCounts = {};
        
        flaggedChurches.forEach(church => {
            if (church.validation_flags) {
                church.validation_flags.forEach(flag => {
                    flagCounts[flag] = (flagCounts[flag] || 0) + 1;
                });
            }
        });
        
        return Object.entries(flagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([flag, count]) => ({ flag, count }));
    }

    generateRecommendations(churches) {
        const recommendations = [];
        
        const invalidChurches = churches.filter(c => !c.is_validated);
        if (invalidChurches.length > 0) {
            recommendations.push(`Review ${invalidChurches.length} invalid church records`);
        }
        
        const noWebsiteChurches = churches.filter(c => !c.website);
        if (noWebsiteChurches.length > 0) {
            recommendations.push(`${noWebsiteChurches.length} churches missing websites - consider manual research`);
        }
        
        const lowScoreChurches = churches.filter(c => (c.validation_score || 0) < 60);
        if (lowScoreChurches.length > 0) {
            recommendations.push(`${lowScoreChurches.length} churches have low validation scores - requires attention`);
        }
        
        return recommendations;
    }
}

module.exports = IntelligentValidator;
