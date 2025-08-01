// 📁 server/scrapers/jurisdictions/antiochian-scraper.js
// Antiochian Orthodox Christian Archdiocese scraper

const BaseScraper = require('./base-scraper');

class AntiochianScraper extends BaseScraper {
    constructor(options = {}) {
        super({
            jurisdiction: 'Antiochian Orthodox Christian Archdiocese',
            baseUrl: 'https://www.antiochian.org',
            ...options
        });
    }

    async scrapeChurches() {
        const churches = [];
        
        try {
            this.logProgress('Starting Antiochian parish scraping');
            
            // Try the parish directory
            const directoryChurches = await this.scrapeParishDirectory();
            churches.push(...directoryChurches);
            
            this.logProgress('Antiochian scraping completed', { 
                totalChurches: churches.length 
            });
            
            return churches;
            
        } catch (error) {
            this.logError('Failed to scrape Antiochian parishes', error);
            return churches;
        }
    }

    async scrapeParishDirectory() {
        const churches = [];
        
        try {
            const directoryUrls = [
                'https://www.antiochian.org/parishes',
                'https://www.antiochian.org/directory/parishes',
                'https://www.antiochian.org/parish-directory'
            ];
            
            for (const url of directoryUrls) {
                try {
                    const html = await this.fetchHTML(url);
                    const $ = this.parseHTML(html);
                    
                    $('.parish, .church, .parish-listing, .directory-item').each((index, element) => {
                        const church = this.extractAntiochianChurch($, element);
                        if (church && church.name) {
                            church.source_url = url;
                            churches.push(church);
                        }
                    });
                    
                    if (churches.length > 0) break; // Found data, no need to try other URLs
                    
                } catch (error) {
                    this.logError(`Error scraping ${url}`, error);
                }
            }
            
        } catch (error) {
            this.logError('Error scraping Antiochian directory', error);
        }
        
        return churches;
    }

    extractAntiochianChurch($, element) {
        const $element = $(element);
        
        const rawData = {
            name: $element.find('.name, .parish-name, h3, h4').first().text().trim(),
            address: $element.find('.address, .street-address').first().text().trim(),
            city: $element.find('.city').first().text().trim(),
            state: $element.find('.state').first().text().trim(),
            zip_code: this.extractZipFromText($element.text()),
            website: $element.find('a[href*="http"]:not([href*="antiochian.org"])').first().attr('href'),
            clergy_contact: $element.find('.clergy, .priest').first().text().trim(),
            contact_phone: this.extractPhoneFromText($element.text()),
            contact_email: this.extractEmailFromText($element.text()),
            source_url: 'https://www.antiochian.org'
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

module.exports = AntiochianScraper;
