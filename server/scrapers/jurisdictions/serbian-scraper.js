// 📁 server/scrapers/jurisdictions/serbian-scraper.js
// Serbian Orthodox Church scraper

const BaseScraper = require('./base-scraper');

class SerbianScraper extends BaseScraper {
    constructor(options = {}) {
        super({
            jurisdiction: 'Serbian Orthodox Church',
            baseUrl: 'https://www.serbianorthodoxchurch.org',
            ...options
        });
    }

    async scrapeChurches() {
        const churches = [];
        
        try {
            this.logProgress('Starting Serbian Orthodox parish scraping');
            
            const directoryChurches = await this.scrapeParishDirectory();
            churches.push(...directoryChurches);
            
            this.logProgress('Serbian Orthodox scraping completed', { 
                totalChurches: churches.length 
            });
            
            return churches;
            
        } catch (error) {
            this.logError('Failed to scrape Serbian Orthodox parishes', error);
            return churches;
        }
    }

    async scrapeParishDirectory() {
        const churches = [];
        
        try {
            const directoryUrls = [
                'https://www.serbianorthodoxchurch.org/parishes',
                'https://www.serbianorthodoxchurch.org/directory',
                'https://www.eastwestorthodox.org/serbian-churches', // Alternative source
                'https://www.serbianorthodoxdioceseofeasternamerica.org/parishes'
            ];
            
            for (const url of directoryUrls) {
                try {
                    const html = await this.fetchHTML(url);
                    const $ = this.parseHTML(html);
                    
                    $('.parish, .church, .parish-listing, .directory-item').each((index, element) => {
                        const church = this.extractSerbianChurch($, element);
                        if (church && church.name) {
                            church.source_url = url;
                            churches.push(church);
                        }
                    });
                    
                    if (churches.length > 0) break;
                    
                } catch (error) {
                    this.logError(`Error scraping ${url}`, error);
                }
            }
            
        } catch (error) {
            this.logError('Error scraping Serbian Orthodox directory', error);
        }
        
        return churches;
    }

    extractSerbianChurch($, element) {
        const $element = $(element);
        
        const rawData = {
            name: $element.find('.name, .parish-name, h3, h4').first().text().trim(),
            address: $element.find('.address, .street-address').first().text().trim(),
            city: $element.find('.city').first().text().trim(),
            state: $element.find('.state').first().text().trim(),
            zip_code: this.extractZipFromText($element.text()),
            website: $element.find('a[href*="http"]:not([href*="serbianorthodoxchurch.org"])').first().attr('href'),
            clergy_contact: $element.find('.clergy, .priest').first().text().trim(),
            contact_phone: this.extractPhoneFromText($element.text()),
            contact_email: this.extractEmailFromText($element.text()),
            source_url: 'https://www.serbianorthodoxchurch.org'
        };
        
        if (rawData.name) {
            return this.standardizeChurchData(rawData);
        }
        
        return null;
    }

    extractPhoneFromText(text) {
        const phoneMatch = text.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);
        return phoneMatch ? phoneMatch[0] : null;
    }

    extractEmailFromText(text) {
        const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        return emailMatch ? emailMatch[0] : null;
    }

    extractZipFromText(text) {
        const zipMatch = text.match(/\b\d{5}(-\d{4})?\b/);
        return zipMatch ? zipMatch[0] : null;
    }
}

module.exports = SerbianScraper;
