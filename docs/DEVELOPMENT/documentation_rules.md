# Documentation Rules and Guardrails

**Effective Date:** 2026-01-24  
**Purpose:** Prevent documentation sprawl and ensure all docs live in canonical locations

---

## Rule: Canonical Documentation Location

**All `.md` and `.txt` documentation files MUST live under `docs/`** except:

### Allowed Exceptions

1. **Root README:** `README.md` at repository root
2. **Package Boundary READMEs:** README files at package/project boundaries:
   - `server/README.md`
   - `front-end/README.md`
   - `ops-hub/README.md`
   - `tools/*/README.md`
   - `scripts/*/README.md`

### Prohibited Locations

- ❌ `misc/docs/` - Use `docs/ARCHIVE/` instead
- ❌ `server/docs/` - Use `docs/REFERENCE/server/` instead
- ❌ `front-end/docs/` - Use `docs/REFERENCE/front-end/` instead
- ❌ Any other top-level directory with `docs/` subdirectory

---

## Documentation Structure

### Canonical Structure

```
docs/
├── FEATURES/          # Feature documentation
├── REFERENCE/         # Reference documentation
│   ├── server/        # Server-specific reference docs
│   └── front-end/     # Frontend-specific reference docs
├── OPERATIONS/        # Operations guides
├── ARCHIVE/           # Archived/dated documentation
│   └── YYYY-MM-DD-*   # Dated docs with date prefix
├── DEVELOPMENT/       # Development guidelines
├── assets/            # Documentation assets (images, etc.)
└── README.md          # Documentation index
```

### Naming Conventions

- **Dated documentation:** `YYYY-MM-DD-description.md` (e.g., `2024-12-08-dark-mode-issues.md`)
- **Feature docs:** `feature-name.md` (e.g., `om-spec_current-state.md`)
- **Reference docs:** `component-api-reference.md` (e.g., `om-spec_ui_api_db_map.md`)

---

## Enforcement

### Pre-Commit Hook

A pre-commit hook (`scripts/check-docs-location.sh`) automatically checks for violations:

1. Scans staged files for `.md` and `.txt` files
2. Allows exceptions (root README, package boundary READMEs)
3. Fails commit with error message if violation found
4. Provides helpful guidance on correct location

### Manual Checks

Run manually:
```bash
./scripts/check-docs-location.sh
```

---

## Migration Guide

If you have documentation outside `docs/`:

1. **Dated/archived docs:** Move to `docs/ARCHIVE/YYYY-MM-DD-description.md`
2. **Feature docs:** Move to `docs/FEATURES/feature-name.md`
3. **Reference docs:** Move to `docs/REFERENCE/category/reference-name.md`
4. **Operations docs:** Move to `docs/OPERATIONS/operation-name.md`

---

## Rationale

- **Single source of truth:** All documentation in one place
- **Easy discovery:** Developers know where to find docs
- **Prevent sprawl:** Avoid documentation scattered across repo
- **Consistent structure:** Standardized organization

---

## Questions?

See `docs/README.md` for documentation index and structure guide.
