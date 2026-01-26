# OrthodoxMetrics Engineering Activity Log (Append-Only)

## 2026-01-24
- Area: repo
  Summary: Normalized repository layout by removing phantom prod/* tracked paths; restored canonical docs tracking; tightened ignore rules.
  Rationale: Git index and working tree were misaligned; tooling (cloc) and audits were failing.
  Risk/Impact: Low runtime impact; high repo hygiene impact.
  Follow-ups: Add CI guardrails for docs placement and forbid prod/* reintroduction.
