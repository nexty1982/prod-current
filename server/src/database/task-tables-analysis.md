# Task Tables Analysis

## Existing Task-Related Tables in orthodoxmetrics_db

### 1. `ai_tasks` (Main AI Agent Tasks Table)
**Purpose:** Central table for managing AI agent tasks (Ninja, Claude, Cursor, OM-AI, etc.)

**Current Structure:**
- `id` (varchar(100), PK)
- `title` (varchar(255), required)
- `description` (text, nullable)
- `assigned_to` (varchar(100), nullable)
- `status` (enum: 'pending','in_progress','completed','blocked', default: 'pending')
- `due_date` (date, **required**)
- `start_date` (date, nullable)
- `tags` (JSON, nullable)
- `linked_kanban_id` (varchar(100), nullable)
- `agent` (enum: 'Ninja','Claude','Cursor','OM-AI','Junie','GitHub Copilot', **required**)
- `priority` (enum: 'low','medium','high','critical', default: 'medium')
- `estimated_hours` (decimal(5,2), nullable)
- `actual_hours` (decimal(5,2), nullable)
- `logs` (JSON, nullable)
- `metadata` (JSON, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Relationships:**
- Referenced by: `task_activity_log`, `task_files`, `task_notifications`, `task_reports`, `chatgpt_sessions`
- References: `ai_agents` (via `agent` field)

**Issues for OM Tasks:**
- ❌ `agent` field is **required** - we don't need this
- ❌ `due_date` is **required** - we don't have this
- ❌ Status enum doesn't match our 1-6 system
- ❌ Missing: `type` (documentation/configuration/reference/guide)
- ❌ Missing: `visibility` (admin/public)
- ❌ Missing: `category` (ingestion-digitization, etc.)
- ❌ Missing: `importance` (we have `priority` but need separate `importance`)
- ❌ Missing: `revisions` (JSON)
- ❌ Missing: `date_created`, `date_completed` (we have `created_at` but need `date_created` format)
- ❌ Missing: `assigned_by`, `notes`, `remind_me`
- ✅ Has: `tags` (JSON), `metadata` (JSON) - can store attachments/revisions in metadata

### 2. `task_activity_log`
**Purpose:** Logs all activities performed on tasks

**Structure:**
- `id` (varchar(100), PK)
- `task_id` (varchar(100), FK → `ai_tasks.id`)
- `user_id` (varchar(100))
- `action` (varchar(100))
- `details` (JSON, nullable)
- `timestamp` (timestamp)

**Can we use it?** ✅ YES - Can log OM task activities if we use `ai_tasks` or create separate table

### 3. `task_files`
**Purpose:** Stores file metadata for tasks

**Structure:**
- `id` (varchar(100), PK)
- `task_id` (varchar(100), FK → `ai_tasks.id`)
- `filename`, `original_name`, `type`, `size`, `url`
- `uploaded_by`, `uploaded_at`
- `metadata` (JSON)

**Can we use it?** ✅ YES - Can store OM task attachments if we use `ai_tasks`

### 4. `task_notifications`
**Purpose:** Stores notifications related to tasks

**Structure:**
- `id` (varchar(100), PK)
- `task_id` (varchar(100), FK → `ai_tasks.id`)
- `type`, `message`, `timestamp`, `read`, `priority`, `metadata` (JSON)

**Can we use it?** ✅ YES - Can store OM task notifications if we use `ai_tasks`

### 5. `task_reports`
**Purpose:** Stores reports generated for tasks

**Structure:**
- `id` (varchar(100), PK)
- `task_id` (varchar(100), FK → `ai_tasks.id`)
- `format`, `filename`, `url`, `generated_at`, `generated_by`, `content`, `metadata` (JSON)

**Can we use it?** ✅ YES - Can store OM task reports if we use `ai_tasks`

### 6. `task_submissions` (Separate System)
**Purpose:** Stores task submissions from the task assignment link system

**Structure:**
- `id` (int, PK)
- `task_link_id` (int, FK → `task_links.id`)
- `email`, `tasks_json`, `submitted_at`
- `sent_to_nick`, `sent_at`, `status`, `processed_at`, `notes`, `submission_type`

**Relationship:** Part of task assignment system, NOT related to `ai_tasks`

### 7. `task_links` (Separate System)
**Purpose:** Manages task assignment links/tokens

**Structure:**
- `id` (int, PK)
- `email`, `token`, `created_at`, `expires_at`
- `is_used`, `used_at`, `created_by`, `notes`, `status`, `ip_address`, `user_agent`

**Relationship:** Part of task assignment system, NOT related to `ai_tasks`

## Recommendation

### Option 1: Extend `ai_tasks` Table (NOT RECOMMENDED)
**Pros:**
- Reuse existing infrastructure (activity logs, files, notifications, reports)
- Single source of truth for all tasks

**Cons:**
- `agent` field is required - would need to make nullable or use dummy value
- `due_date` is required - would need to provide default
- Status enum mismatch - would need to extend enum or use metadata
- Many missing fields - would need extensive ALTER TABLE
- Mixing AI agent tasks with OM documentation tasks (different purposes)
- Risk of breaking existing AI task functionality

### Option 2: Create Separate `om_tasks` Table (RECOMMENDED)
**Pros:**
- Clean separation of concerns (AI agent tasks vs OM documentation tasks)
- No risk of breaking existing `ai_tasks` functionality
- Can design schema specifically for OM Tasks requirements
- Can reuse `task_activity_log`, `task_files`, `task_notifications` by:
  - Making `task_id` flexible (varchar that can reference either table)
  - OR creating separate tables: `om_task_activity_log`, `om_task_files`, etc.

**Cons:**
- Need to create new table
- May duplicate some infrastructure

### Option 3: Hybrid Approach
- Create `om_tasks` table for OM-specific tasks
- Reuse `task_activity_log`, `task_files`, `task_notifications` by:
  - Using a naming convention: `om_task_<id>` for OM tasks
  - OR making `task_id` reference a union/join table
  - OR storing task type in metadata

## Final Recommendation: **Option 2 - Separate `om_tasks` Table**

**Rationale:**
1. `ai_tasks` is specifically designed for AI agent workflow management
2. OM Tasks have different requirements (type, visibility, category, revisions)
3. Clean separation prevents conflicts
4. Can still reuse supporting tables with proper design

**Implementation:**
- Create `om_tasks` table as designed
- Optionally create `om_task_activity_log` if we want separate logging
- Or extend `task_activity_log` to support both by adding `task_type` field

