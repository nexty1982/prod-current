# Public Task Assignment API Documentation

## Overview

The Public Task Assignment API allows unauthenticated users to submit tasks securely via tokenized URLs. This system provides a secure, rate-limited, and user-friendly way for external users to submit tasks without requiring authentication.

## 🔐 Security Features

- **Secure Token Generation**: Uses `crypto.randomBytes(16)` for cryptographically secure tokens
- **Rate Limiting**: Maximum 5 tokens per IP address per hour
- **Token Expiration**: Default 24-hour expiration (configurable)
- **Content Sanitization**: Removes malicious HTML, scripts, and suspicious patterns
- **One-Time Use**: Tokens are invalidated after first use
- **IP Tracking**: All requests are logged with IP addresses for security monitoring

## 📋 API Endpoints

### 1. Generate Task Link

**POST** `/api/omai/task-link`

Creates a new access token and returns a signed link.

#### Request Body
```json
{
  "expiresInMinutes": 1440,
  "meta": {
    "source": "external-form",
    "purpose": "bug-report"
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "Task assignment link generated successfully",
  "data": {
    "link": "https://orthodoxmetrics.com/task?t=abcd1234567890ef",
    "token": "abcd1234567890ef",
    "expiresAt": "2025-08-22T16:50:12.474Z"
  }
}
```

#### Rate Limiting
- **Limit**: 5 tokens per IP address per hour
- **Response**: 429 Too Many Requests with `retryAfter: 3600`

### 2. Validate Token

**GET** `/api/omai/validate-token?t={token}`

Validates a task assignment token and returns its status.

#### Query Parameters
- `t` (required): The token to validate

#### Response (Valid Token)
```json
{
  "success": true,
  "valid": true,
  "meta": {
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2025-08-21T16:50:12.474Z"
  },
  "expiresAt": "2025-08-22T16:50:12.474Z"
}
```

#### Response (Invalid/Expired Token)
```json
{
  "success": false,
  "valid": false,
  "error": "Token expired"
}
```

### 3. Submit Tasks

**POST** `/api/omai/submit-task`

Submits tasks using a valid token.

#### Request Body
```json
{
  "token": "abcd1234567890ef",
  "tasks": [
    {
      "title": "Fix login bug",
      "description": "Users cannot log in with valid credentials",
      "priority": "high"
    },
    {
      "title": "Update documentation",
      "description": "API docs are outdated",
      "priority": "medium"
    }
  ]
}
```

#### Task Object Structure
- **title** (required): Task title (max 200 characters)
- **description** (optional): Task description (max 1000 characters)
- **priority** (optional): Priority level - `🔥`, `⚠️`, `🧊`, `high`, `medium`, `low`

#### Response
```json
{
  "success": true,
  "message": "Successfully submitted 2 task(s)",
  "data": {
    "submission_id": 123,
    "task_count": 2,
    "task_stats": {
      "totalTasks": 2,
      "priorityBreakdown": {
        "🔥": 1,
        "⚠️": 1,
        "🧊": 0
      },
      "averageTitleLength": 12,
      "tasksWithDescriptions": 2,
      "descriptionPercentage": 100
    },
    "submitted_at": "2025-08-21T16:50:12.474Z",
    "token_used": true
  }
}
```

## 🛡️ Content Security

### Blocked Patterns
- HTML tags: `<script>`, `<iframe>`, `<object>`, `<embed>`
- JavaScript protocols: `javascript:`, `vbscript:`
- Event handlers: `onclick`, `onload`, etc.
- Data URLs: `data:text/html`
- Suspicious file extensions: `.exe`, `.bat`, `.cmd`, `.com`, `.pif`, `.scr`, `.vbs`, `.js`, `.jar`, `.msi`

### Sanitization Rules
- Maximum 10 tasks per submission
- Maximum 200 characters per title
- Maximum 1000 characters per description
- HTML tags are stripped
- Control characters are removed
- Excessive special characters (>30%) are flagged as suspicious

## 🔧 Admin Endpoints

### Delete Public Token

**DELETE** `/api/omai/public-token/{token}`

Deletes a public task token (admin/superadmin only).

#### Response
```json
{
  "success": true,
  "message": "Public task token deleted successfully",
  "data": {
    "token": "abcd1234...",
    "deleted_at": "2025-08-21T16:50:12.474Z"
  }
}
```

### Get Public Token Statistics

**GET** `/api/omai/public-tokens`

Returns statistics about public tokens (admin/superadmin only).

#### Response
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total": 15,
      "active": 8,
      "expired": 5,
      "used": 2,
      "rateLimitEntries": 12
    },
    "active_tokens": [
      {
        "token": "abcd1234...",
        "expiresAt": "2025-08-22T16:50:12.474Z",
        "meta": {
          "ip": "192.168.1.1",
          "source": "external-form"
        },
        "submissions": 0
      }
    ]
  }
}
```

## 📊 Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Token is required"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "valid": false,
  "error": "Token expired"
}
```

#### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later.",
  "retryAfter": 3600
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to generate task assignment link",
  "details": "Database connection failed"
}
```

## 🚀 Usage Examples

### Frontend Integration

```javascript
// Generate a task link
const response = await fetch('/api/omai/task-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    expiresInMinutes: 1440,
    meta: { source: 'contact-form' }
  })
});

const { data } = await response.json();
const taskUrl = data.link;

// Share the URL with users
console.log(`Share this link: ${taskUrl}`);
```

### Token Validation

```javascript
// Extract token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('t');

if (token) {
  // Validate token before showing form
  const validateResponse = await fetch(`/api/omai/validate-token?t=${token}`);
  const validation = await validateResponse.json();
  
  if (validation.valid) {
    showTaskForm(token);
  } else {
    showExpiredMessage(validation.error);
  }
}
```

### Task Submission

```javascript
// Submit tasks
const submitResponse = await fetch('/api/omai/submit-task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: token,
    tasks: [
      {
        title: 'Bug Report',
        description: 'Application crashes on startup',
        priority: 'high'
      }
    ]
  })
});

const result = await submitResponse.json();
if (result.success) {
  showSuccessMessage(result.message);
} else {
  showErrorMessage(result.error);
}
```

## 🔍 Monitoring and Logging

### Logged Information
- Token creation and usage
- IP addresses and user agents
- Task submission statistics
- Rate limiting violations
- Security incidents

### Database Storage
- Tasks are stored in `task_submissions` table
- Public submissions use `task_link_id = 0` and `email = 'public-submission'`
- All submissions include validation timestamps and sanitized content

## 🚨 Security Considerations

### Best Practices
1. **Token Sharing**: Share tokens via secure channels only
2. **Expiration**: Use short expiration times for sensitive tasks
3. **Monitoring**: Regularly review token usage and submissions
4. **Rate Limiting**: Monitor for abuse patterns
5. **Content Validation**: Always validate and sanitize user input

### Risk Mitigation
- Tokens are single-use only
- IP-based rate limiting prevents abuse
- Content sanitization prevents XSS attacks
- Automatic cleanup of expired tokens
- Comprehensive logging for audit trails

## 📝 Configuration

### Environment Variables
- `FRONTEND_URL`: Base URL for task assignment links
- `NODE_ENV`: Environment mode (affects error detail exposure)

### Default Settings
- Token expiration: 24 hours (1440 minutes)
- Rate limit: 5 tokens per IP per hour
- Maximum tasks per submission: 10
- Maximum title length: 200 characters
- Maximum description length: 1000 characters

## 🔄 Future Enhancements

### Planned Features
- Redis integration for token storage
- Webhook notifications for task submissions
- Advanced analytics and reporting
- Integration with project management systems
- Bulk token generation for organizations

### Customization Options
- Configurable rate limits per endpoint
- Custom token expiration policies
- Advanced content filtering rules
- Multi-language support
- Custom validation schemas
