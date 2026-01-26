# OrthodoxMetrics Documentation

**Last Updated:** 2026-01-24  
**Purpose:** Centralized documentation repository for OrthodoxMetrics project

---

## Documentation Structure

```
docs/
├── FEATURES/          # Feature documentation and analysis
├── REFERENCE/         # Reference documentation (APIs, schemas, mappings)
├── OPERATIONS/        # Operations guides and procedures
├── ARCHIVE/           # Archived/dated documentation
├── DEVELOPMENT/       # Development guidelines and rules
└── assets/            # Documentation assets (images, diagrams)
```

---

## Quick Links

### Development Guidelines
- **[Documentation Rules](DEVELOPMENT/documentation_rules.md)** - Rules for where documentation should live
- **[Guardrails Script](../scripts/check-docs-location.sh)** - Pre-commit hook to enforce rules

### Recent Analysis
- **[Top-Level Conflicts Deep Audit](REFERENCE/top_level_conflicts_deep_audit.md)** - Comprehensive analysis of directory conflicts
- **[Root-Level Conflicts Summary](REFERENCE/root_level_conflicts_summary.md)** - Summary of conflicts found

### Feature Documentation
- **[OM Spec Current State](FEATURES/om-spec_current-state.md)** - Analysis of `/church/om-spec` feature
- **[OM Spec Enhancement Readiness](FEATURES/om-spec_enhancement-readiness.md)** - Enhancement assessment

---

## Documentation Rules

**IMPORTANT:** All `.md` and `.txt` documentation files must live under `docs/` except:
- Root `README.md`
- Package boundary READMEs (e.g., `server/README.md`, `front-end/README.md`)

See [DEVELOPMENT/documentation_rules.md](DEVELOPMENT/documentation_rules.md) for full rules and enforcement.

---

## Archive

Dated documentation is stored in `ARCHIVE/` with `YYYY-MM-DD-` prefix:
- `ARCHIVE/2024-12-08-dark-mode-issues.md`
- `ARCHIVE/2024-12-19-records-routes-analysis.md`

---

## Contributing

When adding new documentation:
1. Choose appropriate subdirectory (`FEATURES/`, `REFERENCE/`, `OPERATIONS/`)
2. Use descriptive filenames
3. Follow naming conventions (see [DEVELOPMENT/documentation_rules.md](DEVELOPMENT/documentation_rules.md))
4. The pre-commit hook will verify location compliance

---

## Questions?

See [DEVELOPMENT/documentation_rules.md](DEVELOPMENT/documentation_rules.md) for documentation guidelines.
