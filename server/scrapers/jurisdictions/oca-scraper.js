// 📁 server/scrapers/jurisdictions/oca-scraper.js
// Orthodox Church in America (OCA) scraper

const BaseScraper = require('./base-scraper');

class OCAScraper extends BaseScraper {
    constructor(options = {}) {
        super({
            jurisdiction: 'Orthodox Church in America (OCA)',
            baseUrl: 'https://www.oca.org',
            ...options
        });
        
        this.directoryUrls = [
            'https://www.oca.org/parishes/search',
            'https://www.oca.org/parishes/directory'
        ];
    }

    async scrapeChurches() {
        const churches = [];
        
        try {
            this.logProgress('Starting OCA parish scraping');
            
            // Try different approaches to get parish data
            const parishData = await this.scrapeParishDirectory();
            churches.push(...parishData);
            
            // Scrape individual state directories if available
            const stateData = await this.scrapeStateDirectories();
            churches.push(...stateData);
            
            this.logProgress('OCA scraping completed', { 
                totalChurches: churches.length 
            });
            
            return churches;
            
        } catch (error) {
            this.logError('Failed to scrape OCA parishes', error);
            return churches; // Return partial results
        }
    }

    async scrapeParishDirectory() {
        const churches = [];
        
        try {
            this.logProgress('Scraping OCA parish directory');
            
            // The OCA website may require JavaScript rendering
            const html = await this.fetchWithPuppeteer('https://www.oca.org/parishes/search', {
                waitForSelector: '.parish-listing, .parish-search-results, .parish-directory',
                waitUntil: 'networkidle2'
            });
            
            const $ = this.parseHTML(html);
            
            // Look for common parish listing patterns
            const parishSelectors = [
                '.parish-listing .parish-item',
                '.parish-search-results .parish',
                '.parish-directory .parish',
                '.parish-list .parish',
                'tr.parish-row',
                '.church-listing .church'
            ];
            
            for (const selector of parishSelectors) {
                const parishes = $(selector);
                if (parishes.length > 0) {
                    this.logProgress(`Found parishes with selector: ${selector}`, { count: parishes.length });
                    
                    parishes.each((index, element) => {
                        const church = this.extractChurchFromElement($, element);
                        if (church && church.name) {
                            churches.push(church);
                        }
                    });
                    break;
                }
            }
            
            // If no structured listings found, try table-based approach
            if (churches.length === 0) {
                const tableChurches = await this.scrapeParishTables($);
                churches.push(...tableChurches);
            }
            
            this.logProgress(`Extracted ${churches.length} churches from OCA directory`);
            
        } catch (error) {
            this.logError('Error scraping OCA parish directory', error);
        }
        
        return churches;
    }

    extractChurchFromElement($, element) {
        const $element = $(element);
        
        // Use enhanced data extraction from base scraper (Step 2)
        const rawData = this.extractChurchData($, $element);
        
        // Add OCA-specific data points
        rawData.diocese = this.extractOCADiocese($, $element);
        rawData.deanery = this.extractOCADeanery($, $element);
        rawData.services_schedule = this.extractOCAServices($, $element);
        rawData.source_url = 'https://www.oca.org/parishes/search';
        
        // Only return if we have essential data
        if (rawData.name) {
            return this.standardizeChurchData(rawData);
        }
        
        return null;
    }

    // OCA-specific extraction methods
    extractOCADiocese($, $element) {
        const text = $element.text();
        
        // Common OCA diocese patterns
        const diocesePatterns = [
            /Diocese of ([^,\n.]+)/i,
            /Archdiocese of ([^,\n.]+)/i,
            /(Eastern Diocese)/i,
            /(Western Diocese)/i,
            /(Midwest Diocese)/i,
            /(Southern Diocese)/i
        ];
        
        for (const pattern of diocesePatterns) {
            const match = text.match(pattern);
            if (match) return match[1].trim();
        }
        
        return null;
    }

    extractOCADeanery($, $element) {
        const text = $element.text();
        const deaneryMatch = text.match(/deanery[:\s]+([^,\n.]+)/i);
        return deaneryMatch ? deaneryMatch[1].trim() : null;
    }

    extractOCAServices($, $element) {
        const serviceSelectors = [
            ':contains("Divine Liturgy")',
            ':contains("Vespers")',
            ':contains("Matins")',
            '.service-times',
            '.schedule'
        ];
        
        for (const selector of serviceSelectors) {
            const text = $element.find(selector).text().trim();
            if (text && (text.includes('AM') || text.includes('PM'))) {
                return text;
            }
        }
        
        return null;
    }

    extractChurchName($, $element) {
        const nameSelectors = [
            '.parish-name',
            '.church-name',
            'h3',
            'h4',
            '.title',
            'strong',
            '.name'
        ];
        
        for (const selector of nameSelectors) {
            const name = $element.find(selector).first().text().trim();
            if (name) return name;
        }
        
        // Try direct text extraction
        const text = $element.text().trim();
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length > 0) {
            return lines[0];
        }
        
        return null;
    }

    extractAddress($, $element) {
        const addressSelectors = [
            '.address',
            '.parish-address',
            '.street-address',
            '.location'
        ];
        
        for (const selector of addressSelectors) {
            const address = $element.find(selector).first().text().trim();
            if (address) return address;
        }
        
        // Try to find address pattern in text
        const text = $element.text();
        const addressMatch = text.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln)/i);
        
        return addressMatch ? addressMatch[0] : null;
    }

    extractCity($, $element) {
        const citySelectors = [
            '.city',
            '.parish-city',
            '.locality'
        ];
        
        for (const selector of citySelectors) {
            const city = $element.find(selector).first().text().trim();
            if (city) return city;
        }
        
        // Try to extract from address line
        const text = $element.text();
        const addressLines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        for (const line of addressLines) {
            const cityStateMatch = line.match(/([A-Za-z\s]+),\s*([A-Z]{2})\s*(\d{5})?/);
            if (cityStateMatch) {
                return cityStateMatch[1].trim();
            }
        }
        
        return null;
    }

    extractState($, $element) {
        const stateSelectors = [
            '.state',
            '.parish-state',
            '.region'
        ];
        
        for (const selector of stateSelectors) {
            const state = $element.find(selector).first().text().trim();
            if (state) return state;
        }
        
        // Try to extract from address line
        const text = $element.text();
        const stateMatch = text.match(/,\s*([A-Z]{2})\s*\d{5}/);
        
        return stateMatch ? stateMatch[1] : null;
    }

    extractZipCode($, $element) {
        const text = $element.text();
        const zipMatch = text.match(/\b\d{5}(-\d{4})?\b/);
        
        return zipMatch ? zipMatch[0] : null;
    }

    extractWebsite($, $element) {
        const websiteSelectors = [
            'a[href*="http"]',
            '.website',
            '.parish-website',
            '.url'
        ];
        
        for (const selector of websiteSelectors) {
            const link = $element.find(selector).first();
            if (link.length > 0) {
                const href = link.attr('href');
                if (href && href.includes('http')) {
                    return href;
                }
            }
        }
        
        // Try to find URL in text
        const text = $element.text();
        const urlMatch = text.match(/https?:\/\/[^\s]+/);
        
        return urlMatch ? urlMatch[0] : null;
    }

    extractClergy($, $element) {
        const clergySelectors = [
            '.clergy',
            '.pastor',
            '.priest',
            '.rector',
            '.contact-person'
        ];
        
        for (const selector of clergySelectors) {
            const clergy = $element.find(selector).first().text().trim();
            if (clergy) return clergy;
        }
        
        // Look for titles in text
        const text = $element.text();
        const clergyMatch = text.match(/(Father|Fr\.|Rev\.|Priest|Pastor)\s+([A-Za-z\s]+)/i);
        
        return clergyMatch ? clergyMatch[0] : null;
    }

    extractPhone($, $element) {
        const text = $element.text();
        const phoneMatch = text.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);
        
        return phoneMatch ? phoneMatch[0] : null;
    }

    extractEmail($, $element) {
        const emailSelectors = [
            'a[href^="mailto:"]',
            '.email',
            '.contact-email'
        ];
        
        for (const selector of emailSelectors) {
            const emailElement = $element.find(selector).first();
            if (emailElement.length > 0) {
                const href = emailElement.attr('href');
                if (href && href.startsWith('mailto:')) {
                    return href.replace('mailto:', '');
                }
                const text = emailElement.text().trim();
                if (text.includes('@')) return text;
            }
        }
        
        // Look for email in text
        const text = $element.text();
        const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        
        return emailMatch ? emailMatch[0] : null;
    }

    async scrapeParishTables($) {
        const churches = [];
        
        // Look for table-based data
        $('table').each((index, table) => {
            const $table = $(table);
            
            $table.find('tr').each((rowIndex, row) => {
                if (rowIndex === 0) return; // Skip header row
                
                const $row = $(row);
                const cells = $row.find('td, th');
                
                if (cells.length >= 2) {
                    const church = this.extractChurchFromTableRow($, $row, cells);
                    if (church && church.name) {
                        churches.push(church);
                    }
                }
            });
        });
        
        return churches;
    }

    extractChurchFromTableRow($, $row, cells) {
        const cellTexts = cells.map((i, cell) => $(cell).text().trim()).get();
        
        // Try to identify which columns contain which data
        const rawData = {
            name: cellTexts[0], // Usually first column
            source_url: 'https://www.oca.org/parishes/search'
        };
        
        // Try to extract location from subsequent columns
        for (let i = 1; i < cellTexts.length; i++) {
            const text = cellTexts[i];
            
            // Check if this cell contains address/location info
            const locationInfo = this.extractLocationFromText(text);
            Object.assign(rawData, locationInfo);
            
            // Check for contact info
            const contactInfo = this.extractContactInfo(text);
            Object.assign(rawData, contactInfo);
        }
        
        return this.standardizeChurchData(rawData);
    }

    async scrapeStateDirectories() {
        const churches = [];
        
        try {
            // OCA often organizes parishes by diocese/state
            const stateUrls = await this.findStateDirectoryUrls();
            
            for (const url of stateUrls) {
                await this.delay(this.delayBetweenRequests);
                
                try {
                    const stateChurches = await this.scrapeStateDirectory(url);
                    churches.push(...stateChurches);
                } catch (error) {
                    this.logError(`Error scraping state directory: ${url}`, error);
                }
            }
            
        } catch (error) {
            this.logError('Error scraping state directories', error);
        }
        
        return churches;
    }

    async findStateDirectoryUrls() {
        const urls = [];
        
        try {
            const html = await this.fetchHTML(this.baseUrl);
            const $ = this.parseHTML(html);
            
            // Look for links to diocesan or state directories
            $('a[href*="diocese"], a[href*="state"], a[href*="parish"]').each((index, link) => {
                const href = $(link).attr('href');
                if (href) {
                    const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
                    urls.push(fullUrl);
                }
            });
            
        } catch (error) {
            this.logError('Error finding state directory URLs', error);
        }
        
        return [...new Set(urls)]; // Remove duplicates
    }

    async scrapeStateDirectory(url) {
        const churches = [];
        
        try {
            const html = await this.fetchHTML(url);
            const $ = this.parseHTML(html);
            
            // Apply similar extraction logic as main directory
            const parishElements = $('.parish, .church, .listing').toArray();
            
            for (const element of parishElements) {
                const church = this.extractChurchFromElement($, element);
                if (church && church.name) {
                    church.source_url = url;
                    churches.push(church);
                }
            }
            
        } catch (error) {
            this.logError(`Error scraping state directory: ${url}`, error);
        }
        
        return churches;
    }
}

module.exports = OCAScraper;
