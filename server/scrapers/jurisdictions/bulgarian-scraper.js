// 📁 server/scrapers/jurisdictions/bulgarian-scraper.js
// Bulgarian Orthodox Church scraper

const BaseScraper = require('./base-scraper');

class BulgarianScraper extends BaseScraper {
    constructor(options = {}) {
        super({
            jurisdiction: 'Bulgarian Orthodox Church',
            baseUrl: 'https://www.bgorthodox.com',
            ...options
        });
    }

    async scrapeChurches() {
        const churches = [];
        
        try {
            this.logProgress('Starting Bulgarian Orthodox parish scraping');
            
            const directoryChurches = await this.scrapeParishDirectory();
            churches.push(...directoryChurches);
            
            this.logProgress('Bulgarian Orthodox scraping completed', { 
                totalChurches: churches.length 
            });
            
            return churches;
            
        } catch (error) {
            this.logError('Failed to scrape Bulgarian Orthodox parishes', error);
            return churches;
        }
    }

    async scrapeParishDirectory() {
        const churches = [];
        
        try {
            const directoryUrls = [
                'https://www.bgorthodox.com/parishes',
                'https://www.bgorthodox.com/directory',
                'https://www.bulgarianorthodoxchurch.org/parishes',
                'https://www.eastwestorthodox.org/bulgarian-churches' // Alternative source
            ];
            
            for (const url of directoryUrls) {
                try {
                    const html = await this.fetchHTML(url);
                    const $ = this.parseHTML(html);
                    
                    $('.parish, .church, .parish-listing, .directory-item').each((index, element) => {
                        const church = this.extractBulgarianChurch($, element);
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
            this.logError('Error scraping Bulgarian Orthodox directory', error);
        }
        
        return churches;
    }

    extractBulgarianChurch($, element) {
        const $element = $(element);
        
        const rawData = {
            name: $element.find('.name, .parish-name, h3, h4').first().text().trim(),
            address: $element.find('.address, .street-address').first().text().trim(),
            city: $element.find('.city').first().text().trim(),
            state: $element.find('.state').first().text().trim(),
            zip_code: this.extractZipFromText($element.text()),
            website: $element.find('a[href*="http"]:not([href*="bgorthodox.com"])').first().attr('href'),
            clergy_contact: $element.find('.clergy, .priest').first().text().trim(),
            contact_phone: this.extractPhoneFromText($element.text()),
            contact_email: this.extractEmailFromText($element.text()),
            source_url: 'https://www.bgorthodox.com'
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

module.exports = BulgarianScraper;
