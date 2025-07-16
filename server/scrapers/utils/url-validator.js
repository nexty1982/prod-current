// 📁 server/scrapers/utils/url-validator.js
// URL validation utility for church websites

const axios = require('axios');

class URLValidator {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.timeout = options.timeout || 10000;
        this.maxRedirects = options.maxRedirects || 5;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        
        this.axiosInstance = axios.create({
            timeout: this.timeout,
            maxRedirects: this.maxRedirects,
            headers: {
                'User-Agent': this.userAgent
            },
            validateStatus: function (status) {
                return status >= 200 && status < 400; // Accept 2xx and 3xx status codes
            }
        });
    }

    async validateUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        try {
            // Clean and normalize the URL
            const cleanUrl = this.cleanUrl(url);
            if (!cleanUrl) {
                return false;
            }

            // Make a HEAD request first (faster than GET)
            try {
                const response = await this.axiosInstance.head(cleanUrl);
                return this.isValidResponse(response);
            } catch (headError) {
                // If HEAD fails, try GET request
                try {
                    const response = await this.axiosInstance.get(cleanUrl);
                    return this.isValidResponse(response);
                } catch (getError) {
                    this.logger.debug(`URL validation failed for ${cleanUrl}`, {
                        headError: headError.message,
                        getError: getError.message
                    });
                    return false;
                }
            }
        } catch (error) {
            this.logger.debug(`URL validation error for ${url}`, { error: error.message });
            return false;
        }
    }

    cleanUrl(url) {
        try {
            // Remove whitespace
            url = url.trim();
            
            // Add protocol if missing
            if (!url.match(/^https?:\/\//)) {
                url = 'https://' + url;
            }
            
            // Remove trailing slash
            url = url.replace(/\/$/, '');
            
            // Basic URL validation
            const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
            
            if (!urlPattern.test(url)) {
                return null;
            }
            
            return url;
        } catch (error) {
            return null;
        }
    }

    isValidResponse(response) {
        // Check if response indicates a valid website
        const status = response.status;
        const contentType = response.headers['content-type'] || '';
        
        // Accept successful HTTP status codes
        if (status >= 200 && status < 300) {
            return true;
        }
        
        // Accept redirects as valid (the site exists)
        if (status >= 300 && status < 400) {
            return true;
        }
        
        return false;
    }

    async validateUrls(urls, concurrency = 10) {
        const results = [];
        
        for (let i = 0; i < urls.length; i += concurrency) {
            const batch = urls.slice(i, i + concurrency);
            
            const batchPromises = batch.map(async (url) => {
                const isValid = await this.validateUrl(url);
                return { url, isValid };
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }
        
        return results;
    }

    async validateUrlWithDetails(url) {
        const result = {
            url: url,
            isValid: false,
            status: null,
            redirectUrl: null,
            error: null,
            responseTime: null
        };

        const startTime = Date.now();

        try {
            const cleanUrl = this.cleanUrl(url);
            if (!cleanUrl) {
                result.error = 'Invalid URL format';
                return result;
            }

            const response = await this.axiosInstance.get(cleanUrl);
            
            result.isValid = this.isValidResponse(response);
            result.status = response.status;
            result.responseTime = Date.now() - startTime;
            
            // Check if there was a redirect
            if (response.request.res.responseUrl !== cleanUrl) {
                result.redirectUrl = response.request.res.responseUrl;
            }
            
        } catch (error) {
            result.error = error.message;
            result.responseTime = Date.now() - startTime;
            
            if (error.response) {
                result.status = error.response.status;
            }
        }

        return result;
    }

    // Batch validation with detailed results
    async validateUrlsBatch(urls, options = {}) {
        const concurrency = options.concurrency || 10;
        const includeDetails = options.includeDetails || false;
        
        const results = [];
        
        for (let i = 0; i < urls.length; i += concurrency) {
            const batch = urls.slice(i, i + concurrency);
            
            const batchPromises = batch.map(async (url) => {
                if (includeDetails) {
                    return await this.validateUrlWithDetails(url);
                } else {
                    const isValid = await this.validateUrl(url);
                    return { url, isValid };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Small delay between batches to be respectful
            if (i + concurrency < urls.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }

    // Check if a domain is likely to be a church website
    isLikelyChurchDomain(url) {
        if (!url) return false;
        
        const lowerUrl = url.toLowerCase();
        
        const churchKeywords = [
            'orthodox', 'church', 'parish', 'cathedral', 'chapel', 
            'saint', 'holy', 'monastery', 'convent', 'diocese',
            'oca', 'goarch', 'antiochian', 'rocor', 'serbian',
            'romanian', 'bulgarian', 'coptic', 'russian', 'greek'
        ];
        
        return churchKeywords.some(keyword => lowerUrl.includes(keyword));
    }

    // Extract domain from URL
    extractDomain(url) {
        try {
            const urlObj = new URL(this.cleanUrl(url));
            return urlObj.hostname;
        } catch (error) {
            return null;
        }
    }

    // Check if URL is accessible and returns HTML content
    async isHtmlContent(url) {
        try {
            const response = await this.axiosInstance.head(this.cleanUrl(url));
            const contentType = response.headers['content-type'] || '';
            
            return contentType.includes('text/html');
        } catch (error) {
            return false;
        }
    }
}

module.exports = URLValidator;
