# OrthodoxMetrics AI Operations Manual

This document defines how AI prompts are used to perform development work within OrthodoxMetrics.

It ensures that prompts remain structured, traceable, and integrated with the OM Daily workflow and SDLC pipeline.

---

# Prompt Types

All prompts must fall into one of the following categories.

| Type | Purpose |
|-----|------|
| audit | analyze current system before changes |
| design | architecture planning |
| implement | build new feature |
| upgrade | improve existing feature |
| fix | bug fix |
| refactor | internal cleanup |
| hardening | production safety checks |
| validation | testing / verification |

---

# Prompt Execution Rules

1. Every implementation prompt creates an OM Daily work item.
2. Prompts do NOT automatically create change sets.
3. Change sets are created only when work items are ready for staging.
4. All prompts must begin with current state analysis.
5. All prompts must return modified files and testing steps.

---

# Feature Implementation Flow

Standard feature workflow:

1. audit
2. architecture design
3. implementation
4. polish
5. hardening
6. validation

---

# Prompt Plan System

Complex work should use prompt plans.

Prompt plans consist of ordered prompts executed sequentially.

Example:

Records System Upgrade

1. AG Grid fallback architecture
2. Multi-view records implementation
3. Church header customization
4. Records analytics
5. UX polish
6. Hardening

---

# AI Agent Requirements

AI agents working on OrthodoxMetrics must follow these rules:

- Always analyze before implementing.
- Never modify database schema without documenting migrations.
- Do not duplicate logic between components.
- Prefer backend correctness over frontend shortcuts.
- Maintain tenant safety and isolation.
- Ensure production-grade quality.

---

# Work Item Integration

AI prompts automatically create OM Daily work items when executed through the AI workflow.

Each work item should include:

- title
- summary
- prompt text
- agent tool used
- category
- priority
- status

---

# Change Set Integration

Change sets are not created by prompts automatically.

They are created when work items are grouped for deployment and staging.

---

# Testing Requirements

All implementation prompts must include:

- verification steps
- expected behavior
- edge cases
- rollback considerations
