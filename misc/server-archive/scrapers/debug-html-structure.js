#!/usr/bin/env node

// 📁 server/scrapers/debug-html-structure.js
// Debug what HTML structure each Orthodox church website actually returns

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

class HTMLStructureDebugger {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        this.timeout = 15000;
        this.results = [];
    }

    async debugAllJurisdictions() {
        console.log('🔍 Debugging HTML Structure for Orthodox Church Websites');
        console.log('='.repeat(60));
        console.log();

        const jurisdictions = [
            {
                name: 'Orthodox Church in America (OCA)',
                urls: [
                    'https://www.oca.org/parishes',
                    'https://www.oca.org/parishes/search'
                ],
                expectedSelectors: [
                    '.parish-listing .parish-item',
                    '.parish-search-results .parish',
                    '.parish-directory .parish',
                    'tr.parish-row'
                ]
            },
            {
                name: 'Greek Orthodox Archdiocese (GOARCH)',
                urls: [
                    'https://www.goarch.org/parishes'
                ],
                expectedSelectors: [
                    '.parish-list .parish-item',
                    '.church-listing .church',
                    '.locator-results .result'
                ]
            },
            {
                name: 'Antiochian Orthodox',
                urls: [
                    'https://www.antiochian.org/parish-directory',
                    'https://www.antiochian.org/parish-locator'
                ],
                expectedSelectors: [
                    '.parish-listing',
                    '.directory-entry',
                    '.parish-item'
                ]
            }
        ];

        for (const jurisdiction of jurisdictions) {
            await this.debugJurisdiction(jurisdiction);
            console.log();
        }

        await this.generateReport();
    }

    async debugJurisdiction(jurisdiction) {
        console.log(`📍 ${jurisdiction.name}`);
        console.log('-'.repeat(jurisdiction.name.length + 4));

        for (const url of jurisdiction.urls) {
            console.log(`\n🔗 Testing URL: ${url}`);
            
            try {
                const html = await this.fetchHTML(url);
                const analysis = this.analyzeHTML(html, jurisdiction.expectedSelectors);
                
                console.log(`   📊 HTML Length: ${html.length} characters`);
                console.log(`   🏷️  Title: ${analysis.title}`);
                console.log(`   📋 Forms: ${analysis.formCount}`);
                console.log(`   🔗 Links: ${analysis.linkCount}`);
                console.log(`   📄 Paragraphs: ${analysis.paragraphCount}`);
                
                // Check for expected selectors
                console.log('   🎯 Selector Results:');
                for (const selector of jurisdiction.expectedSelectors) {
                    const count = analysis.selectorCounts[selector] || 0;
                    const status = count > 0 ? '✅' : '❌';
                    console.log(`      ${status} ${selector}: ${count} matches`);
                }

                // Look for common church-related terms
                console.log('   🏛️  Church Terms Found:');
                const churchTerms = this.findChurchTerms(html);
                for (const [term, count] of Object.entries(churchTerms)) {
                    if (count > 0) {
                        console.log(`      ✅ "${term}": ${count} times`);
                    }
                }

                // Save sample HTML for inspection
                const filename = `debug-${jurisdiction.name.replace(/[^a-zA-Z0-9]/g, '-')}-${url.replace(/[^a-zA-Z0-9]/g, '-')}.html`;
                await this.saveDebugHTML(html, filename);
                console.log(`   💾 Saved HTML: ${filename}`);

                this.results.push({
                    jurisdiction: jurisdiction.name,
                    url,
                    success: true,
                    analysis
                });

            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
                this.results.push({
                    jurisdiction: jurisdiction.name,
                    url,
                    success: false,
                    error: error.message
                });
            }
        }
    }

    async fetchHTML(url) {
        const response = await axios.get(url, {
            timeout: this.timeout,
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            maxRedirects: 5
        });
        
        return response.data;
    }

    analyzeHTML(html, expectedSelectors) {
        const $ = cheerio.load(html);
        
        const analysis = {
            title: $('title').text().trim() || 'No title',
            formCount: $('form').length,
            linkCount: $('a').length,
            paragraphCount: $('p').length,
            selectorCounts: {},
            hasJavaScript: html.includes('<script'),
            hasReactApp: html.includes('react') || html.includes('React'),
            hasAngularApp: html.includes('angular') || html.includes('ng-'),
            hasVueApp: html.includes('vue') || html.includes('Vue')
        };

        // Test each expected selector
        for (const selector of expectedSelectors) {
            try {
                analysis.selectorCounts[selector] = $(selector).length;
            } catch (error) {
                analysis.selectorCounts[selector] = 0;
            }
        }

        // Look for any div/li/tr that might contain church data
        analysis.potentialChurchContainers = {
            divs: $('div').length,
            lists: $('li').length,
            tableRows: $('tr').length,
            articles: $('article').length
        };

        return analysis;
    }

    findChurchTerms(html) {
        const terms = {
            'parish': (html.match(/parish/gi) || []).length,
            'church': (html.match(/church/gi) || []).length,
            'orthodox': (html.match(/orthodox/gi) || []).length,
            'cathedral': (html.match(/cathedral/gi) || []).length,
            'monastery': (html.match(/monastery/gi) || []).length,
            'priest': (html.match(/priest/gi) || []).length,
            'father': (html.match(/father/gi) || []).length,
            'liturgy': (html.match(/liturgy/gi) || []).length,
            'sunday': (html.match(/sunday/gi) || []).length,
            'service': (html.match(/service/gi) || []).length
        };

        return terms;
    }

    async saveDebugHTML(html, filename) {
        const debugDir = path.join(__dirname, '../data/debug-html');
        await fs.mkdir(debugDir, { recursive: true });
        
        // Save first 50KB of HTML for inspection
        const truncatedHTML = html.substring(0, 50000);
        await fs.writeFile(path.join(debugDir, filename), truncatedHTML);
    }

    async generateReport() {
        console.log('📊 SUMMARY REPORT');
        console.log('='.repeat(50));
        console.log();

        const successful = this.results.filter(r => r.success);
        const failed = this.results.filter(r => !r.success);

        console.log(`✅ Successful URLs: ${successful.length}`);
        console.log(`❌ Failed URLs: ${failed.length}`);
        console.log();

        if (successful.length > 0) {
            console.log('🎯 SELECTOR ANALYSIS:');
            console.log();
            
            for (const result of successful) {
                const hasWorkingSelectors = Object.values(result.analysis.selectorCounts).some(count => count > 0);
                const status = hasWorkingSelectors ? '✅' : '❌';
                console.log(`${status} ${result.jurisdiction}`);
                console.log(`   URL: ${result.url}`);
                console.log(`   Title: ${result.analysis.title}`);
                
                if (hasWorkingSelectors) {
                    console.log('   Working selectors:');
                    for (const [selector, count] of Object.entries(result.analysis.selectorCounts)) {
                        if (count > 0) {
                            console.log(`      ✅ ${selector}: ${count} matches`);
                        }
                    }
                } else {
                    console.log('   ❌ No expected selectors found');
                    
                    // Suggest potential alternatives
                    if (result.analysis.potentialChurchContainers) {
                        console.log('   💡 Potential alternatives:');
                        const containers = result.analysis.potentialChurchContainers;
                        if (containers.divs > 10) console.log(`      - ${containers.divs} <div> elements`);
                        if (containers.lists > 5) console.log(`      - ${containers.lists} <li> elements`);
                        if (containers.tableRows > 5) console.log(`      - ${containers.tableRows} <tr> elements`);
                        if (containers.articles > 0) console.log(`      - ${containers.articles} <article> elements`);
                    }
                }
                console.log();
            }
        }

        if (failed.length > 0) {
            console.log('❌ FAILED URLS:');
            for (const result of failed) {
                console.log(`   ${result.jurisdiction}: ${result.error}`);
            }
            console.log();
        }

        console.log('🔧 NEXT STEPS:');
        console.log('==============');
        console.log();
        console.log('1. 📁 Check saved HTML files in: ../data/debug-html/');
        console.log('2. 🔍 Look for new CSS selectors in the working URLs');
        console.log('3. 🛠️  Update jurisdiction scrapers with new selectors');
        console.log('4. 🧪 Test updated scrapers');
        console.log();
        console.log('💡 Many sites now use JavaScript to load content dynamically.');
        console.log('   Consider using Puppeteer for sites that require JS rendering.');

        // Save detailed report
        const reportPath = path.join(__dirname, '../data/debug-html/analysis-report.json');
        await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`\n📄 Detailed report saved: ${reportPath}`);
    }
}

// Run if called directly
if (require.main === module) {
    const debugger = new HTMLStructureDebugger();
    debugger.debugAllJurisdictions().catch(console.error);
}

module.exports = HTMLStructureDebugger; 