# OM Specification Documentation - Enhancement Readiness Assessment

**Analysis Date:** 2026-01-24  
**Status:** ⚠️ **FEATURE NOT FOUND - ASSESSMENT BASED ON EXPECTED STRUCTURE**

## Executive Summary

The `/church/om-spec` route and all related components **do not currently exist** in the codebase. This assessment provides guidance on how to enhance the feature once it is located or implemented, specifically for supporting:

1. **Canonical doc paths** (prod/docs as source of truth)
2. **Complete append-only changelog** (engineering activity log)
3. **Guardrails** to prevent doc sprawl and misplacement
4. **Full repo documentation audit and migration workflow**

---

## Current State Summary

### What Was Searched
- ✅ Router configuration (`Router.tsx` - 1,498 lines)
- ✅ Menu configuration (`MenuItems.ts` - 513 lines)
- ✅ Frontend components (views/, pages/, components/)
- ✅ Backend routes (89+ route files)
- ✅ Database schemas (50+ SQL files)
- ✅ Hooks and services

### What Was Found
- ❌ No `/church/om-spec` route
- ❌ No om-spec components
- ❌ No om-spec API endpoints
- ❌ No om-spec database schema
- ❌ No om-spec menu item

### Similar Features Found
- ✅ Kanban task management (`prod/front-end/src/components/apps/kanban/`)
- ✅ Assign Task page (`prod/front-end/src/pages/AssignTaskPage.tsx`)
- ✅ Records management (`prod/front-end/src/views/records/`)

---

## Enhancement Readiness Assessment

### ⚠️ **CRITICAL: Feature Must Be Located or Implemented First**

Before any enhancement work can begin, the feature must either:
1. Be located in the codebase (may be under different name/path)
2. Be implemented from scratch based on requirements

---

## Enhancement Areas (Once Feature Exists)

### 1. Canonical Doc Paths (prod/docs as Source of Truth)

#### What's Easy to Extend
- ✅ **File Path Field:** Add a `docPath` field to the task/documentation model
  - **Location:** Database schema + TypeScript interface
  - **Complexity:** Low - simple string field addition
  - **Risk:** Low - no breaking changes

- ✅ **Path Validation:** Add validation to ensure paths start with `prod/docs/`
  - **Location:** Backend controller validation
  - **Complexity:** Low - regex or string validation
  - **Risk:** Low - can be added incrementally

- ✅ **Path Display:** Show canonical path in UI
  - **Location:** TaskDetailsDrawer component
  - **Complexity:** Low - add field to display
  - **Risk:** Low - display-only change

#### What's Risky/Tangled
- ⚠️ **Existing Data Migration:** If feature already has tasks without paths
  - **Risk:** Medium - requires migration script
  - **Mitigation:** Make field optional initially, then migrate

- ⚠️ **Path Synchronization:** Ensuring UI paths match filesystem
  - **Risk:** Medium - requires file system checks
  - **Mitigation:** Add validation endpoint that checks file existence

- ⚠️ **Path Updates:** Handling path changes when files move
  - **Risk:** Medium - requires tracking file moves
  - **Mitigation:** Use file watchers or manual update workflow

#### Smallest Safe Next Step
1. **Add `docPath` field to database schema** (nullable initially)
2. **Add `docPath` to TypeScript interface**
3. **Add `docPath` input field to EditTaskModal**
4. **Add validation: path must start with `prod/docs/`**
5. **Display `docPath` in TaskDetailsDrawer**

**Estimated Effort:** 2-4 hours

---

### 2. Complete Append-Only Changelog (Engineering Activity Log)

#### What's Easy to Extend
- ✅ **Revision Table Already Expected:** The requirements mention revisions
  - **Location:** `om_spec_revisions` table (expected)
  - **Complexity:** Low - table structure likely supports this
  - **Risk:** Low - revisions are append-only by design

- ✅ **Activity Log Endpoint:** Add endpoint to fetch all revisions
  - **Location:** `GET /api/church/om-spec/revisions` (expected)
  - **Complexity:** Low - simple query expansion
  - **Risk:** Low - read-only operation

- ✅ **Changelog View:** Add UI component to display full changelog
  - **Location:** New component or expand RevisionsSection
  - **Complexity:** Medium - UI component creation
  - **Risk:** Low - display-only feature

#### What's Risky/Tangled
- ⚠️ **Performance with Large History:** If changelog grows very large
  - **Risk:** Medium - pagination required
  - **Mitigation:** Implement cursor-based pagination

- ⚠️ **Revision Content Size:** Storing full content in each revision
  - **Risk:** Medium - database bloat
  - **Mitigation:** Store diffs instead of full content, or archive old revisions

- ⚠️ **Cross-Reference Linking:** Linking revisions to commits/PRs
  - **Risk:** Medium - requires Git integration
  - **Mitigation:** Start with manual linking, automate later

#### Smallest Safe Next Step
1. **Verify revision table supports append-only** (no DELETE allowed)
2. **Add `activityType` field** (create, update, delete, etc.)
3. **Add `metadata` JSON field** (for commit hash, PR number, etc.)
4. **Create changelog view component** (list all revisions across all tasks)
5. **Add filtering** (by user, date range, activity type)

**Estimated Effort:** 4-8 hours

---

### 3. Guardrails to Prevent Doc Sprawl and Misplacement

#### What's Easy to Extend
- ✅ **Category Validation:** Enforce allowed categories
  - **Location:** Backend validation + frontend dropdown
  - **Complexity:** Low - enum or allowed list
  - **Risk:** Low - validation only

- ✅ **Path Pattern Validation:** Ensure paths follow structure
  - **Location:** Backend validation
  - **Complexity:** Low - regex validation
  - **Risk:** Low - validation only

- ✅ **Required Fields:** Make key fields required
  - **Location:** Database schema + form validation
  - **Complexity:** Low - schema change
  - **Risk:** Low - can be done incrementally

#### What's Risky/Tangled
- ⚠️ **Existing Invalid Data:** If feature already has misplaced docs
  - **Risk:** High - requires cleanup/migration
  - **Mitigation:** Add validation but don't enforce on existing data initially

- ⚠️ **Path Structure Changes:** If canonical path structure changes
  - **Risk:** Medium - requires migration
  - **Mitigation:** Version the path structure, support multiple patterns

- ⚠️ **Permission Complexity:** Who can override guardrails
  - **Risk:** Medium - requires permission system
  - **Mitigation:** Admin-only override, log all overrides

#### Smallest Safe Next Step
1. **Define allowed categories** (enum or config file)
2. **Add category validation** (backend + frontend)
3. **Add path pattern validation** (`prod/docs/**/*.md`)
4. **Add warning UI** (show validation errors before save)
5. **Add admin override** (allow admins to bypass for edge cases)

**Estimated Effort:** 4-6 hours

---

### 4. Full Repo Documentation Audit and Migration Workflow

#### What's Easy to Extend
- ✅ **Bulk Import Endpoint:** Add endpoint to import multiple docs
  - **Location:** `POST /api/church/om-spec/bulk-import`
  - **Complexity:** Medium - batch processing
  - **Risk:** Low - can be admin-only

- ✅ **Audit Report Endpoint:** Generate audit report of all docs
  - **Location:** `GET /api/church/om-spec/audit`
  - **Complexity:** Medium - query + report generation
  - **Risk:** Low - read-only operation

- ✅ **Migration Status Tracking:** Track migration progress
  - **Location:** Add `migrationStatus` field to tasks
  - **Complexity:** Low - enum field
  - **Risk:** Low - metadata only

#### What's Risky/Tangled
- ⚠️ **File System Scanning:** Scanning entire repo for docs
  - **Risk:** High - performance, permissions, large repos
  - **Mitigation:** Use Git API, cache results, background jobs

- ⚠️ **Duplicate Detection:** Finding duplicate docs
  - **Risk:** Medium - content similarity detection
  - **Mitigation:** Start with filename/path matching, add content hashing later

- ⚠️ **Migration Rollback:** Undoing migration if issues found
  - **Risk:** High - data integrity
  - **Mitigation:** Dry-run mode, backup before migration, staged rollout

- ⚠️ **Cross-Reference Updates:** Updating links when docs move
  - **Risk:** High - requires parsing markdown, finding references
  - **Mitigation:** Start with manual updates, automate incrementally

#### Smallest Safe Next Step
1. **Create audit endpoint** (list all docs in repo vs. database)
2. **Add migration status field** (pending, in-progress, migrated, skipped)
3. **Create bulk import UI** (admin page for migration)
4. **Add dry-run mode** (preview changes before applying)
5. **Add migration log** (track what was migrated when)

**Estimated Effort:** 16-24 hours

---

## Overall Enhancement Strategy

### Phase 1: Foundation (Week 1)
1. ✅ Locate or implement basic `/church/om-spec` feature
2. ✅ Add `docPath` field (nullable)
3. ✅ Verify revision system supports append-only
4. ✅ Add basic validation (categories, path patterns)

**Estimated Effort:** 1-2 weeks (if implementing from scratch)

### Phase 2: Canonical Paths (Week 2)
1. ✅ Enforce `prod/docs/` path prefix
2. ✅ Add path validation
3. ✅ Display paths in UI
4. ✅ Add path update workflow

**Estimated Effort:** 1 week

### Phase 3: Changelog Enhancement (Week 3)
1. ✅ Enhance revision system with activity types
2. ✅ Create changelog view
3. ✅ Add filtering and search
4. ✅ Link to Git commits/PRs (optional)

**Estimated Effort:** 1 week

### Phase 4: Guardrails (Week 4)
1. ✅ Implement category validation
2. ✅ Implement path pattern validation
3. ✅ Add admin override mechanism
4. ✅ Add validation warnings in UI

**Estimated Effort:** 1 week

### Phase 5: Audit & Migration (Week 5-6)
1. ✅ Create audit endpoint
2. ✅ Build migration UI
3. ✅ Implement bulk import
4. ✅ Add migration tracking
5. ✅ Test with sample data

**Estimated Effort:** 2 weeks

---

## Risk Assessment Summary

### Low Risk Enhancements ✅
- Adding `docPath` field
- Displaying canonical paths
- Adding validation rules
- Creating changelog view
- Adding activity types to revisions

### Medium Risk Enhancements ⚠️
- Path synchronization with filesystem
- Performance optimization for large changelogs
- Bulk import functionality
- Migration status tracking

### High Risk Enhancements 🔴
- File system scanning for audit
- Duplicate detection
- Migration rollback
- Cross-reference updates

---

## Dependencies & Prerequisites

### Must Have Before Enhancement
1. ✅ Feature must exist (located or implemented)
2. ✅ Database schema must be created
3. ✅ Basic CRUD operations must work
4. ✅ Authentication/authorization must be in place

### Nice to Have
1. ✅ Git integration (for commit/PR linking)
2. ✅ File system access (for path validation)
3. ✅ Background job system (for bulk operations)
4. ✅ Search/indexing (for duplicate detection)

---

## Testing Strategy

### Unit Tests
- ✅ Path validation logic
- ✅ Category validation
- ✅ Revision append-only enforcement
- ✅ Migration status updates

### Integration Tests
- ✅ Bulk import workflow
- ✅ Audit report generation
- ✅ Path synchronization
- ✅ Permission checks

### Manual Testing
- ✅ End-to-end migration workflow
- ✅ Guardrail enforcement
- ✅ Changelog display
- ✅ Error handling

---

## Documentation Requirements

### Must Document
1. ✅ Canonical path structure (`prod/docs/**/*.md`)
2. ✅ Category definitions and allowed values
3. ✅ Migration workflow and procedures
4. ✅ Guardrail rules and overrides
5. ✅ Changelog format and activity types

### Should Document
1. ✅ API endpoints for bulk operations
2. ✅ Database schema changes
3. ✅ Permission requirements
4. ✅ Troubleshooting guide

---

## Conclusion

**Current Status:** ⚠️ **Cannot proceed with enhancements until feature is located or implemented**

**Next Steps:**
1. **Immediate:** Verify if feature exists under different name/path
2. **If Found:** Update analysis documents with actual implementation details
3. **If Not Found:** Implement basic feature first, then proceed with enhancements
4. **Enhancement Order:** Follow Phase 1-5 strategy above

**Estimated Total Enhancement Effort:** 6-8 weeks (including feature implementation if needed)

**Key Success Factors:**
- Start with smallest safe steps
- Test incrementally
- Document as you go
- Maintain backward compatibility where possible
