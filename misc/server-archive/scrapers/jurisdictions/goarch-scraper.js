// 📁 server/scrapers/jurisdictions/goarch-scraper.js
// Greek Orthodox Archdiocese of America (GOARCH) scraper

const BaseScraper = require('./base-scraper');

class GOARCHScraper extends BaseScraper {
    constructor(options = {}) {
        super({
            jurisdiction: 'Greek Orthodox Archdiocese of America (GOARCH)',
            baseUrl: 'https://www.goarch.org',
            ...options
        });
        
        this.directoryUrls = [
            'https://www.goarch.org/chapel/locator',
            'https://www.goarch.org/parishes',
            'https://www.goarch.org/directory'
        ];
    }

    async scrapeChurches() {
        const churches = [];
        
        try {
            this.logProgress('Starting GOARCH parish scraping');
            
            // GOARCH has a parish locator that might be interactive
            const locatorData = await this.scrapeParishLocator();
            churches.push(...locatorData);
            
            // Try alternative directory methods
            const directoryData = await this.scrapeDirectoryPages();
            churches.push(...directoryData);
            
            // Scrape by metropolis (regional divisions)
            const metropolisData = await this.scrapeByMetropolis();
            churches.push(...metropolisData);
            
            this.logProgress('GOARCH scraping completed', { 
                totalChurches: churches.length 
            });
            
            return churches;
            
        } catch (error) {
            this.logError('Failed to scrape GOARCH parishes', error);
            return churches;
        }
    }

    async scrapeParishLocator() {
        const churches = [];
        
        try {
            this.logProgress('Scraping GOARCH parish locator');
            
            // The parish locator likely uses JavaScript/AJAX
            const html = await this.fetchWithPuppeteer('https://www.goarch.org/chapel/locator', {
                waitForSelector: '.parish-list, .church-listing, .locator-results',
                script: `
                    // Try to trigger loading of all parishes
                    const loadAllButton = document.querySelector('.load-all, .show-all, .view-all');
                    if (loadAllButton) loadAllButton.click();
                    
                    // Wait for results to load
                    setTimeout(() => {}, 3000);
                `
            });
            
            const $ = this.parseHTML(html);
            
            // Look for parish listing containers
            const parishSelectors = [
                '.parish-item',
                '.church-item',
                '.locator-result',
                '.parish-listing .parish',
                '.church-listing .church',
                '[data-parish]',
                '.listing-item'
            ];
            
            for (const selector of parishSelectors) {
                const parishes = $(selector);
                if (parishes.length > 0) {
                    this.logProgress(`Found ${parishes.length} parishes with selector: ${selector}`);
                    
                    parishes.each((index, element) => {
                        const church = this.extractGOARCHChurch($, element);
                        if (church && church.name) {
                            churches.push(church);
                        }
                    });
                    break;
                }
            }
            
            // If no structured data found, try to extract from any lists
            if (churches.length === 0) {
                churches.push(...this.extractFromGenericLists($));
            }
            
        } catch (error) {
            this.logError('Error scraping GOARCH parish locator', error);
        }
        
        return churches;
    }

    extractGOARCHChurch($, element) {
        const $element = $(element);
        
        const rawData = {
            name: this.extractGOARCHName($, $element),
            address: this.extractGOARCHAddress($, $element),
            city: this.extractGOARCHCity($, $element),
            state: this.extractGOARCHState($, $element),
            zip_code: this.extractGOARCHZip($, $element),
            website: this.extractGOARCHWebsite($, $element),
            clergy_contact: this.extractGOARCHClergy($, $element),
            contact_phone: this.extractGOARCHPhone($, $element),
            contact_email: this.extractGOARCHEmail($, $element),
            source_url: 'https://www.goarch.org/chapel/locator'
        };
        
        if (rawData.name) {
            return this.standardizeChurchData(rawData);
        }
        
        return null;
    }

    extractGOARCHName($, $element) {
        const nameSelectors = [
            '.parish-name',
            '.church-name',
            '.name',
            '.title',
            'h2',
            'h3',
            'h4',
            '.listing-title',
            '[data-name]'
        ];
        
        for (const selector of nameSelectors) {
            const name = $element.find(selector).first().text().trim();
            if (name) {
                // Clean up common Greek Orthodox naming patterns
                return name.replace(/^(Holy|Saint|St\.?|Saints)\s+/i, (match) => match)
                          .replace(/Orthodox Church$|Greek Orthodox Church$/i, '').trim();
            }
        }
        
        // Try data attributes
        const dataName = $element.attr('data-name') || $element.attr('data-parish-name');
        if (dataName) return dataName;
        
        // Extract from element text
        const text = $element.text().trim();
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length > 0) {
            return lines[0];
        }
        
        return null;
    }

    extractGOARCHAddress($, $element) {
        const addressSelectors = [
            '.address',
            '.street-address',
            '.parish-address',
            '.location-address',
            '[data-address]'
        ];
        
        for (const selector of addressSelectors) {
            const address = $element.find(selector).first().text().trim();
            if (address) return address;
        }
        
        // Try data attributes
        const dataAddress = $element.attr('data-address') || $element.attr('data-street');
        if (dataAddress) return dataAddress;
        
        return this.extractAddressFromText($element.text());
    }

    extractGOARCHCity($, $element) {
        const citySelectors = [
            '.city',
            '.locality',
            '.parish-city',
            '[data-city]'
        ];
        
        for (const selector of citySelectors) {
            const city = $element.find(selector).first().text().trim();
            if (city) return city;
        }
        
        // Try data attributes
        const dataCity = $element.attr('data-city');
        if (dataCity) return dataCity;
        
        return this.extractCityFromText($element.text());
    }

    extractGOARCHState($, $element) {
        const stateSelectors = [
            '.state',
            '.region',
            '.parish-state',
            '[data-state]'
        ];
        
        for (const selector of stateSelectors) {
            const state = $element.find(selector).first().text().trim();
            if (state) return state;
        }
        
        // Try data attributes
        const dataState = $element.attr('data-state');
        if (dataState) return dataState;
        
        return this.extractStateFromText($element.text());
    }

    extractGOARCHZip($, $element) {
        const zipSelectors = [
            '.zip',
            '.postal-code',
            '.zip-code',
            '[data-zip]'
        ];
        
        for (const selector of zipSelectors) {
            const zip = $element.find(selector).first().text().trim();
            if (zip) return zip;
        }
        
        // Try data attributes
        const dataZip = $element.attr('data-zip') || $element.attr('data-postal');
        if (dataZip) return dataZip;
        
        return this.extractZipFromText($element.text());
    }

    extractGOARCHWebsite($, $element) {
        const websiteSelectors = [
            'a[href*="http"]:not([href*="goarch.org"])',
            '.website a',
            '.parish-website a',
            '.external-link'
        ];
        
        for (const selector of websiteSelectors) {
            const link = $element.find(selector).first();
            if (link.length > 0) {
                const href = link.attr('href');
                if (href && href.includes('http') && !href.includes('goarch.org')) {
                    return href;
                }
            }
        }
        
        // Try data attributes
        const dataWebsite = $element.attr('data-website') || $element.attr('data-url');
        if (dataWebsite) return dataWebsite;
        
        return null;
    }

    extractGOARCHClergy($, $element) {
        const clergySelectors = [
            '.clergy',
            '.priest',
            '.pastor',
            '.contact-clergy',
            '.parish-priest'
        ];
        
        for (const selector of clergySelectors) {
            const clergy = $element.find(selector).first().text().trim();
            if (clergy) return clergy;
        }
        
        // Look for Greek Orthodox titles
        const text = $element.text();
        const clergyMatch = text.match(/(Father|Fr\.|Rev\.|Protopresbyter|Archimandrite|Deacon)\s+([A-Za-z\s]+)/i);
        
        return clergyMatch ? clergyMatch[0] : null;
    }

    extractGOARCHPhone($, $element) {
        const phoneSelectors = [
            '.phone',
            '.telephone',
            '.contact-phone',
            '.parish-phone'
        ];
        
        for (const selector of phoneSelectors) {
            const phone = $element.find(selector).first().text().trim();
            if (phone) return phone;
        }
        
        return this.extractPhoneFromText($element.text());
    }

    extractGOARCHEmail($, $element) {
        const emailSelectors = [
            'a[href^="mailto:"]',
            '.email',
            '.contact-email',
            '.parish-email'
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
        
        return this.extractEmailFromText($element.text());
    }

    async scrapeDirectoryPages() {
        const churches = [];
        
        for (const url of this.directoryUrls) {
            try {
                await this.delay(this.delayBetweenRequests);
                
                this.logProgress(`Scraping directory page: ${url}`);
                
                const html = await this.fetchHTML(url);
                const $ = this.parseHTML(html);
                
                // Extract churches from this directory page
                const pageChurches = this.extractChurchesFromPage($, url);
                churches.push(...pageChurches);
                
            } catch (error) {
                this.logError(`Error scraping directory page: ${url}`, error);
            }
        }
        
        return churches;
    }

    extractChurchesFromPage($, sourceUrl) {
        const churches = [];
        
        // Look for various listing patterns
        const listingSelectors = [
            '.parish-directory .parish',
            '.church-directory .church',
            '.listing .item',
            'ul li',
            'table tr'
        ];
        
        for (const selector of listingSelectors) {
            const items = $(selector);
            if (items.length > 0) {
                items.each((index, element) => {
                    const church = this.extractGOARCHChurch($, element);
                    if (church && church.name) {
                        church.source_url = sourceUrl;
                        churches.push(church);
                    }
                });
                break;
            }
        }
        
        return churches;
    }

    async scrapeByMetropolis() {
        const churches = [];
        
        try {
            this.logProgress('Scraping GOARCH metropolises');
            
            // GOARCH is organized by metropolises (regions)
            const metropolisUrls = await this.findMetropolisUrls();
            
            for (const url of metropolisUrls) {
                try {
                    await this.delay(this.delayBetweenRequests);
                    
                    const metropolisChurches = await this.scrapeMetropolis(url);
                    churches.push(...metropolisChurches);
                    
                } catch (error) {
                    this.logError(`Error scraping metropolis: ${url}`, error);
                }
            }
            
        } catch (error) {
            this.logError('Error scraping metropolises', error);
        }
        
        return churches;
    }

    async findMetropolisUrls() {
        const urls = [];
        
        try {
            const html = await this.fetchHTML(`${this.baseUrl}/metropolises`);
            const $ = this.parseHTML(html);
            
            // Look for metropolis links
            $('a[href*="metropolis"]').each((index, link) => {
                const href = $(link).attr('href');
                if (href) {
                    const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
                    urls.push(fullUrl);
                }
            });
            
        } catch (error) {
            // Fallback: use known metropolis structure
            const knownMetropolises = [
                'boston', 'chicago', 'denver', 'detroit', 'new-jersey', 
                'pittsburgh', 'san-francisco', 'atlanta'
            ];
            
            for (const metro of knownMetropolises) {
                urls.push(`${this.baseUrl}/metropolis/${metro}`);
                urls.push(`${this.baseUrl}/metropolis/${metro}/parishes`);
            }
        }
        
        return [...new Set(urls)];
    }

    async scrapeMetropolis(url) {
        const churches = [];
        
        try {
            const html = await this.fetchHTML(url);
            const $ = this.parseHTML(html);
            
            // Extract parishes from metropolis page
            const parishElements = $('.parish, .church, .parish-listing').toArray();
            
            for (const element of parishElements) {
                const church = this.extractGOARCHChurch($, element);
                if (church && church.name) {
                    church.source_url = url;
                    churches.push(church);
                }
            }
            
        } catch (error) {
            this.logError(`Error scraping metropolis: ${url}`, error);
        }
        
        return churches;
    }

    extractFromGenericLists($) {
        const churches = [];
        
        // Try to extract from any unstructured lists
        $('ul li, ol li').each((index, item) => {
            const $item = $(item);
            const text = $item.text().trim();
            
            // Look for church-like patterns
            if (text.match(/(Orthodox|Church|Parish|Cathedral|Chapel)/i) && text.length > 10) {
                const church = this.parseChurchFromText(text);
                if (church && church.name) {
                    church.source_url = 'https://www.goarch.org';
                    churches.push(this.standardizeChurchData(church));
                }
            }
        });
        
        return churches;
    }

    parseChurchFromText(text) {
        // Try to extract church information from free text
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length === 0) return null;
        
        const rawData = {
            name: lines[0]
        };
        
        // Extract additional info from subsequent lines
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for address
            if (line.match(/\d+\s+[A-Za-z\s]+(Street|St|Avenue|Ave|Road|Rd)/i)) {
                rawData.address = line;
            }
            
            // Check for city, state, zip
            const locationMatch = line.match(/([A-Za-z\s]+),\s*([A-Z]{2})\s*(\d{5})?/);
            if (locationMatch) {
                rawData.city = locationMatch[1].trim();
                rawData.state = locationMatch[2];
                rawData.zip_code = locationMatch[3];
            }
            
            // Extract contact info
            const contactInfo = this.extractContactInfo(line);
            Object.assign(rawData, contactInfo);
        }
        
        return rawData;
    }

    // Helper methods for text extraction
    extractAddressFromText(text) {
        const addressMatch = text.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln)/i);
        return addressMatch ? addressMatch[0] : null;
    }

    extractCityFromText(text) {
        const cityStateMatch = text.match(/([A-Za-z\s]+),\s*([A-Z]{2})\s*(\d{5})?/);
        return cityStateMatch ? cityStateMatch[1].trim() : null;
    }

    extractStateFromText(text) {
        const stateMatch = text.match(/,\s*([A-Z]{2})\s*\d{5}/);
        return stateMatch ? stateMatch[1] : null;
    }

    extractZipFromText(text) {
        const zipMatch = text.match(/\b\d{5}(-\d{4})?\b/);
        return zipMatch ? zipMatch[0] : null;
    }

    extractPhoneFromText(text) {
        const phoneMatch = text.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);
        return phoneMatch ? phoneMatch[0] : null;
    }

    extractEmailFromText(text) {
        const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        return emailMatch ? emailMatch[0] : null;
    }
}

module.exports = GOARCHScraper;
