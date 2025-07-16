// 📁 server/scrapers/utils/duplicate-detector.js
// Duplicate detection and resolution utility

class DuplicateDetector {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.similarityThreshold = options.similarityThreshold || 0.8;
        this.addressSimilarityThreshold = options.addressSimilarityThreshold || 0.7;
    }

    async findDuplicates(churches) {
        this.logger.info('Starting duplicate detection', { totalChurches: churches.length });
        
        const duplicateGroups = [];
        const processed = new Set();
        
        for (let i = 0; i < churches.length; i++) {
            if (processed.has(i)) continue;
            
            const church1 = churches[i];
            const duplicates = [church1];
            
            for (let j = i + 1; j < churches.length; j++) {
                if (processed.has(j)) continue;
                
                const church2 = churches[j];
                
                if (this.areChurchesDuplicates(church1, church2)) {
                    duplicates.push(church2);
                    processed.add(j);
                }
            }
            
            if (duplicates.length > 1) {
                duplicateGroups.push(duplicates);
                this.logger.info('Found duplicate group', {
                    size: duplicates.length,
                    churches: duplicates.map(c => c.name)
                });
            }
            
            processed.add(i);
        }
        
        this.logger.info('Duplicate detection completed', {
            totalGroups: duplicateGroups.length,
            totalDuplicates: duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0)
        });
        
        return duplicateGroups;
    }

    areChurchesDuplicates(church1, church2) {
        // Multiple criteria for duplicate detection
        
        // 1. Exact name match (after normalization)
        if (this.normalizeForComparison(church1.name) === this.normalizeForComparison(church2.name)) {
            return true;
        }
        
        // 2. Very similar names and same location
        const nameSimilarity = this.calculateStringSimilarity(
            this.normalizeForComparison(church1.name),
            this.normalizeForComparison(church2.name)
        );
        
        if (nameSimilarity > this.similarityThreshold) {
            // Check if they're in the same location
            if (this.areInSameLocation(church1, church2)) {
                return true;
            }
        }
        
        // 3. Same website (strong indicator)
        if (church1.website && church2.website && 
            this.normalizeUrl(church1.website) === this.normalizeUrl(church2.website)) {
            return true;
        }
        
        // 4. Same phone number (strong indicator)
        if (church1.contact_phone && church2.contact_phone &&
            this.normalizePhone(church1.contact_phone) === this.normalizePhone(church2.contact_phone)) {
            return true;
        }
        
        // 5. Same email (strong indicator)
        if (church1.contact_email && church2.contact_email &&
            church1.contact_email.toLowerCase() === church2.contact_email.toLowerCase()) {
            return true;
        }
        
        // 6. Very similar addresses
        if (church1.address && church2.address) {
            const addressSimilarity = this.calculateStringSimilarity(
                this.normalizeAddress(church1.address),
                this.normalizeAddress(church2.address)
            );
            
            if (addressSimilarity > this.addressSimilarityThreshold &&
                this.areInSameCity(church1, church2)) {
                return true;
            }
        }
        
        return false;
    }

    areInSameLocation(church1, church2) {
        // Check city and state
        const city1 = this.normalizeForComparison(church1.city);
        const city2 = this.normalizeForComparison(church2.city);
        const state1 = church1.state?.toUpperCase();
        const state2 = church2.state?.toUpperCase();
        
        if (city1 && city2 && state1 && state2) {
            return city1 === city2 && state1 === state2;
        }
        
        // Check zip codes
        if (church1.zip_code && church2.zip_code) {
            return church1.zip_code === church2.zip_code;
        }
        
        return false;
    }

    areInSameCity(church1, church2) {
        const city1 = this.normalizeForComparison(church1.city);
        const city2 = this.normalizeForComparison(church2.city);
        
        return city1 && city2 && city1 === city2;
    }

    normalizeForComparison(str) {
        if (!str) return '';
        
        return str.toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .replace(/\b(orthodox|church|parish|cathedral|chapel|mission|saint|saints|st|holy)\b/g, '') // Remove common words
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    }

    normalizeAddress(address) {
        if (!address) return '';
        
        return address.toLowerCase()
            .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln)\b/g, '') // Remove street types
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    }

    normalizeUrl(url) {
        if (!url) return '';
        
        return url.toLowerCase()
            .replace(/^https?:\/\//, '') // Remove protocol
            .replace(/^www\./, '') // Remove www
            .replace(/\/$/, ''); // Remove trailing slash
    }

    normalizePhone(phone) {
        if (!phone) return '';
        
        return phone.replace(/\D/g, ''); // Keep only digits
    }

    calculateStringSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        if (str1 === str2) return 1;
        
        // Use Levenshtein distance for similarity calculation
        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        
        if (maxLength === 0) return 1;
        
        return 1 - (distance / maxLength);
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    selectBestRecord(duplicates) {
        if (duplicates.length === 1) return duplicates[0];
        
        // Score each record based on completeness and data quality
        const scored = duplicates.map(church => ({
            church,
            score: this.calculateCompletenessScore(church)
        }));
        
        // Sort by score (highest first)
        scored.sort((a, b) => b.score - a.score);
        
        const best = scored[0].church;
        
        // Merge missing data from other records
        const merged = this.mergeChurchData(best, duplicates);
        
        this.logger.debug('Selected best record from duplicates', {
            selected: best.name,
            score: scored[0].score,
            alternatives: scored.slice(1).map(s => ({ name: s.church.name, score: s.score }))
        });
        
        return merged;
    }

    calculateCompletenessScore(church) {
        let score = 0;
        
        // Basic required fields
        if (church.name) score += 10;
        if (church.jurisdiction) score += 10;
        
        // Location information
        if (church.address) score += 8;
        if (church.city) score += 6;
        if (church.state) score += 6;
        if (church.zip_code) score += 4;
        
        // Contact information
        if (church.website) score += 8;
        if (church.contact_email) score += 6;
        if (church.contact_phone) score += 6;
        if (church.clergy_contact) score += 4;
        
        // Additional information
        if (church.establishment_year) score += 3;
        
        // Quality indicators
        if (church.website_validated === true) score += 5;
        if (church.source_url && church.source_url.includes('official')) score += 3;
        
        // Penalties for incomplete data
        if (!church.name || church.name.length < 5) score -= 5;
        if (!church.city && !church.address) score -= 5;
        
        return score;
    }

    mergeChurchData(primaryRecord, allRecords) {
        const merged = { ...primaryRecord };
        
        // Fill in missing fields from other records
        for (const record of allRecords) {
            if (record === primaryRecord) continue;
            
            for (const [key, value] of Object.entries(record)) {
                if (!merged[key] && value) {
                    merged[key] = value;
                }
            }
        }
        
        // Merge source URLs
        const sourceUrls = [...new Set(allRecords.map(r => r.source_url).filter(url => url))];
        if (sourceUrls.length > 1) {
            merged.source_urls = sourceUrls;
        }
        
        // Add merge metadata
        merged.merged_from = allRecords.length;
        merged.merge_date = new Date();
        
        return merged;
    }

    // Get statistics about duplicates found
    getDuplicationStats(duplicateGroups) {
        const stats = {
            totalGroups: duplicateGroups.length,
            totalDuplicates: duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0),
            largestGroup: duplicateGroups.length > 0 ? Math.max(...duplicateGroups.map(g => g.length)) : 0,
            jurisdictionBreakdown: {}
        };
        
        // Analyze duplicates by jurisdiction
        duplicateGroups.forEach(group => {
            group.forEach(church => {
                const jurisdiction = church.jurisdiction || 'Unknown';
                if (!stats.jurisdictionBreakdown[jurisdiction]) {
                    stats.jurisdictionBreakdown[jurisdiction] = 0;
                }
                stats.jurisdictionBreakdown[jurisdiction]++;
            });
        });
        
        return stats;
    }

    // Find potential duplicates with lower confidence (for manual review)
    findPotentialDuplicates(churches, threshold = 0.6) {
        const potentials = [];
        
        for (let i = 0; i < churches.length; i++) {
            for (let j = i + 1; j < churches.length; j++) {
                const similarity = this.calculateChurchSimilarity(churches[i], churches[j]);
                
                if (similarity > threshold && similarity <= this.similarityThreshold) {
                    potentials.push({
                        church1: churches[i],
                        church2: churches[j],
                        similarity: similarity,
                        reasons: this.getSimilarityReasons(churches[i], churches[j])
                    });
                }
            }
        }
        
        return potentials.sort((a, b) => b.similarity - a.similarity);
    }

    calculateChurchSimilarity(church1, church2) {
        let totalWeight = 0;
        let weightedScore = 0;
        
        // Name similarity (high weight)
        const nameWeight = 40;
        const nameSim = this.calculateStringSimilarity(
            this.normalizeForComparison(church1.name),
            this.normalizeForComparison(church2.name)
        );
        weightedScore += nameSim * nameWeight;
        totalWeight += nameWeight;
        
        // Location similarity (medium weight)
        if (church1.city && church2.city) {
            const cityWeight = 20;
            const citySim = this.calculateStringSimilarity(
                this.normalizeForComparison(church1.city),
                this.normalizeForComparison(church2.city)
            );
            weightedScore += citySim * cityWeight;
            totalWeight += cityWeight;
        }
        
        // Address similarity (medium weight)
        if (church1.address && church2.address) {
            const addressWeight = 20;
            const addressSim = this.calculateStringSimilarity(
                this.normalizeAddress(church1.address),
                this.normalizeAddress(church2.address)
            );
            weightedScore += addressSim * addressWeight;
            totalWeight += addressWeight;
        }
        
        // Contact similarity (low weight)
        if (church1.contact_phone && church2.contact_phone) {
            const phoneWeight = 10;
            const phoneSim = this.normalizePhone(church1.contact_phone) === this.normalizePhone(church2.contact_phone) ? 1 : 0;
            weightedScore += phoneSim * phoneWeight;
            totalWeight += phoneWeight;
        }
        
        return totalWeight > 0 ? weightedScore / totalWeight : 0;
    }

    getSimilarityReasons(church1, church2) {
        const reasons = [];
        
        const nameSim = this.calculateStringSimilarity(
            this.normalizeForComparison(church1.name),
            this.normalizeForComparison(church2.name)
        );
        if (nameSim > 0.7) reasons.push(`Similar names (${(nameSim * 100).toFixed(1)}%)`);
        
        if (this.areInSameLocation(church1, church2)) {
            reasons.push('Same location');
        }
        
        if (church1.website && church2.website && 
            this.normalizeUrl(church1.website) === this.normalizeUrl(church2.website)) {
            reasons.push('Same website');
        }
        
        if (church1.contact_phone && church2.contact_phone &&
            this.normalizePhone(church1.contact_phone) === this.normalizePhone(church2.contact_phone)) {
            reasons.push('Same phone');
        }
        
        return reasons;
    }
}

module.exports = DuplicateDetector;
