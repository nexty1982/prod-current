# omocr CLI

Versioned command-line client for **OCR Studio**. All processing goes through the
existing HTTP API and worker pipeline — the CLI does not reimplement OCR logic.

## Install

```bash
cd packages/omocr-cli
npm install
npm run build
npm link   # optional: global omocr, omocr-query, omocr-process, …
```

Development without link:

```bash
npm run dev -- status
npx tsx src/bin/omocr.ts query jobs --church-id 46
```

## Configuration

`~/.config/orthodoxmetrics/omocr.yaml`:

```yaml
activeProfile: dev

profiles:
  dev:
    apiBase: http://127.0.0.1:3002
    defaultChurchId: 46
    timeoutSeconds: 120

  production:
    apiBase: https://orthodoxmetrics.com
    timeoutSeconds: 120
```

Authentication (never store tokens in YAML):

```bash
export OMOCR_TOKEN="your-session-or-bearer-token"
# optional session cookie form:
export OMOCR_SESSION="connect.sid=..."
```

## Canonical syntax

```text
omocr <command> <subcommand> [arguments] [options]
```

### Aliases (convenience only)

| Alias           | Equivalent      |
|-----------------|-----------------|
| `omocr-query`   | `omocr query`   |
| `omocr-test`    | `omocr test`    |
| `omocr-process` | `omocr process` |
| `omocr-status`  | `omocr status`  |

## First-milestone commands

```bash
omocr status
omocr status --services --queue --json

omocr query jobs --church-id 46 --status needs_review
omocr query jobs --failed --since 24h --json

omocr job show 1842 --church-id 46
omocr job watch 1842 --church-id 46
omocr job cancel 1842
omocr job retry 1842
omocr job logs 1842

omocr process scan ./page.jpg --church-id 46 --record-type baptism --wait
omocr process directory ./scans --church-id 46 --record-type baptism

omocr config show
omocr config use dev
omocr config set defaultChurchId 46
```

## Output modes

- Default: human-readable tables
- `--json`: single JSON document on stdout
- `--ndjson`: one JSON object per line
- Errors: stderr only
- Exit codes: `0` ok, `1` error, `2` usage, `3` API, `4` validation failed

## Safety

- **`omocr process` never seeds records.** Seeding remains a separate Confirm &
  Seed action in OCR Studio.
- **`omocr test` is non-destructive** relative to parish record tables (creates
  OCR jobs only; does not call seed endpoints).

## Architecture

```text
CLI → OCR Studio API → job queue → feeder worker → table extraction
    → candidates → vision agent → review / seed (Studio UI)
```

See also: [docs/ocr-cli.md](../../docs/ocr-cli.md),
[docs/ocr-studio-record-identification.md](../../docs/ocr-studio-record-identification.md).

## Tests

```bash
npm test
```
