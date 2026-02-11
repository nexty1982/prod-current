# 🧠 OMAI Agent Webhook Interface Guide

## Overview

The OMAI Agent Webhook Interface enables AI agents (Claude, Cursor, Copilot, etc.) to send structured or unstructured output directly to OMAI for long-term memory storage and knowledge aggregation.

## 🎯 Purpose

- **Centralized Knowledge**: All AI agent insights are stored in one place
- **Cross-Agent Learning**: Agents can benefit from each other's discoveries
- **Historical Context**: Build up institutional knowledge over time
- **Automated Ingestion**: No manual intervention required for knowledge capture

---

## 📡 Webhook Endpoint

**URL:** `POST http://localhost:3001/api/omai/ingest-agent-output`

**Content-Type:** `application/json`

---

## 📋 Request Format

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `agent` | string | Name of the AI agent (e.g., "Claude", "Cursor", "Copilot") |
| `output` | string | The content/knowledge to be stored |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `source` | string | null | Module or context where output originated |
| `tags` | array | [] | Array of strings for categorization |
| `importance` | enum | "normal" | Priority level: "low", "normal", "high" |
| `metadata` | object | {} | Additional structured data |
| `context_type` | string | "general" | Category (auto-detected if not provided) |

### Context Types

OMAI automatically detects context types, but you can override:

- `general` - Default category
- `infrastructure` - Server, database, deployment related
- `metrics` - Analytics, performance, monitoring
- `theology` - Orthodox-specific content
- `staff_note` - Team communications, notes
- `client_info` - Church or user related information

---

## 🔨 Usage Examples

### Basic Agent Report

```bash
curl -X POST http://localhost:3001/api/omai/ingest-agent-output \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "Claude",
    "source": "code-review",
    "output": "Reviewed user authentication module. Code quality is excellent with proper error handling and security practices."
  }'
```

### High Priority Security Finding

```bash
curl -X POST http://localhost:3001/api/omai/ingest-agent-output \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "Cursor",
    "source": "security-scan",
    "output": "CRITICAL: Found SQL injection vulnerability in user profile update function. Line 245 in userController.js uses unsanitized input.",
    "tags": ["security", "sql-injection", "critical"],
    "importance": "high",
    "metadata": {
      "file": "server/controllers/userController.js",
      "line": 245,
      "severity": "critical",
      "confidence": 0.95
    },
    "context_type": "infrastructure"
  }'
```

### Performance Analysis

```bash
curl -X POST http://localhost:3001/api/omai/ingest-agent-output \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "Copilot",
    "source": "performance-analysis",
    "output": "Database query optimization completed. Reduced average response time from 2.3s to 0.4s by adding composite index on (church_id, date_created).",
    "tags": ["performance", "database", "optimization"],
    "importance": "normal",
    "metadata": {
      "old_response_time": "2.3s",
      "new_response_time": "0.4s",
      "improvement": "82%",
      "table": "baptism_records"
    },
    "context_type": "metrics"
  }'
```

### Documentation Update

```bash
curl -X POST http://localhost:3001/api/omai/ingest-agent-output \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "Claude",
    "source": "documentation",
    "output": "Updated API documentation for /api/admin/users endpoint. Added examples for bulk user operations and clarified authentication requirements.",
    "tags": ["documentation", "api", "admin"],
    "importance": "low",
    "context_type": "general"
  }'
```

---

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "status": "stored",
  "message": "Agent output successfully ingested into OMAI memory",
  "ingested": {
    "agent": "Claude",
    "source": "code-review",
    "context_type": "infrastructure",
    "importance": "normal",
    "tags": ["security", "review"],
    "method": "webhook"
  },
  "timestamp": "2025-07-25T23:49:02.077Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Missing required fields: agent and output are required",
  "required": ["agent", "output"],
  "received": ["source", "tags"]
}
```

---

## 🔍 Memory Retrieval

Retrieve stored memories with agent filtering:

```bash
# Get all memories from Claude
curl "http://localhost:3001/api/omai/memories?source_agent=Claude"

# Get high importance memories
curl "http://localhost:3001/api/omai/memories?importance=high"

# Get webhook-ingested memories
curl "http://localhost:3001/api/omai/memories?ingestion_method=webhook"

# Search across agent outputs
curl "http://localhost:3001/api/omai/memories?search=security"
```

---

## 🎨 Frontend Integration

The AI Lab interface automatically displays agent-ingested memories with:

- **Agent badges** showing the source AI agent
- **Importance indicators** for priority levels
- **Filterable views** by agent, importance, and tags
- **Metadata display** for structured agent data

---

## 🚀 Integration Patterns

### Automated Code Review

```javascript
// Example: Post-commit hook integration
const reviewResult = await analyzeCode(changedFiles);

await fetch('http://localhost:3001/api/omai/ingest-agent-output', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent: 'Cursor',
    source: 'post-commit-review',
    output: `Code review for commit ${commitHash}: ${reviewResult.summary}`,
    tags: ['code-review', 'automated', commitHash],
    importance: reviewResult.hasIssues ? 'high' : 'normal',
    metadata: {
      commit: commitHash,
      files: changedFiles,
      issues: reviewResult.issues
    }
  })
});
```

### Performance Monitoring

```javascript
// Example: Scheduled performance check
const performanceData = await gatherMetrics();

await fetch('http://localhost:3001/api/omai/ingest-agent-output', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent: 'System Monitor',
    source: 'daily-health-check',
    output: `System health report: ${performanceData.status}. Average response time: ${performanceData.avgResponseTime}ms.`,
    tags: ['health-check', 'performance', 'automated'],
    importance: performanceData.status === 'degraded' ? 'high' : 'normal',
    metadata: performanceData,
    context_type: 'metrics'
  })
});
```

---

## 🔐 Security Considerations

- **Network Access**: Webhook is currently accessible on the local network
- **Authentication**: No authentication required (planned for future)
- **Rate Limiting**: No rate limiting implemented (planned for future)
- **Input Validation**: All inputs are sanitized and validated
- **Data Storage**: All agent data is stored in the secure OMAI database

---

## 📈 Future Enhancements

1. **Authentication Tokens**: Per-agent API keys for secure access
2. **Rate Limiting**: Prevent spam and abuse
3. **Webhooks Out**: OMAI can notify agents of important events
4. **Agent Coordination**: Agents can query each other's findings
5. **Automated Summarization**: AI-powered knowledge synthesis
6. **Vector Indexing**: Advanced semantic search across agent memories

---

## 🆘 Troubleshooting

### Common Issues

**Error: "Missing required fields"**
- Ensure both `agent` and `output` fields are provided
- Check that `output` is not empty

**Error: "Invalid importance level"**
- Use only: "low", "normal", or "high"

**Connection Refused**
- Verify OMAI backend is running on port 3001
- Check network connectivity

### Testing the Webhook

Run the setup script to test all functionality:

```bash
# In Linux environment
./scripts/setup-agent-webhook.sh
```

### Support

For issues or questions about the OMAI Agent Webhook Interface:

1. Check the backend logs: `pm2 logs orthodox-backend`
2. Verify OMAI health: `curl http://localhost:3001/api/omai/health`
3. Review ingested memories in the AI Lab interface

---

*This documentation covers OMAI Agent Webhook Interface v1.0. Last updated: 2025-07-25* 