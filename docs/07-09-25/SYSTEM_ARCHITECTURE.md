# System Architecture - Orthodox Church Management System

## Overview
The Orthodox Church Management System is a comprehensive web application designed to manage Orthodox church operations, including user management, church administration, note-taking, calendar management, invoicing, and document processing through OCR capabilities.

## High-Level Architecture

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React/TS)    │◄──►│   (Node.js)     │◄──►│   (SQLite)      │
│   Port: 5173    │    │   Port: 3000    │    │   File-based    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Static Files  │    │   File System   │    │   Logs System   │
│   (Assets)      │    │   (Uploads)     │    │   (Monitoring)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Deployment Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        Production Server                     │
│                        (192.168.1.239)                     │
├─────────────────────────────────────────────────────────────┤
│                         Nginx                              │
│                    (Reverse Proxy)                         │
│                      Port: 80/443                          │
├─────────────────────────────────────────────────────────────┤
│    Frontend           │         Backend                    │
│    (Static Files)     │      (Node.js App)                │
│    /var/www/html      │      Port: 3000                   │
├─────────────────────────────────────────────────────────────┤
│                    File System                             │
│    /var/www/html/uploads  │  /var/www/html/logs            │
│    /var/www/html/database │  /var/www/html/certificates    │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend Tier
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Tailwind CSS + Radix UI
- **State Management**: React Query + Context API
- **Routing**: React Router
- **HTTP Client**: Axios

### Backend Tier
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: JavaScript (ES6+)
- **Session Management**: express-session
- **Authentication**: Custom JWT-based system
- **File Upload**: Multer
- **OCR Processing**: Tesseract.js

### Database Tier
- **Primary Database**: SQLite3
- **ORM**: Custom SQL queries
- **Session Store**: SQLite-based sessions
- **File Storage**: Local file system
- **Backup**: File-based backups

### Infrastructure
- **Web Server**: Nginx (reverse proxy)
- **Process Management**: PM2
- **Operating System**: Linux (Ubuntu/CentOS)
- **SSL**: Let's Encrypt certificates
- **Monitoring**: Custom logging system

## Data Flow Architecture

### Request Flow
```
User Browser → Nginx → Frontend (React) → Backend API → Database
     ↓              ↓           ↓              ↓           ↓
Static Files ← Nginx ← Build ← API Response ← Query Result
```

### Authentication Flow
```
1. User Login → Frontend Form
2. Credentials → Backend /auth/login
3. Validation → Database user lookup
4. JWT Token → Session storage
5. Protected Routes → Token validation
6. API Requests → Bearer token header
```

### File Processing Flow
```
1. File Upload → Frontend form
2. Multipart Data → Backend /api/upload
3. File Storage → /uploads directory
4. OCR Processing → Tesseract.js
5. Text Extraction → Database storage
6. Results → Frontend display
```

## Security Architecture

### Authentication & Authorization
- **Session Management**: Server-side session storage
- **Token-based Auth**: JWT tokens for API access
- **Role-based Access**: Admin, User, and Guest roles
- **Password Security**: Bcrypt hashing
- **Session Timeout**: Automatic logout on inactivity

### Data Protection
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: Input sanitization
- **CSRF Protection**: Anti-CSRF tokens
- **File Upload Security**: File type validation and size limits

### Network Security
- **HTTPS**: SSL/TLS encryption
- **Reverse Proxy**: Nginx as security layer
- **Rate Limiting**: API request throttling
- **CORS**: Cross-origin resource sharing controls
- **Security Headers**: Helmet.js security headers

## Database Architecture

### Core Tables
- **users**: User account management
- **churches**: Church directory and information
- **notes**: Note-taking and organization
- **notifications**: System notifications
- **calendar_events**: Calendar and scheduling
- **invoices**: Billing and invoice management
- **kanban_tasks**: Task management
- **orthodox_records**: Orthodox-specific records
- **ocr_documents**: OCR processed documents
- **menu_items**: Dynamic menu system
- **logs**: System audit logs
- **sessions**: User session management

### Relationships
- **One-to-Many**: User → Notes, Churches → Events
- **Many-to-Many**: Users ↔ Churches (via permissions)
- **Self-referencing**: Menu items hierarchy
- **Audit Trail**: All major entities have created/modified tracking

## API Architecture

### RESTful Design
- **GET**: Retrieve data
- **POST**: Create new resources
- **PUT**: Update existing resources
- **DELETE**: Remove resources
- **PATCH**: Partial updates

### Endpoint Structure
```
/api/auth/*        - Authentication endpoints
/api/users/*       - User management
/api/churches/*    - Church management
/api/notes/*       - Note management
/api/calendar/*    - Calendar events
/api/invoices/*    - Invoice management
/api/kanban/*      - Task management
/api/notifications/* - Notification system
/api/ocr/*         - OCR processing
/api/logs/*        - System logs
/api/menu/*        - Menu management
/api/debug/*       - Debug utilities
```

### Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Performance Architecture

### Caching Strategy
- **Browser Cache**: Static assets caching
- **API Cache**: Response caching for frequent queries
- **Database Cache**: Query result caching
- **CDN**: Content delivery network for static files

### Optimization Techniques
- **Code Splitting**: Route-based splitting
- **Lazy Loading**: Component lazy loading
- **Image Optimization**: Compressed images
- **Bundle Optimization**: Tree shaking and minification
- **Database Indexing**: Optimized query performance

## Monitoring and Logging

### Application Monitoring
- **Error Logging**: Comprehensive error tracking
- **Performance Monitoring**: Response time tracking
- **User Activity**: Action logging
- **System Health**: Resource usage monitoring

### Log Management
- **Structured Logging**: JSON-formatted logs
- **Log Rotation**: Automatic log rotation
- **Log Aggregation**: Centralized log collection
- **Alert System**: Error threshold alerts

## Scalability Architecture

### Horizontal Scaling
- **Load Balancing**: Multiple server instances
- **Database Scaling**: Read replicas
- **CDN Integration**: Global content delivery
- **Microservices**: Service decomposition

### Vertical Scaling
- **Resource Optimization**: CPU and memory tuning
- **Database Optimization**: Query optimization
- **Caching**: Advanced caching strategies
- **Connection Pooling**: Database connection management

## Development Architecture

### Environment Management
- **Local Development**: Local SQLite database
- **Staging Environment**: Production-like testing
- **Production Environment**: Live deployment
- **Configuration Management**: Environment variables

### CI/CD Pipeline
- **Version Control**: Git-based workflow
- **Automated Testing**: Unit and integration tests
- **Build Process**: Automated builds
- **Deployment**: Automated deployment scripts

## Backup and Recovery

### Data Backup
- **Database Backup**: Regular SQLite backups
- **File Backup**: Uploaded files backup
- **Configuration Backup**: System configuration backup
- **Automated Scheduling**: Daily backup schedules

### Disaster Recovery
- **Recovery Procedures**: Step-by-step recovery
- **Data Restoration**: Point-in-time recovery
- **System Restoration**: Complete system recovery
- **Business Continuity**: Service continuity planning

## Integration Architecture

### External Systems
- **Email Integration**: SMTP for notifications
- **OCR Services**: Tesseract.js integration
- **Authentication**: OAuth2 potential integration
- **Payment Systems**: Future payment gateway integration

### API Integrations
- **REST APIs**: External service integration
- **Webhooks**: Real-time notifications
- **File Processing**: Document processing services
- **Monitoring**: External monitoring services

## Deployment Architecture

### Server Configuration
- **Web Server**: Nginx reverse proxy
- **Application Server**: Node.js with PM2
- **Database Server**: SQLite file-based
- **File Server**: Local file system

### Network Architecture
- **Load Balancer**: Nginx load balancing
- **Firewall**: Network security rules
- **SSL Termination**: HTTPS encryption
- **Domain Management**: DNS configuration

## Future Architecture Considerations

### Scalability Enhancements
- **Microservices**: Service decomposition
- **Container Orchestration**: Docker + Kubernetes
- **Cloud Migration**: AWS/Azure migration
- **Database Scaling**: PostgreSQL migration

### Technology Upgrades
- **Real-time Features**: WebSocket integration
- **Progressive Web App**: PWA capabilities
- **Mobile Apps**: React Native development
- **AI Integration**: Machine learning features

### Security Enhancements
- **Multi-factor Authentication**: 2FA implementation
- **Advanced Encryption**: End-to-end encryption
- **Security Auditing**: Regular security audits
- **Compliance**: GDPR/CCPA compliance

---

This system architecture provides a solid foundation for the Orthodox Church Management System while maintaining flexibility for future enhancements and scaling requirements.