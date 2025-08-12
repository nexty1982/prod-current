#!/usr/bin/env node
/**
 * Orthodox Headlines Setup Script
 * Populates the orthodox_headlines table with sample data
 * Tests the headlines API and aggregation system
 */

const { promisePool } = require('../../config/db');

async function setupHeadlinesData() {
    console.log('📰 Setting up Orthodox Headlines data...\n');
    
    try {
        // First, let's verify the table exists
        console.log('🔍 Checking orthodox_headlines table...');
        const [tables] = await promisePool.execute(
            "SHOW TABLES LIKE 'orthodox_headlines'"
        );
        
        if (tables.length === 0) {
            console.log('❌ orthodox_headlines table does not exist!');
            console.log('Please create it first using the schema file.');
            return;
        }
        
        console.log('✅ Table exists');
        
        // Check current data
        const [existing] = await promisePool.execute(
            'SELECT COUNT(*) as count FROM orthodox_headlines'
        );
        
        console.log(`📊 Current headlines count: ${existing[0].count}`);
        
        if (existing[0].count > 0) {
            console.log('🔄 Table already has data. Skipping sample data insertion.');
        } else {
            console.log('📝 Inserting sample Orthodox headlines...');
            
            // Insert sample data
            const sampleHeadlines = [
                {
                    source_name: 'GOARCH',
                    title: 'His Eminence Archbishop Elpidophoros Celebrates Feast of Theophany',
                    summary: 'The Archbishop led the traditional blessing of the waters ceremony at the Hudson River, continuing the ancient Orthodox tradition of Theophany celebrations.',
                    image_url: 'https://www.goarch.org/images/theophany2025.jpg',
                    article_url: 'https://www.goarch.org/news/theophany-2025',
                    language: 'en',
                    hours_ago: 2
                },
                {
                    source_name: 'OCA',
                    title: 'His Beatitude Metropolitan Tikhon Issues Paschal Message',
                    summary: 'The Primate of the Orthodox Church in America released his annual Paschal message, emphasizing themes of renewal and hope.',
                    image_url: 'https://www.oca.org/images/paschal-message.jpg',
                    article_url: 'https://www.oca.org/news/paschal-message-2025',
                    language: 'en',
                    hours_ago: 3
                },
                {
                    source_name: 'ANTIOCH',
                    title: 'Metropolitan Joseph Visits West Coast Parishes',
                    summary: 'His Eminence Metropolitan Joseph of the Antiochian Orthodox Christian Archdiocese conducted pastoral visits across California parishes.',
                    image_url: 'https://www.antiochian.org/images/visit-westcoast.jpg',
                    article_url: 'https://www.antiochian.org/news/metropolitan-visit-2025',
                    language: 'en',
                    hours_ago: 4
                },
                {
                    source_name: 'ORTHODOX_TIMES',
                    title: 'Breaking: Orthodox Delegation Meets with Pope Francis',
                    summary: 'A high-level Orthodox delegation met with Pope Francis at the Vatican to discuss interfaith dialogue and cooperation.',
                    image_url: 'https://orthodoximes.com/images/vatican-meeting.jpg',
                    article_url: 'https://orthodoximes.com/vatican-meeting-2025',
                    language: 'en',
                    hours_ago: 1
                },
                {
                    source_name: 'SERBIAN',
                    title: 'Patriarch Porfirije Addresses European Orthodox Leaders',
                    summary: 'His Holiness spoke at the pan-Orthodox conference in Vienna about challenges facing Orthodox Christians in Europe.',
                    image_url: 'https://www.spc.rs/images/patriarch-vienna.jpg',
                    article_url: 'https://www.spc.rs/news/european-conference',
                    language: 'en',
                    hours_ago: 6
                },
                {
                    source_name: 'GOARCH',
                    title: 'Εορτή της Θεοφάνειας στον Ύψωνα',
                    summary: 'Ο Αρχιεπίσκοπος Ελπιδοφόρος τέλεσε τη θεία λειτουργία και τον αγιασμό των υδάτων.',
                    image_url: 'https://www.goarch.org/images/theophania-gr.jpg',
                    article_url: 'https://www.goarch.org/el/theophania-2025',
                    language: 'el',
                    hours_ago: 5
                },
                {
                    source_name: 'PRAVOSLAVIE',
                    title: 'Патриарх Кирилл освятил новый храм в Москве',
                    summary: 'Его Святейшество совершил чин освящения нового храма в честь святых новомучеников российских.',
                    image_url: 'https://www.pravoslavie.ru/images/new-temple.jpg',
                    article_url: 'https://www.pravoslavie.ru/novosti/novyj-hram-moskva',
                    language: 'ru',
                    hours_ago: 8
                }
            ];
            
            for (const headline of sampleHeadlines) {
                await promisePool.execute(`
                    INSERT INTO orthodox_headlines 
                    (source_name, title, summary, image_url, article_url, language, pub_date) 
                    VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))
                `, [
                    headline.source_name,
                    headline.title,
                    headline.summary,
                    headline.image_url,
                    headline.article_url,
                    headline.language,
                    headline.hours_ago
                ]);
            }
            
            console.log(`✅ Inserted ${sampleHeadlines.length} sample headlines`);
        }
        
        // Test the API endpoint
        console.log('\n🧪 Testing headlines API...');
        const [testHeadlines] = await promisePool.execute(`
            SELECT 
                id, source_name, title, language, pub_date
            FROM orthodox_headlines 
            ORDER BY pub_date DESC 
            LIMIT 5
        `);
        
        console.log('📰 Sample headlines:');
        testHeadlines.forEach((headline, index) => {
            console.log(`  ${index + 1}. [${headline.source_name}] ${headline.title.substring(0, 60)}...`);
        });
        
        // Show sources
        const [sources] = await promisePool.execute(`
            SELECT 
                source_name, 
                COUNT(*) as count,
                MAX(pub_date) as latest
            FROM orthodox_headlines 
            GROUP BY source_name 
            ORDER BY count DESC
        `);
        
        console.log('\n📊 Headlines by source:');
        sources.forEach(source => {
            console.log(`  • ${source.source_name}: ${source.count} articles (latest: ${source.latest})`);
        });
        
        console.log('\n✅ Orthodox Headlines setup completed successfully!');
        console.log('🌐 Your headlines should now appear at: https://orthodoxmetrics.com/orthodox-headlines');
        
        // Show next steps
        console.log('\n🚀 Next steps:');
        console.log('1. Visit your headlines page to verify it works');
        console.log('2. Set up automated news fetching with: npm run headlines:fetch');
        console.log('3. Schedule regular updates with cron or PM2');
        
    } catch (error) {
        console.error('❌ Error setting up headlines data:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    setupHeadlinesData()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { setupHeadlinesData }; 