# 🌐 OrthodoxMetrics Social Experience Module

## Overview

The Social Experience Module transforms OrthodoxMetrics into a comprehensive social platform for Orthodox Christian communities. This module provides users with blogging capabilities, friend networks, real-time messaging, and rich social interactions while maintaining the spiritual focus of the platform.

## ✨ Key Features

### 📝 **Personal Blogging System**
- **Rich Content Editor** with text formatting, emojis, and media uploads
- **Privacy Controls**: Public, Private, or Friends-only visibility
- **Blog Categories** with custom colors and icons
- **Featured Posts** and pinning capabilities
- **Comment System** with nested replies
- **Social Reactions** with Orthodox-themed emojis (🙏 Pray, 🕯️ Amen, etc.)
- **Blog Access Requests** for private content

### 👥 **Friend Network System**
- **Friend Discovery** with advanced search
- **Friend Requests** with accept/deny functionality
- **Online Status Indicators** (Online/Offline/Last Seen)
- **Privacy Settings** and friendship management
- **Friend Activity Feed** showing latest updates

### 💬 **Real-Time Chat & Messaging**
- **Direct Messages** between friends
- **Group Conversations** with admin controls
- **Message Reactions** and emoji support
- **Read Receipts** and typing indicators
- **Message History** with infinite scroll
- **File Sharing** capabilities

### 🔔 **Comprehensive Notification System**
- **Real-Time Notifications** for all social interactions
- **Email Integration** for offline notifications
- **Notification Categories**:
  - Friend requests and acceptances
  - Blog comments and reactions
  - Private message alerts
  - Blog access requests
  - System announcements
- **Notification Settings** with granular controls

### 🎨 **Advanced Profile Features**
- **Custom Profile Images** and cover photos
- **Personal Bio** and status messages
- **Location and Website** information
- **Social Links** integration
- **Profile Themes** and customization
- **Privacy Controls** for profile visibility

### 📊 **Activity Timeline Feed**
- **"What's New"** feed from friends' activities
- **Blog Post Updates** and social interactions
- **Friend Activity** tracking
- **Customizable Feed** filters

## 🗄️ Database Architecture

### Core Tables

#### **User Profiles Extended**
```sql
user_profiles
├── user_id (FK to users)
├── display_name
├── bio
├── location
├── website
├── profile_image_url
├── cover_image_url
├── is_online
├── last_seen
├── privacy_settings (JSON)
└── social_links (JSON)
```

#### **Blog System**
```sql
blog_posts
├── user_id (FK)
├── title, slug, content
├── visibility (public/private/friends_only)
├── featured_image_url
├── tags (JSON)
├── view_count, like_count, comment_count
└── published_at

blog_categories
├── user_id (FK)
├── name, description
├── color, icon
└── post_count

blog_comments
├── post_id (FK)
├── user_id (FK)
├── parent_id (FK for nested replies)
├── content
└── like_count
```

#### **Friend Management**
```sql
friendships
├── requester_id (FK)
├── addressee_id (FK)
├── status (pending/accepted/declined/blocked)
├── requested_at
├── responded_at
└── notes
```

#### **Chat System**
```sql
chat_conversations
├── type (direct/group)
├── name, description
├── created_by (FK)
├── last_message_id (FK)
└── last_activity

chat_participants
├── conversation_id (FK)
├── user_id (FK)
├── role (member/admin/moderator)
├── last_read_at
└── notification_settings (JSON)

chat_messages
├── conversation_id (FK)
├── sender_id (FK)
├── content, message_type
├── reply_to_id (FK)
├── reactions (JSON)
└── is_edited, is_deleted
```

#### **Notifications**
```sql
notifications
├── user_id (FK)
├── type (friend_request/blog_comment/chat_message/etc.)
├── title, message
├── data (JSON)
├── priority (low/normal/high/urgent)
├── is_read
├── sender_id (FK)
└── expires_at
```

#### **Social Interactions**
```sql
social_reactions
├── user_id (FK)
├── target_type (blog_post/blog_comment/chat_message)
├── target_id
└── reaction_type (like/love/pray/amen/etc.)

activity_feed
├── user_id (FK)
├── actor_id (FK)
├── activity_type
├── target_type, target_id
├── title, description
└── visibility
```

## 🚀 API Reference

### **Blog API Endpoints**

#### Get Blog Posts
```http
GET /api/social/blog/posts
```
**Query Parameters:**
- `user_id` - Filter by author
- `visibility` - public/private/friends_only
- `status` - published/draft
- `search` - Text search
- `tags` - Filter by tags
- `limit`, `offset` - Pagination

#### Create Blog Post
```http
POST /api/social/blog/posts
```
**Body:**
```json
{
  "title": "My Spiritual Journey",
  "content": "<p>Rich HTML content...</p>",
  "visibility": "public",
  "tags": ["faith", "prayer"],
  "featured_image_url": "/uploads/blog/image.jpg"
}
```

#### Add Comment
```http
POST /api/social/blog/posts/{id}/comments
```

#### React to Post
```http
POST /api/social/blog/posts/{id}/react
```
**Body:**
```json
{
  "reaction_type": "pray"
}
```

### **Friends API Endpoints**

#### Search Users
```http
GET /api/social/friends/search?q=john
```

#### Send Friend Request
```http
POST /api/social/friends/request/{userId}
```

#### Get Friend Requests
```http
GET /api/social/friends/requests?type=received&status=pending
```

#### Respond to Friend Request
```http
PUT /api/social/friends/requests/{requestId}
```
**Body:**
```json
{
  "action": "accept"
}
```

#### Get Friends List
```http
GET /api/social/friends?online_only=true
```

### **Chat API Endpoints**

#### Get Conversations
```http
GET /api/social/chat/conversations
```

#### Start Conversation
```http
POST /api/social/chat/start/{friendId}
```

#### Get Messages
```http
GET /api/social/chat/conversations/{id}/messages
```

#### Send Message
```http
POST /api/social/chat/conversations/{id}/messages
```
**Body:**
```json
{
  "content": "Hello, how are you?",
  "message_type": "text"
}
```

### **Notifications API Endpoints**

#### Get Notifications
```http
GET /api/social/notifications
```

#### Get Unread Count
```http
GET /api/social/notifications/unread
```

#### Mark as Read
```http
PUT /api/social/notifications/{id}/read
```

#### Get/Update Settings
```http
GET /api/social/notifications/settings
PUT /api/social/notifications/settings
```

## 🛠️ Installation & Setup

### 1. Database Initialization

Run the social module initialization script:

```bash
# Navigate to server directory
cd server

# Run initialization script
node scripts/initialize-social-module.js
```

This will:
- Create all required database tables
- Set up indexes and triggers
- Create default user profiles
- Initialize sample blog categories
- Verify system integrity

### 2. Frontend Integration

The module automatically integrates with the existing OrthodoxMetrics frontend through:

- **User Profile Section** - Access via main navigation
- **Notification Bell** - Real-time notification display
- **Social Navigation** - Integrated menu items
- **Chat Interface** - Accessible from friend lists

### 3. File Upload Configuration

Ensure the upload directories exist:

```bash
mkdir -p front-end/public/uploads/blog
mkdir -p front-end/public/uploads/profiles
mkdir -p front-end/public/uploads/chat
```

## 🎨 User Interface Components

### **Blog Editor**
- Rich text editor with toolbar
- Image upload with drag & drop
- Tag management with autocomplete
- Privacy setting controls
- Preview functionality

### **Friend Management**
- Search interface with filters
- Friend request notifications
- Online status indicators
- Quick action buttons

### **Chat Interface**
- Conversation list with unread counts
- Message composer with emoji picker
- Real-time message updates
- File attachment support

### **Notification Center**
- Dropdown notification panel
- Categorized notification types
- Action buttons for quick responses
- Settings panel for preferences

## 🔒 Security & Privacy

### **Privacy Controls**
- **Blog Visibility**: Public, Private, Friends-only
- **Profile Privacy**: Control who can see profile information
- **Friend Requests**: Enable/disable friend request acceptance
- **Online Status**: Hide/show online presence
- **Notification Settings**: Granular control over notifications

### **Access Control**
- **Authentication Required**: All social features require login
- **Friend-Only Chat**: Can only message friends
- **Content Moderation**: Comment approval system
- **Privacy Validation**: Server-side privacy enforcement

### **Data Protection**
- **Secure File Uploads**: Type and size validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content sanitization
- **CSRF Protection**: Session-based security

## 📱 Mobile Responsiveness

All social features are fully responsive and mobile-optimized:

- **Touch-Friendly Interface**: Large tap targets
- **Mobile Chat**: Optimized message bubbles
- **Responsive Blog Editor**: Mobile-friendly editing
- **Notification Badges**: Clear mobile indicators

## 🧪 Testing

### API Testing
Use the provided test scripts to verify functionality:

```bash
# Test blog functionality
node testing/test-blog-api.js

# Test friend system
node testing/test-friends-api.js

# Test chat system
node testing/test-chat-api.js

# Test notifications
node testing/test-notifications-api.js
```

### Frontend Testing
- **Component Tests**: React component unit tests
- **Integration Tests**: User interaction flows
- **Performance Tests**: Load testing for real-time features

## 🚀 Advanced Features

### **Real-Time Updates**
- **WebSocket Integration**: Real-time chat and notifications
- **Live Activity Feed**: Instant updates for friend activities
- **Online Presence**: Real-time status updates

### **Content Management**
- **Blog Analytics**: View counts and engagement metrics
- **Content Scheduling**: Schedule blog posts for later
- **Content Moderation**: Admin controls for content management

### **Social Analytics**
- **Friend Network Analysis**: Connection insights
- **Content Performance**: Blog post analytics
- **User Engagement**: Activity tracking

## 🔧 Configuration Options

### **Environment Variables**
```env
# Social Module Settings
SOCIAL_MODULE_ENABLED=true
SOCIAL_MAX_FILE_SIZE=10485760
SOCIAL_ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,webp
SOCIAL_NOTIFICATIONS_ENABLED=true
SOCIAL_EMAIL_NOTIFICATIONS=true

# Chat Settings
CHAT_MESSAGE_LIMIT=1000
CHAT_FILE_UPLOAD_ENABLED=true

# Blog Settings
BLOG_MAX_POST_LENGTH=50000
BLOG_AUTO_SAVE_INTERVAL=30000
```

### **Customization Options**
- **Theme Integration**: Matches OrthodoxMetrics design
- **Orthodox Emoji Set**: Religious-themed reaction emojis
- **Language Support**: Multi-language interface
- **Custom Profile Themes**: Personalization options

## 📊 Performance Considerations

### **Database Optimization**
- **Indexes**: Optimized for common queries
- **Triggers**: Automatic counter updates
- **Views**: Pre-computed friend lists and activity feeds
- **Pagination**: Efficient large dataset handling

### **Caching Strategy**
- **Friend Lists**: Cached for quick access
- **Online Status**: Redis-based presence tracking
- **Notification Counts**: Cached unread counts
- **Blog Posts**: Content caching for popular posts

### **File Management**
- **Image Optimization**: Automatic resizing and compression
- **CDN Integration**: Ready for content delivery network
- **Storage Cleanup**: Automatic orphaned file removal

## 🛟 Support & Troubleshooting

### Common Issues

1. **Notifications Not Working**
   - Check notification settings in user profile
   - Verify email configuration
   - Check browser notification permissions

2. **Chat Messages Not Sending**
   - Verify friend relationship exists
   - Check conversation permissions
   - Validate message content length

3. **Blog Images Not Uploading**
   - Check file size limits
   - Verify upload directory permissions
   - Validate file type restrictions

### **Logging & Debugging**
- **Server Logs**: Detailed error logging for all social interactions
- **Database Logs**: Query performance monitoring
- **User Activity**: Audit trail for security

## 🔮 Future Enhancements

### Planned Features
- **Video Chat Integration**: Real-time video calling
- **Event Planning**: Social event organization
- **Prayer Requests**: Community prayer system
- **Study Groups**: Collaborative Bible study features
- **Church Integration**: Parish-specific social networks

### **API Expansions**
- **GraphQL Support**: More efficient data fetching
- **Webhook System**: Third-party integrations
- **Mobile App API**: Dedicated mobile endpoints
- **Real-time Subscriptions**: WebSocket API extensions

---

## 📞 Contact & Support

For technical support or feature requests:
- **Email**: support@orthodoxmetrics.com
- **Documentation**: See `/docs` directory
- **Issue Tracker**: GitHub Issues
- **Community**: OrthodoxMetrics Discord

---

**🏛️ The Social Experience Module enhances OrthodoxMetrics with powerful community features while maintaining our commitment to Orthodox Christian values and spiritual growth.** 🙏 