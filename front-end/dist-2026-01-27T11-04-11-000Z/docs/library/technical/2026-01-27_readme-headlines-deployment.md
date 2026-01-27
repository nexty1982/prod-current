# 📰 Orthodox Headlines System - Deployment Guide

## 🎯 Overview

The Orthodox Headlines system is a comprehensive news aggregation platform that fetches Orthodox news from multiple sources worldwide and presents them in a beautiful, filtered interface for authenticated users.

## ✨ Features Completed

### ✅ Frontend
- **Responsive React page** at `/orthodox-headlines`
- **Authentication-protected** route
- **Material-UI design** with Orthodox theme
- **Source and language filtering**
- **Auto-refresh** every 10 minutes
- **Pagination** with "Load More"
- **"New!" badges** for recent articles
- **Beautiful card layouts** with hover animations

### ✅ Backend API
- **RESTful endpoints** with authentication
- **Smart caching** (memory + optional Redis)
- **Church security integration**
- **Comprehensive error handling**
- **Performance optimized**

### ✅ News Aggregation
- **Automated cron script** (`cron/fetch-headlines.js`)
- **Multiple source types**: RSS feeds + HTML scraping
- **10+ Orthodox news sources** worldwide
- **Multi-language support** (English, Greek, Russian, Serbian, etc.)
- **Auto-translation detection**
- **Duplicate prevention**
- **Content cleanup** and validation

### ✅ Caching System
- **Two-tier caching**: Memory (NodeCache) + Redis
- **3-6 hour TTL** for optimal performance
- **Automatic cache invalidation**
- **Cache warming** for popular queries
- **Hit rate monitoring**

### ✅ Management Tools
- **Comprehensive management script** (`scripts/headlines-management.js`)
- **System monitoring** and statistics
- **Source testing** and validation
- **Database cleanup** utilities
- **Cache management**
- **Export/import** functionality

### ✅ Deployment Options
- **PM2 configuration** for production
- **OS-level crontab** setup script
- **Node-cron** built-in scheduler
- **Docker-ready** structure

## 🚀 Quick Deployment

### 1️⃣ Database Setup

```bash
# Navigate to server directory
cd server

# Run the database schema
mysql -u root -p orthodoxmetrics_db < database/orthodox-headlines-schema.sql

# Verify table creation
mysql -u root -p -e "DESCRIBE orthodoxmetrics_db.orthodox_headlines;"
```

### 2️⃣ Install Dependencies

```bash
# Install required NPM packages
npm install xml2js cheerio node-cron node-cache redis

# Or if using the provided package.json
npm install
```

### 3️⃣ Choose Deployment Method

#### **Option A: PM2 (Recommended for Production)**

```bash
# Install PM2 globally
npm install -g pm2

# Update the path in pm2-headlines.config.js
# Edit: server/scripts/pm2-headlines.config.js
# Change: cwd: '/path/to/your/server'

# Start the service
pm2 start scripts/pm2-headlines.config.js

# Monitor
pm2 status
pm2 logs orthodox-headlines-aggregator

# Save configuration
pm2 save
pm2 startup
```

#### **Option B: OS Crontab (Linux/Unix)**

```bash
# Run the setup script (Linux only)
cd server/cron
chmod +x setup-crontab.sh
./setup-crontab.sh

# Or manually add to crontab
crontab -e
# Add: 0 */6 * * * cd /path/to/server && node cron/fetch-headlines.js test >> logs/headlines-cron.log 2>&1
```

#### **Option C: Node Process (Development)**

```bash
# Start the aggregation service
cd server
node cron/fetch-headlines.js start

# Or run once for testing
node cron/fetch-headlines.js test
```

### 4️⃣ Frontend Deployment

The frontend is already integrated and ready! Users can access:
- **URL**: `https://yourdomain.com/orthodox-headlines`
- **Navigation**: Under "🌍 Explore" → "Orthodox Headlines"
- **Access**: Authenticated users only

## 🔧 Configuration

### News Sources

Edit `server/cron/fetch-headlines.js` to configure sources:

```javascript
const NEWS_SOURCES = [
    {
        name: 'ORTHODOX_TIMES',
        type: 'rss',
        url: 'https://orthodoximes.com/feed/',
        language: 'en',
        enabled: true  // Set to false to disable
    },
    // Add more sources...
];
```

### Caching (Optional Redis)

For production, set up Redis caching:

```bash
# Install Redis
sudo apt-get install redis-server

# Set environment variable
export REDIS_URL="redis://localhost:6379"

# Or add to .env file
echo "REDIS_URL=redis://localhost:6379" >> .env
```

### Performance Tuning

Edit configuration in `server/cron/fetch-headlines.js`:

```javascript
const CONFIG = {
    CRON_SCHEDULE: '0 */6 * * *',     // Every 6 hours
    MAX_ARTICLES_PER_SOURCE: 10,      // Articles per source
    ARTICLE_EXPIRY_DAYS: 30,          // Cleanup after 30 days
    REQUEST_TIMEOUT: 30000,           // 30 second timeout
    ENABLE_AUTO_TRANSLATION: true,    // Detect non-English
    ENABLE_CACHING: true              // Use caching system
};
```

## 📊 Monitoring & Management

### System Status

```bash
# Show comprehensive system status
node scripts/headlines-management.js status

# Test all news sources
node scripts/headlines-management.js test

# Clean database (remove duplicates, old articles)
node scripts/headlines-management.js clean

# Live monitoring
node scripts/headlines-management.js monitor
```

### Cache Management

```bash
# Cache statistics
node scripts/headlines-management.js cache stats

# Clear cache
node scripts/headlines-management.js cache clear
```

### Logs & Debugging

```bash
# View aggregation logs
tail -f logs/headlines-cron.log

# PM2 logs
pm2 logs orthodox-headlines-aggregator

# Check database
mysql -u root -p -e "SELECT source_name, COUNT(*) as count, MAX(pub_date) as latest FROM orthodoxmetrics_db.orthodox_headlines GROUP BY source_name;"
```

## 🧪 Testing & Validation

### Manual Testing

```bash
# Test single aggregation run
cd server
node cron/fetch-headlines.js test

# Test specific source
node scripts/headlines-management.js test
```

### Frontend Testing

1. **Login** to your Orthodox Metrics account
2. **Navigate** to "Orthodox Headlines" in the menu
3. **Verify** articles are loading
4. **Test filters** (source, language)
5. **Check** "New!" badges on recent articles
6. **Verify** "Read More" links open in new tabs

### API Testing

```bash
# Test headlines API (requires authentication)
curl -X GET "http://localhost:3000/api/headlines?source=GOARCH&lang=en&limit=5" \
  -H "Cookie: your-session-cookie"

# Test sources API
curl -X GET "http://localhost:3000/api/headlines/sources" \
  -H "Cookie: your-session-cookie"
```

## 🚨 Troubleshooting

### Common Issues

#### **No Articles Appearing**
```bash
# Check if aggregation is running
ps aux | grep fetch-headlines

# Check logs
tail -f logs/headlines-cron.log

# Test manually
node cron/fetch-headlines.js test
```

#### **Cache Issues**
```bash
# Clear cache
node scripts/headlines-management.js cache clear

# Check Redis connection (if using Redis)
redis-cli ping
```

#### **Source Failures**
```bash
# Test individual sources
node scripts/headlines-management.js test

# Check specific source in logs
grep "ERROR\|TIMEOUT" logs/headlines-cron.log
```

#### **Database Connection**
```bash
# Test database connection
mysql -u root -p orthodoxmetrics_db -e "SELECT COUNT(*) FROM orthodox_headlines;"
```

### Performance Optimization

1. **Enable Redis** for better caching
2. **Adjust source limits** in CONFIG
3. **Monitor memory usage** with PM2
4. **Set up database indexing**
5. **Configure CDN** for images

## 🔒 Security Considerations

### Best Practices Implemented

- ✅ **Authentication required** for all endpoints
- ✅ **Church context security** integration
- ✅ **SQL injection protection** with parameterized queries
- ✅ **Rate limiting** between source requests
- ✅ **Input sanitization** for scraped content
- ✅ **Proper error handling** without data leakage

### Additional Security (Recommended)

1. **Use HTTPS** for all external requests
2. **Set up firewall** rules for Redis
3. **Monitor for abnormal traffic**
4. **Regular security updates**
5. **Backup database** regularly

## 📈 Scaling Considerations

### Current Capacity
- **10+ news sources**
- **~200 articles/day** typical load
- **6-hour refresh** cycle
- **Memory + Redis** caching

### Scale-Up Options
1. **Add more sources** to NEWS_SOURCES array
2. **Increase refresh frequency** (change CRON_SCHEDULE)
3. **Implement load balancing** for multiple aggregators
4. **Add CDN** for image optimization
5. **Database sharding** for high volume

## 🎉 Success Metrics

After deployment, you should see:

- ✅ **Fresh articles** every 6 hours
- ✅ **Multiple Orthodox sources** represented
- ✅ **Multi-language content** (Greek, Russian, Serbian)
- ✅ **Fast page load times** (thanks to caching)
- ✅ **High user engagement** with filtering
- ✅ **Zero downtime** operation

## 📞 Support

### Resources
- **Management Script**: `node scripts/headlines-management.js help`
- **Configuration**: `server/cron/fetch-headlines.js`
- **API Docs**: `server/routes/headlines.js`
- **Frontend**: `front-end/src/pages/OrthodoxHeadlines.tsx`

### Maintenance Schedule
- **Daily**: Check logs for errors
- **Weekly**: Review source performance
- **Monthly**: Database cleanup and optimization
- **Quarterly**: Add new Orthodox news sources

---

**🎯 Deployment Complete!** Your Orthodox Headlines system is now ready to serve the Orthodox community with fresh, curated news from around the world.

**Next Steps**: Announce to users, monitor performance, and gather feedback for future enhancements. 