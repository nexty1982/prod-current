// 📁 server/scrapers/jurisdictions/base-scraper.js
// Base class for jurisdiction-specific scrapers

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

class BaseScraper {
    constructor(options = {}) {
        this.jurisdiction = options.jurisdiction || 'Unknown';
        this.logger = options.logger || console;
        this.baseUrl = options.baseUrl;
        this.userAgent = options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        this.timeout = options.timeout || 30000;
        this.retryAttempts = options.retryAttempts || 3;
        this.delayBetweenRequests = options.delayBetweenRequests || 1000;
        
        this.axiosInstance = axios.create({
            timeout: this.timeout,
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
    }

    /**
     * Main method to scrape churches for this jurisdiction
     * Should be implemented by each jurisdiction-specific scraper
     */
    async scrapeChurches() {
        throw new Error(`scrapeChurches() must be implemented by ${this.jurisdiction} scraper`);
    }

    /**
     * Fetch HTML content from a URL with retries
     */
    async fetchHTML(url) {
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                this.logger.debug(`Fetching ${url} (attempt ${attempt}/${this.retryAttempts})`);
                
                const response = await this.axiosInstance.get(url);
                return response.data;
                
            } catch (error) {
                this.logger.warn(`Failed to fetch ${url} (attempt ${attempt}/${this.retryAttempts})`, {
                    error: error.message
                });
                
                if (attempt === this.retryAttempts) {
                    throw new Error(`Failed to fetch ${url} after ${this.retryAttempts} attempts: ${error.message}`);
                }
                
                // Wait before retry
                await this.delay(this.delayBetweenRequests * attempt);
            }
        }
    }

    /**
     * Fetch content using Puppeteer for JavaScript-heavy sites
     */
    async fetchWithPuppeteer(url, options = {}) {
        let browser = null;
        let page = null;

        try {
            this.logger.debug(`Launching Puppeteer for ${url}`);
            
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            page = await browser.newPage();
            
            // Set user agent and viewport
            await page.setUserAgent(this.userAgent);
            await page.setViewport({ width: 1920, height: 1080 });
            
            // Navigate to page
            await page.goto(url, {
                waitUntil: options.waitUntil || 'networkidle2',
                timeout: this.timeout
            });
            
            // Wait for specific selector if provided
            if (options.waitForSelector) {
                await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
            }
            
            // Execute custom script if provided
            if (options.script) {
                await page.evaluate(options.script);
            }
            
            // Get page content
            const content = await page.content();
            
            return content;
            
        } catch (error) {
            this.logger.error(`Puppeteer error for ${url}`, { error: error.message });
            throw error;
        } finally {
            if (page) await page.close();
            if (browser) await browser.close();
        }
    }

    /**
     * Parse HTML and extract church data
     */
    parseHTML(html) {
        return cheerio.load(html);
    }

    /**
     * Clean and standardize church data - Enhanced for Step 2: Comprehensive Data Points
     */
    standardizeChurchData(rawData) {
        return {
            // Required core data points
            name: this.cleanText(rawData.name),
            jurisdiction: this.jurisdiction,
            
            // Website and contact information
            website: this.cleanUrl(rawData.website),
            contact_email: this.cleanEmail(rawData.contact_email),
            contact_phone: this.cleanPhone(rawData.contact_phone),
            
            // Physical address (required)
            address: this.cleanText(rawData.address),
            city: this.cleanText(rawData.city),
            state: this.cleanState(rawData.state),
            zip_code: this.cleanZipCode(rawData.zip_code),
            
            // Enhanced data points for comprehensive directory
            establishment_year: this.cleanYear(rawData.establishment_year),
            clergy_contact: this.cleanText(rawData.clergy_contact),
            parish_priest: this.cleanText(rawData.parish_priest),
            dean: this.cleanText(rawData.dean),
            
            // Additional church metadata
            parish_size: this.cleanText(rawData.parish_size),
            services_schedule: this.cleanText(rawData.services_schedule),
            languages: this.cleanLanguages(rawData.languages),
            feast_day: this.cleanText(rawData.feast_day),
            patron_saint: this.cleanText(rawData.patron_saint),
            
            // Diocesan information
            diocese: this.cleanText(rawData.diocese),
            deanery: this.cleanText(rawData.deanery),
            
            // Social media and additional contacts
            facebook_url: this.cleanUrl(rawData.facebook_url),
            instagram_url: this.cleanUrl(rawData.instagram_url),
            youtube_url: this.cleanUrl(rawData.youtube_url),
            
            // Data quality and source tracking
            source_url: rawData.source_url,
            data_quality_score: this.calculateDataQualityScore(rawData),
            last_updated: new Date(),
            scraper_version: '2.0.0'
        };
    }

    /**
     * Utility methods for data cleaning
     */
    cleanText(text) {
        if (!text) return null;
        return text.toString().trim().replace(/\s+/g, ' ').replace(/\n/g, ' ');
    }

    cleanUrl(url) {
        if (!url) return null;
        
        url = url.trim();
        
        // Add protocol if missing
        if (url && !url.match(/^https?:\/\//)) {
            url = 'https://' + url;
        }
        
        // Remove trailing slash
        return url.replace(/\/$/, '');
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
        
        state = state.trim().toLowerCase();
        
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

    cleanEmail(email) {
        if (!email) return null;
        
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
        const match = email.match(emailRegex);
        
        return match ? match[0].toLowerCase() : null;
    }

    cleanPhone(phone) {
        if (!phone) return null;
        
        // Extract digits only
        const digits = phone.replace(/\D/g, '');
        
        // Validate US phone number (10 digits)
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        } else if (digits.length === 11 && digits[0] === '1') {
            // Remove country code
            return this.cleanPhone(digits.slice(1));
        }
        
        return null;
    }

    /**
     * Extract location information from text
     */
    extractLocationFromText(text) {
        if (!text) return {};
        
        const location = {};
        
        // Try to extract zip code
        const zipMatch = text.match(/\b\d{5}(-\d{4})?\b/);
        if (zipMatch) {
            location.zip_code = zipMatch[0];
        }
        
        // Try to extract state
        const stateMatch = text.match(/\b[A-Z]{2}\b/);
        if (stateMatch) {
            location.state = stateMatch[0];
        }
        
        return location;
    }

    /**
     * Delay utility for rate limiting
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Extract contact information from text
     */
    extractContactInfo(text) {
        if (!text) return {};
        
        const contact = {};
        
        // Extract email
        const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        if (emailMatch) {
            contact.contact_email = emailMatch[0];
        }
        
        // Extract phone
        const phoneMatch = text.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);
        if (phoneMatch) {
            contact.contact_phone = phoneMatch[0];
        }
        
        return contact;
    }

    /**
     * Log scraper progress
     */
    logProgress(message, data = {}) {
        this.logger.info(`[${this.jurisdiction}] ${message}`, data);
    }

    logError(message, error) {
        this.logger.error(`[${this.jurisdiction}] ${message}`, { error: error.message });
    }

    /**
     * Enhanced data cleaning methods for Step 2: Comprehensive Data Points
     */
    cleanLanguages(languages) {
        if (!languages) return null;
        
        if (Array.isArray(languages)) {
            return languages.map(lang => this.cleanText(lang)).filter(Boolean).join(', ');
        }
        
        return this.cleanText(languages);
    }

    calculateDataQualityScore(rawData) {
        let score = 0;
        const weights = {
            name: 20,           // Required
            jurisdiction: 20,   // Required
            address: 15,        // High importance
            website: 10,        // Good to have
            contact_email: 10,  // Good to have
            contact_phone: 10,  // Good to have
            clergy_contact: 5,  // Nice to have
            establishment_year: 5, // Nice to have
            services_schedule: 3,  // Additional detail
            languages: 2        // Additional detail
        };

        for (const [field, weight] of Object.entries(weights)) {
            if (rawData[field] && this.cleanText(rawData[field])) {
                score += weight;
            }
        }

        return Math.min(100, score); // Cap at 100
    }

    /**
     * Extract comprehensive church data from HTML content
     */
    extractChurchData($, element) {
        const data = {};
        
        // Try multiple strategies to extract data
        data.name = this.extractChurchName($, element);
        data.address = this.extractAddress($, element);
        data.website = this.extractWebsite($, element);
        data.contact_email = this.extractEmail($, element);
        data.contact_phone = this.extractPhone($, element);
        data.clergy_contact = this.extractClergy($, element);
        data.establishment_year = this.extractEstablishmentYear($, element);
        data.services_schedule = this.extractServices($, element);
        data.languages = this.extractLanguages($, element);
        data.parish_priest = this.extractParishPriest($, element);
        data.diocese = this.extractDiocese($, element);
        data.patron_saint = this.extractPatronSaint($, element);
        
        return data;
    }

    extractChurchName($, element) {
        const selectors = [
            'h1', 'h2', 'h3', '.church-name', '.parish-name', '.name',
            '[class*="name"]', '[class*="title"]', '.title', 'strong'
        ];
        
        for (const selector of selectors) {
            const text = $(element).find(selector).first().text().trim();
            if (text && text.length > 3 && text.length < 200) {
                return text;
            }
        }
        
        return null;
    }

    extractAddress($, element) {
        const selectors = [
            '.address', '.location', '[class*="address"]', '[class*="location"]',
            'p:contains("Address")', 'div:contains("Address")', '.contact-info'
        ];
        
        for (const selector of selectors) {
            const text = $(element).find(selector).text().trim();
            if (text && /\d/.test(text) && /[A-Za-z]{2,}/.test(text)) {
                return text;
            }
        }
        
        return null;
    }

    extractWebsite($, element) {
        const links = $(element).find('a[href^="http"], a[href^="www"]');
        
        for (let i = 0; i < links.length; i++) {
            const href = $(links[i]).attr('href');
            if (href && !href.includes('facebook') && !href.includes('instagram') && 
                !href.includes('youtube') && !href.includes('twitter')) {
                return href;
            }
        }
        
        return null;
    }

    extractEmail($, element) {
        const text = $(element).text();
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        return emailMatch ? emailMatch[0] : null;
    }

    extractPhone($, element) {
        const text = $(element).text();
        const phoneMatch = text.match(/\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/);
        return phoneMatch ? phoneMatch[0] : null;
    }

    extractClergy($, element) {
        const selectors = [
            ':contains("Father")', ':contains("Fr.")', ':contains("Priest")',
            ':contains("Pastor")', ':contains("Rector")', '.clergy', '.priest'
        ];
        
        for (const selector of selectors) {
            const text = $(element).find(selector).text().trim();
            if (text && text.includes('Father') || text.includes('Fr.')) {
                return text;
            }
        }
        
        return null;
    }

    extractEstablishmentYear($, element) {
        const text = $(element).text();
        const yearMatch = text.match(/(?:established|founded|built).*?(\d{4})/i) || 
                         text.match(/(\d{4}).*?(?:established|founded|built)/i) ||
                         text.match(/\b(19\d{2}|20\d{2})\b/);
        
        if (yearMatch) {
            const year = parseInt(yearMatch[1]);
            if (year >= 1600 && year <= new Date().getFullYear()) {
                return year;
            }
        }
        
        return null;
    }

    extractServices($, element) {
        const selectors = [
            ':contains("Service")', ':contains("Liturgy")', ':contains("Vespers")',
            '.services', '.schedule', '.service-times'
        ];
        
        for (const selector of selectors) {
            const text = $(element).find(selector).text().trim();
            if (text && (text.includes('AM') || text.includes('PM') || text.includes(':'))) {
                return text;
            }
        }
        
        return null;
    }

    extractLanguages($, element) {
        const text = $(element).text();
        const languages = [];
        
        const languagePatterns = [
            /English/i, /Greek/i, /Russian/i, /Serbian/i, /Romanian/i, 
            /Bulgarian/i, /Arabic/i, /Church Slavonic/i, /Slavonic/i
        ];
        
        for (const pattern of languagePatterns) {
            if (pattern.test(text)) {
                languages.push(text.match(pattern)[0]);
            }
        }
        
        return languages.length > 0 ? languages.join(', ') : null;
    }

    extractParishPriest($, element) {
        return this.extractClergy($, element); // Use same logic for now
    }

    extractDiocese($, element) {
        const text = $(element).text();
        const dioceseMatch = text.match(/diocese of ([^,\n.]+)/i) || 
                           text.match(/([^,\n.]+ diocese)/i);
        
        return dioceseMatch ? dioceseMatch[1].trim() : null;
    }

    extractPatronSaint($, element) {
        const text = $(element).text();
        const saintMatch = text.match(/(?:saint|st\.)\s+([^,\n.]+)/i);
        
        return saintMatch ? `Saint ${saintMatch[1].trim()}` : null;
    }
}

module.exports = BaseScraper;
