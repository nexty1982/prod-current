# Orthodox Headlines Web Component - Complete Setup Guide

## 🎯 **What Was Created:**

I've built a complete web interface for managing Orthodox headlines scraping with the following features:

### ✅ **Web Component Features:**

**📰 Source Management:**
- Visual cards showing all RSS sources
- Enable/disable sources with toggle switches
- Test RSS feeds directly from the interface
- Add new sources with validation
- Language and category tagging
- Status indicators (active/inactive/error)

**📂 Category Selection:**
- Pre-configured Orthodox categories (Church News, Saints, Monasticism, etc.)
- Keyword-based content filtering
- Priority-based category ranking
- Easy enable/disable toggles

**🌍 Language Controls:**
- Multi-language support (English, Greek, Russian, Romanian, Serbian)
- Flag-based visual language selection
- Filter sources by language

**⚙️ Global Settings:**
- Enable/disable automatic scraping
- Set cron schedule (e.g., "0 */6 * * *" for every 6 hours)
- Configure max articles per source
- Save user preferences

## 🚀 **How to Set It Up:**

### **Step 1: Install Database Schema**
```bash
mysql -u root -p orthodoxmetrics_db < server/database/headlines-config-schema.sql
```

This creates:
- `headlines_sources` - RSS sources with configuration
- `headlines_categories` - Content categories with keywords
- `headlines_config` - User-specific settings

### **Step 2: Access the Interface**
Navigate to: **`https://orthodoxmetrics.com/admin/headlines-config`**

You'll see a modern interface with:
- Global settings at the top
- Language selection on the left
- Category selection on the right
- Source management cards below

### **Step 3: Configure Your Sources**

**Test Existing Sources:**
1. Click "Test" button on any source card
2. See real-time results (article count, status)
3. Enable/disable sources with toggle switches

**Add New Sources:**
1. Click "Add Source" button
2. Fill in RSS feed URL and details
3. Select language and categories
4. Test and enable

**Bulk Configuration:**
1. Configure multiple sources at once
2. Click "Save Configuration" to apply all changes
3. Settings are saved per user

### **Step 4: Set Up Categories**

**Pre-configured Categories:**
- ✅ Church News (patriarch, bishop, archbishop, synod)
- ✅ Orthodox Christianity (orthodox, liturgy, theology)
- ✅ Saints & Martyrs (saint, martyr, canonization)
- ✅ Monasticism (monastery, monk, Mount Athos)
- ✅ Liturgy & Worship (divine liturgy, vespers, chanting)
- ✅ Social Ministry (charity, outreach, community)
- ✅ Religious Freedom (persecution, human rights)

**Custom Categories:**
- Add your own keywords
- Set priority levels
- Enable/disable per preference

## 📊 **Using the Interface:**

### **Global Settings Card:**
```
⚙️ Global Settings
├── Enable Automatic Scraping [Toggle]
├── Max Articles per Source [Number Input]
└── Cron Schedule [Text Input: "0 */6 * * *"]
```

### **Language Selection:**
```
🌍 Languages
├── 🇺🇸 English
├── 🇬🇷 Greek  
├── 🇷🇺 Russian
├── 🇷🇴 Romanian
└── 🇷🇸 Serbian
```

### **Source Cards:**
```
📡 Orthodox Times [EN] [Active]
├── Feed URL: https://orthodoxtimes.com/feed/
├── Categories: Church News, Orthodox Christianity
├── Articles: 15 | Last fetch: Today
├── [Test] [Settings] [Enable/Disable Toggle]
```

### **Add Source Dialog:**
```
Add New News Source
├── Source Name: [Text Input]
├── RSS Feed URL: [URL Input]
├── Language: [Dropdown: EN/GR/RU/RO/SR]
├── Enable by default: [Toggle]
└── Description: [Text Area]
```

## 🎛️ **Backend API Endpoints:**

The component uses these API endpoints (all created):

```bash
# Configuration Management
GET    /api/headlines/config          # Get user config
PUT    /api/headlines/config          # Save user config

# Source Management  
GET    /api/headlines/sources/manage  # Get all sources
POST   /api/headlines/sources         # Add new source
PUT    /api/headlines/sources/bulk-update  # Update multiple
DELETE /api/headlines/sources/:id     # Delete source
POST   /api/headlines/sources/:id/test    # Test RSS feed

# Category Management
GET    /api/headlines/categories            # Get categories
PUT    /api/headlines/categories/bulk-update # Update categories
```

## 📋 **Default Sources Included:**

1. **Orthodox Times** (EN) - Global Orthodox news
2. **Romfea** (GR) - Greek Orthodox news
3. **Patriarchate of Moscow** (EN) - Russian Orthodox
4. **Basilica.ro** (RO) - Romanian Orthodox
5. **OrthoChristian** (EN) - Comprehensive Orthodox content
6. **Greek Orthodox Archdiocese** (EN) - American Greek Orthodox
7. **Orthodox Church in America** (EN) - OCA news
8. **Pravoslavie.ru** (RU) - Russian Orthodox portal

## 🔧 **Integration with Fetch Script:**

The web interface saves configuration to the database, which can be read by the fetch script:

```bash
# The fetch script can now read from database configuration
node scripts/fetch-headlines.js --use-db-config

# Or still use manual configuration
node scripts/fetch-headlines.js --language en --source "Orthodox Times"
```

## 🎨 **UI Features:**

**Modern Design:**
- Material-UI components with Orthodox theme
- Card-based layout with clear visual hierarchy
- Responsive design for desktop and mobile
- Color-coded status indicators

**Real-time Feedback:**
- Success/error messages with Snackbar
- Loading states for all operations
- Test results with article counts
- Status badges (Active/Inactive/Error)

**User Experience:**
- Bulk operations for efficiency
- Confirmation dialogs for destructive actions
- Auto-save drafts and validation
- Keyboard shortcuts and accessibility

## 🚀 **Next Steps:**

1. **Access the interface**: Visit `/admin/headlines-config`
2. **Run the database schema**: Install the tables and default data
3. **Configure your sources**: Enable desired RSS feeds
4. **Set categories**: Choose content types you want
5. **Test and save**: Verify everything works and save config
6. **Schedule fetching**: Set up automated headline collection

## 💡 **Pro Tips:**

- **Test sources first** before enabling them
- **Use categories** to filter content types
- **Set reasonable schedules** (every 6 hours is recommended)
- **Monitor article counts** to adjust max articles per source
- **Check language settings** to match your audience

The Orthodox Headlines system is now **fully configurable** through a beautiful web interface! 🎉

## 🔐 **Access Control:**

- Interface requires **Admin** or **Super Admin** role
- User-specific configurations are saved per account
- Global defaults available for new users
- Secure API endpoints with authentication

Your Orthodox news aggregation is now **professional-grade** with full web-based management! 📰✨ 