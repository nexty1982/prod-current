# Translation Management System

> Source-versioned, hash-based translation workflow for Orthodox Metrics public and admin pages.

## Architecture

| Table | Purpose |
|-------|---------|
| `translations_source` | English source text with MD5 hash (631 keys) |
| `translations_localized` | Per-language translations with status tracking |
| `translation_change_log` | Audit trail for English source edits |
| `languages` | Supported language registry (en, el, ru, ro, ka) |

### Status Lifecycle

```
missing → draft → review → current
                              ↓ (English edited)
                           outdated → draft → review → current
```

- **missing** — No translation exists for this language
- **draft** — Translator saved work, not yet reviewed
- **review** — Needs human review before going live
- **current** — Translation matches current English source hash
- **outdated** — English changed since translation was last synced

### Hash Behavior

Every English source entry has an MD5 hash of its text. When English changes:
1. New hash computed
2. All `current` localized entries for that key become `outdated`
3. Change logged to `translation_change_log`

Public pages still render outdated/review/draft translations — they don't break. But the admin UI clearly shows what needs attention.

## Key Naming Convention

```
{namespace}.{section}_{element}_{detail}
```

Examples:
- `home.hero_title`, `home.hero_subtitle`, `home.hero_cta_tour`
- `pricing.plan_small_name`, `pricing.faq1_q`, `pricing.faq1_a`
- `common.brand_name`, `nav.home`, `footer.tagline`

Namespaces: `common`, `nav`, `footer`, `home`, `about`, `tour`, `contact`, `faq`, `cta`, `pricing`, `samples`, `portfolio`, `auth`, `blog`, `restrictions`, `explorer`

## API Endpoints

### Public (no auth)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/i18n/:lang[?ns=...]` | Fetch translations for rendering (original endpoint, now DB-backed) |
| GET | `/api/translations/render/:lang[?ns=...]` | Same, alternate path |
| GET | `/api/translations/languages` | List active languages |

### Admin (super_admin)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/translations/source?namespace=&search=&page=&limit=` | List/search source keys |
| GET | `/api/translations/source/:key` | Get source key + all localizations |
| PUT | `/api/translations/source/:key` | Update English text (auto-outdates) |
| POST | `/api/translations/source` | Create new source key |
| GET | `/api/translations/localized?lang=&namespace=&status=&search=` | List translations with filters |
| PUT | `/api/translations/localized` | Save translation (draft/review/current) |
| PUT | `/api/translations/localized/mark-current` | Approve translation |
| GET | `/api/translations/stats?namespace=` | Per-language/status counts |
| GET | `/api/translations/changelog?key=` | English edit history |
| POST | `/api/translations/bulk-status-update` | Recompute all statuses |

## Admin UI

**Route:** `/devel-tools/translation-manager` (super_admin only, Stage 2)

Features:
- Language health dashboard with completion percentages
- Language/namespace/status filters
- Search by key or text
- Side-by-side English + translation display
- Inline edit dialog with source context
- Save as draft / mark current workflow
- Pagination (50 items/page)

## How To: Add a New Translatable String

1. Add key to `ENGLISH_DEFAULTS` in `server/src/routes/i18n.js`
2. Insert into `translations_source`:
   ```sql
   INSERT INTO translations_source (translation_key, namespace, english_text, english_hash)
   VALUES ('home.new_key', 'home', 'Your English text', MD5('Your English text'));
   ```
   Or use the POST `/api/translations/source` endpoint.
3. Use `t('home.new_key')` in frontend component
4. Translations show as `missing` in admin UI for all languages

## How To: Edit English Text

1. Use PUT `/api/translations/source/:key` with new `english_text`
2. System auto-computes hash, marks current translations as `outdated`
3. Also update `ENGLISH_DEFAULTS` in `i18n.js` to keep fallback in sync
4. Translators filter by `outdated` in admin UI to find what needs updating

## How To: Add a New Language

1. Insert into `languages` table:
   ```sql
   INSERT INTO languages (code, name_native, name_english, rtl, is_active)
   VALUES ('bg', 'Български', 'Bulgarian', 0, 1);
   ```
2. Add to `SUPPORTED_LANGS` in `server/src/routes/i18n.js`
3. Add to `SUPPORTED_LANGS` in `front-end/src/context/LanguageContext.tsx`
4. Add to `HpHeader.tsx` language selector
5. All source keys automatically show as `missing` for the new language
6. Admin UI immediately supports the new language (no code changes needed)

## Content Update Workflow

1. **Admin edits English** → PUT source endpoint or inline EditableText
2. **System auto-marks outdated** → All current translations for that key flagged
3. **Translators filter outdated** → Admin UI shows outdated items first
4. **Translator saves draft** → PUT localized with `status: 'draft'`
5. **Reviewer approves** → Mark as current via admin UI
6. **Public pages render** → Uses current/review/draft/outdated text with English fallback for missing

## Migration Notes

- `ui_translations` (2,504 rows) migrated to `translations_localized` with `review` status
- `ENGLISH_DEFAULTS` (631 keys) seeded to `translations_source`
- Old `translation_keys` + `translations` tables remain but are empty/unused
- Old `translation_status` table (24 rows) superseded by new hash-based system
- `page_content` and `page-content-live` routes still work independently for CMS overrides
