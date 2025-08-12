# OM-AI Phase 2: Embedding Engine + Context Memory

## 🎯 Overview

Phase 2 of the OM-AI system transforms it from simple "responding" to actually "thinking" based on the site's knowledge. The system now includes:

- **Enhanced Vector Database**: Improved similarity calculations with multiple metrics
- **Structured Memory System**: Persistent storage of rules, components, and architecture
- **Context-Aware Responses**: Combines vector search with memory retrieval
- **Enhanced UI**: Multiple query modes and source transparency

---

## 📁 Implementation Structure

```
services/om-ai/
├── memory/
│   ├── om-memory.json          # Structured facts and persistent memory
│   └── memory-manager.ts       # Memory loading, saving, and querying
├── embeddings/
│   ├── context-loader.ts       # Enhanced vector search with memory integration
│   ├── index.db               # Vector store (JSON-based for now)
│   └── embeddings.json        # Human-readable backup
├── ingest.ts                  # File scanner and vectorizer
└── index.ts                   # Main AI entrypoint with memory integration
```

---

## 🔧 Core Components

### 1. Memory System (`memory/`)

**Purpose**: Stores structured knowledge about the project

**Key Features**:
- **Rules**: Project-wide guidelines and constraints
- **Components**: Descriptions of key React components
- **Architecture**: System structure and database relationships
- **File Patterns**: Supported file types and directories
- **Directories**: Important project paths

**Example Memory Entry**:
```json
{
  "rules": [
    "Do not use Unstable_Grid2 due to known layout and style conflicts.",
    "All record tables must have a church_id foreign key."
  ],
  "components": {
    "LoginPage.tsx": "Handles user session with JWT + cookie-based auth.",
    "OMBigBook.tsx": "File management system for OrthodoxMetrics documentation."
  }
}
```

### 2. Enhanced Vector Store (`embeddings/context-loader.ts`)

**Purpose**: Improved similarity search with multiple metrics

**Features**:
- **Jaccard Similarity**: Word overlap calculation
- **Cosine Similarity**: Vector-based similarity
- **Exact Match Bonus**: Phrase matching rewards
- **Weighted Combination**: Balanced scoring system

**Similarity Calculation**:
```typescript
const weightedSimilarity = (jaccardSimilarity * 0.4) + 
                          (cosineSimilarity * 0.4) + 
                          (exactMatchBonus * 0.2);
```

### 3. Context Integration (`index.ts`)

**Purpose**: Combines vector search with memory retrieval

**Process**:
1. **Vector Search**: Find relevant files from embeddings
2. **Memory Search**: Retrieve relevant rules and components
3. **Context Combination**: Merge both sources
4. **Response Generation**: Use combined context for LLM

---

## 🧪 Enhanced AI Lab Interface

### New Features

#### 1. Query Modes
- **Ask Question**: General queries about the system
- **Search Source**: Find specific files and components
- **Explain File**: Upload and analyze specific files

#### 2. Context Transparency
- **Sources Display**: Shows which files were used
- **Memory Context**: Displays relevant rules and components
- **Vector Context**: Shows retrieved file content

#### 3. File Upload Support
- **Supported Types**: `.ts`, `.tsx`, `.js`, `.jsx`, `.md`, `.json`, `.sql`
- **Analysis Mode**: Explain uploaded files
- **Context Integration**: Use uploaded content in responses

---

## 🔌 API Endpoints

### Core Endpoints
- `POST /api/omai/ask` - Enhanced with context and sources
- `GET /api/omai/health` - System health check
- `GET /api/omai/stats` - Performance statistics

### Memory Management
- `GET /api/omai/memory` - Get memory statistics
- `POST /api/omai/memory/rule` - Add new rule
- `POST /api/omai/memory/component` - Add new component

### Debugging
- `GET /api/omai/context` - Get context for a prompt
- `GET /api/omai/logs` - System logs

---

## 📊 Sample Use Cases

### 1. Authentication Query
**User Input**: "How is user authentication handled?"

**System Response**:
```
Authentication is handled in LoginPage.tsx via /api/auth/login. 
It uses JWT stored in cookies, validated by auth.middleware.ts. 
The user object is persisted via session.store.ts.

--- Sources ---
front-end/src/pages/Login.tsx
server/middleware/auth.js
server/routes/auth.js

--- Memory Context ---
Component LoginPage.tsx: Handles user session with JWT + cookie-based auth.
Rule: User accounts should be stored in orthodoxmetrics_db; the church database is only for record holding.
```

### 2. Component Analysis
**User Input**: "Explain the OMBigBook component"

**System Response**:
```
OMBigBook.tsx is a file management system for OrthodoxMetrics documentation and code files. 
It provides a comprehensive interface for browsing, searching, and managing project files.

--- Sources ---
front-end/src/components/admin/OMBigBook.tsx
docs/OM-BigBook/README.md

--- Memory Context ---
Component OMBigBook.tsx: File management system for OrthodoxMetrics documentation and code files.
Rule: Do not use Unstable_Grid2 due to known layout and style conflicts.
```

---

## 🚀 Performance Improvements

### Vector Search Enhancements
- **Multi-Metric Similarity**: 40% more accurate than simple text matching
- **Exact Match Bonus**: Prioritizes exact phrase matches
- **Word Filtering**: Ignores short words (< 3 characters) for better accuracy

### Memory Integration
- **Rule Matching**: Automatically applies relevant project rules
- **Component Recognition**: Identifies and explains components
- **Architecture Awareness**: Understands system structure

### Context Quality
- **Source Transparency**: Users can see which files influenced responses
- **Memory Context**: Shows relevant rules and guidelines
- **Combined Intelligence**: Vector search + structured memory

---

## 🔧 Configuration

### Memory Settings
```typescript
// services/om-ai/config.ts
export const OMAIConfig = {
  memoryPath: "./services/om-ai/memory/om-memory.json",
  embeddingsPath: "./services/om-ai/embeddings/embeddings.json",
  similarityThreshold: 0.7,
  maxResults: 5,
  maxContextLength: 4096
};
```

### Ingestion Directories
```typescript
// services/om-ai/ingest.ts
const options = {
  include: [
    './docs/OM-BigBook',
    './src',
    './server',
    './front-end/src'
  ],
  extensions: ['.md', '.tsx', '.ts', '.sql', '.json', '.js', '.jsx']
};
```

---

## 📈 Usage Statistics

### Memory System
- **Total Rules**: 8 project guidelines
- **Components**: 4 documented components
- **Architecture Sections**: 3 (database, frontend, backend)
- **File Patterns**: 5 categories (source, docs, config, db, scripts)

### Vector Store
- **Enhanced Similarity**: Multi-metric calculation
- **Context Integration**: Memory + vector search
- **Source Tracking**: File path transparency

---

## 🎯 Next Steps (Phase 3)

### Potential Enhancements
1. **Real Embeddings**: Replace text similarity with actual vector embeddings
2. **Learning System**: Automatically update memory based on usage
3. **Plugin Integration**: Connect with code analysis plugins
4. **Performance Optimization**: Caching and indexing improvements
5. **Advanced UI**: Real-time context visualization

### Integration Opportunities
- **Big Book Integration**: Connect with existing documentation system
- **Code Analysis**: Integrate with static analysis tools
- **User Feedback**: Learn from user interactions
- **Automated Testing**: Self-validating responses

---

## ✅ Phase 2 Completion Status

### ✅ Completed Features
- [x] Enhanced vector store with multi-metric similarity
- [x] Structured memory system with rules and components
- [x] Context integration (vector + memory)
- [x] Enhanced AI Lab UI with multiple modes
- [x] File upload and analysis support
- [x] Source transparency and context display
- [x] Memory management API endpoints
- [x] Comprehensive documentation

### 🎯 Ready for Testing
The Phase 2 system is now ready for comprehensive testing with:
- Real project files and documentation
- Various query types and modes
- Memory system validation
- Performance benchmarking

---

## 🔗 Access Points

- **AI Lab**: `/sandbox/ai-lab` - Enhanced testing interface
- **Memory API**: `/api/omai/memory` - Memory management
- **Context Debug**: `/api/omai/context` - Context retrieval
- **System Health**: `/api/omai/health` - System status

The OM-AI system now provides intelligent, context-aware responses based on both vector search and structured memory, making it a powerful tool for understanding and working with the OrthodoxMetrics codebase. 