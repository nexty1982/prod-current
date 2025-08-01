// 📁 server/scrapers/utils/data-cleaner.js
// Data cleaning and standardization utility

class DataCleaner {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.strictMode = options.strictMode || false;
    }

    async cleanChurchData(churches) {
        this.logger.info('Starting data cleaning process', { totalChurches: churches.length });
        
        const cleanedChurches = [];
        const rejectedChurches = [];
        
        for (const church of churches) {
            try {
                const cleaned = this.cleanSingleChurch(church);
                
                if (this.isValidChurch(cleaned)) {
                    cleanedChurches.push(cleaned);
                } else {
                    rejectedChurches.push({
                        original: church,
                        reason: 'Failed validation'
                    });
                }
            } catch (error) {
                this.logger.warn('Error cleaning church data', {
                    church: church.name,
                    error: error.message
                });
                rejectedChurches.push({
                    original: church,
                    reason: error.message
                });
            }
        }
        
        this.logger.info('Data cleaning completed', {
            cleaned: cleanedChurches.length,
            rejected: rejectedChurches.length
        });
        
        return cleanedChurches;
    }

    cleanSingleChurch(church) {
        const cleaned = {
            ...church,
            name: this.cleanChurchName(church.name),
            jurisdiction: this.cleanJurisdiction(church.jurisdiction),
            website: this.cleanWebsite(church.website),
            address: this.cleanAddress(church.address),
            city: this.cleanCity(church.city),
            state: this.cleanState(church.state),
            zip_code: this.cleanZipCode(church.zip_code),
            establishment_year: this.cleanYear(church.establishment_year),
            clergy_contact: this.cleanClergyName(church.clergy_contact),
            contact_email: this.cleanEmail(church.contact_email),
            contact_phone: this.cleanPhone(church.contact_phone),
            source_url: this.cleanUrl(church.source_url),
            last_updated: new Date()
        };
        
        // Add computed fields
        cleaned.full_address = this.buildFullAddress(cleaned);
        cleaned.name_normalized = this.normalizeChurchName(cleaned.name);
        cleaned.search_keywords = this.generateSearchKeywords(cleaned);
        
        return cleaned;
    }

    cleanChurchName(name) {
        if (!name) return null;
        
        name = name.toString().trim();
        
        // Remove common prefixes/suffixes that might be inconsistent
        name = name.replace(/^(The\s+)?Orthodox\s+Church\s+(of\s+)?/i, '');
        name = name.replace(/\s+(Orthodox\s+)?(Church|Parish|Cathedral|Chapel|Mission)$/i, '');
        
        // Standardize saint abbreviations
        name = name.replace(/\bSt\.\s*/g, 'Saint ');
        name = name.replace(/\bSts\.\s*/g, 'Saints ');
        
        // Standardize spacing and capitalization
        name = name.replace(/\s+/g, ' ').trim();
        name = this.toTitleCase(name);
        
        return name;
    }

    cleanJurisdiction(jurisdiction) {
        if (!jurisdiction) return null;
        
        const jurisdictionMap = {
            'oca': 'Orthodox Church in America (OCA)',
            'orthodox church in america': 'Orthodox Church in America (OCA)',
            'goarch': 'Greek Orthodox Archdiocese of America (GOARCH)',
            'greek orthodox archdiocese': 'Greek Orthodox Archdiocese of America (GOARCH)',
            'antiochian': 'Antiochian Orthodox Christian Archdiocese',
            'antiochian orthodox': 'Antiochian Orthodox Christian Archdiocese',
            'rocor': 'Russian Orthodox Church Outside Russia (ROCOR)',
            'russian orthodox church outside russia': 'Russian Orthodox Church Outside Russia (ROCOR)',
            'serbian orthodox': 'Serbian Orthodox Church',
            'romanian orthodox': 'Romanian Orthodox Episcopate of America',
            'bulgarian orthodox': 'Bulgarian Orthodox Church'
        };
        
        const key = jurisdiction.toLowerCase().trim();
        return jurisdictionMap[key] || jurisdiction;
    }

    cleanWebsite(website) {
        if (!website) return null;
        
        website = website.toString().trim();
        
        // Remove common prefixes
        website = website.replace(/^(https?:\/\/)?(www\.)?/i, '');
        
        // Add https prefix
        if (website && !website.match(/^https?:\/\//)) {
            website = 'https://' + website;
        }
        
        // Remove trailing slash
        website = website.replace(/\/$/, '');
        
        // Basic URL validation
        const urlPattern = /^https?:\/\/[^\s]+\.[^\s]+$/;
        if (!urlPattern.test(website)) {
            return null;
        }
        
        return website;
    }

    cleanAddress(address) {
        if (!address) return null;
        
        address = address.toString().trim();
        
        // Standardize common abbreviations
        const abbreviations = {
            'Street': 'St',
            'Avenue': 'Ave',
            'Boulevard': 'Blvd',
            'Drive': 'Dr',
            'Road': 'Rd',
            'Lane': 'Ln',
            'Court': 'Ct',
            'Place': 'Pl',
            'Circle': 'Cir'
        };
        
        for (const [full, abbrev] of Object.entries(abbreviations)) {
            const regex = new RegExp(`\\b${full}\\b`, 'gi');
            address = address.replace(regex, abbrev);
        }
        
        // Clean up spacing
        address = address.replace(/\s+/g, ' ').trim();
        
        return this.toTitleCase(address);
    }

    cleanCity(city) {
        if (!city) return null;
        
        city = city.toString().trim();
        city = city.replace(/\s+/g, ' ');
        
        return this.toTitleCase(city);
    }

    cleanState(state) {
        if (!state) return null;
        
        const stateAbbreviations = {
            'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
            'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
            'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
            'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
            'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
            'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH',
            'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC',
            'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA',
            'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', 'tennessee': 'TN',
            'texas': 'TX', 'utah': 'UT', 'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA',
            'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
        };
        
        state = state.toString().trim().toLowerCase();
        
        // If it's already a 2-letter abbreviation
        if (state.length === 2) {
            return state.toUpperCase();
        }
        
        // Convert full state name to abbreviation
        return stateAbbreviations[state] || state.toUpperCase();
    }

    cleanZipCode(zipCode) {
        if (!zipCode) return null;
        
        // Extract 5-digit zip code
        const match = zipCode.toString().match(/\d{5}/);
        return match ? match[0] : null;
    }

    cleanYear(year) {
        if (!year) return null;
        
        const yearNum = parseInt(year.toString().match(/\d{4}/)?.[0]);
        
        // Validate year range (Orthodox churches in US started around 1700s)
        if (yearNum >= 1700 && yearNum <= new Date().getFullYear()) {
            return yearNum;
        }
        
        return null;
    }

    cleanClergyName(clergy) {
        if (!clergy) return null;
        
        clergy = clergy.toString().trim();
        
        // Standardize titles
        clergy = clergy.replace(/\bFr\.\s*/g, 'Father ');
        clergy = clergy.replace(/\bRev\.\s*/g, 'Reverend ');
        clergy = clergy.replace(/\bDr\.\s*/g, 'Doctor ');
        
        // Clean up spacing
        clergy = clergy.replace(/\s+/g, ' ').trim();
        
        return this.toTitleCase(clergy);
    }

    cleanEmail(email) {
        if (!email) return null;
        
        // Extract email from text
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
        const match = email.toString().match(emailRegex);
        
        return match ? match[0].toLowerCase() : null;
    }

    cleanPhone(phone) {
        if (!phone) return null;
        
        // Extract digits only
        const digits = phone.toString().replace(/\D/g, '');
        
        // Validate US phone number (10 digits)
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        } else if (digits.length === 11 && digits[0] === '1') {
            // Remove country code
            return this.cleanPhone(digits.slice(1));
        }
        
        return null;
    }

    cleanUrl(url) {
        if (!url) return null;
        
        url = url.toString().trim();
        
        // Add protocol if missing
        if (url && !url.match(/^https?:\/\//)) {
            url = 'https://' + url;
        }
        
        return url;
    }

    // Helper methods
    toTitleCase(str) {
        if (!str) return str;
        
        const exceptions = ['of', 'the', 'and', 'in', 'on', 'at', 'to', 'for', 'with'];
        
        return str.toLowerCase().replace(/\w\S*/g, (txt, index) => {
            if (index !== 0 && exceptions.includes(txt.toLowerCase())) {
                return txt.toLowerCase();
            }
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }

    buildFullAddress(church) {
        const parts = [
            church.address,
            church.city,
            church.state,
            church.zip_code
        ].filter(part => part);
        
        if (parts.length < 2) return null;
        
        // Format: "123 Main St, City, State 12345"
        let fullAddress = parts[0]; // address
        if (parts.length > 1) {
            fullAddress += ', ' + parts.slice(1).join(' ');
        }
        
        return fullAddress;
    }

    normalizeChurchName(name) {
        if (!name) return null;
        
        // Create a normalized version for duplicate detection
        let normalized = name.toLowerCase();
        
        // Remove common words
        normalized = normalized.replace(/\b(orthodox|church|parish|cathedral|chapel|mission|saint|saints|st|holy)\b/g, '');
        
        // Remove special characters and extra spaces
        normalized = normalized.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
        
        return normalized;
    }

    generateSearchKeywords(church) {
        const keywords = [];
        
        if (church.name) keywords.push(...church.name.toLowerCase().split(/\s+/));
        if (church.city) keywords.push(church.city.toLowerCase());
        if (church.state) keywords.push(church.state.toLowerCase());
        if (church.jurisdiction) keywords.push(...church.jurisdiction.toLowerCase().split(/\s+/));
        
        // Remove duplicates and common words
        const commonWords = ['orthodox', 'church', 'parish', 'the', 'of', 'and', 'in'];
        const filtered = [...new Set(keywords)].filter(word => 
            word.length > 2 && !commonWords.includes(word)
        );
        
        return filtered.join(' ');
    }

    isValidChurch(church) {
        // Minimum required fields
        if (!church.name || church.name.length < 3) {
            return false;
        }
        
        if (!church.jurisdiction) {
            return false;
        }
        
        // At least some location information
        if (!church.city && !church.state && !church.address) {
            return false;
        }
        
        return true;
    }

    // Statistics about the cleaning process
    getCleaningStats(originalChurches, cleanedChurches) {
        const stats = {
            total: originalChurches.length,
            cleaned: cleanedChurches.length,
            rejected: originalChurches.length - cleanedChurches.length,
            hasWebsite: cleanedChurches.filter(c => c.website).length,
            hasPhone: cleanedChurches.filter(c => c.contact_phone).length,
            hasEmail: cleanedChurches.filter(c => c.contact_email).length,
            hasFullAddress: cleanedChurches.filter(c => c.full_address).length,
            jurisdictionBreakdown: {}
        };
        
        // Count by jurisdiction
        cleanedChurches.forEach(church => {
            const jurisdiction = church.jurisdiction || 'Unknown';
            stats.jurisdictionBreakdown[jurisdiction] = (stats.jurisdictionBreakdown[jurisdiction] || 0) + 1;
        });
        
        return stats;
    }
}

module.exports = DataCleaner;
