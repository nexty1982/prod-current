import type { Command } from 'commander';
import { OcrApiClient } from '../../api/ocrApiClient.js';
import {
  formatTable,
  layoutFromJob,
  parseSince,
  resolveOutputFormat,
  statusLabel,
  writeError,
  writeJson,
  writeNdjson,
} from '../../output/format.js';
import type { GlobalCliFlags, JobSummary, OmocrProfile } from '../../types/index.js';
import { ExitCode } from '../../types/index.js';

function filterJobs(jobs: JobSummary[], opts: Record<string, unknown>): JobSummary[] {
  let out = jobs;
  if (opts.status) {
    const s = String(opts.status).toLowerCase();
    out = out.filter((j) => statusLabel(j).toLowerCase().includes(s) || j.status.toLowerCase().includes(s));
  }
  if (opts.recordType) {
    out = out.filter((j) => (j.record_type || '').toLowerCase() === String(opts.recordType).toLowerCase());
  }
  if (opts.failed) {
    out = out.filter((j) => j.status === 'failed' || j.status === 'error');
  }
  if (opts.since) {
    const since = parseSince(String(opts.since));
    if (since) out = out.filter((j) => new Date(j.created_at) >= since);
  }
  return out;
}

export function registerQueryCommands(program: Command, getCtx: () => { profile: OmocrProfile; flags: GlobalCliFlags }) {
  const query = program.command('query').description('Query OCR jobs and metadata');

  query
    .command('jobs')
    .description('List OCR jobs for a church')
    .option('--church-id <id>', 'Church ID', (v) => parseInt(v, 10))
    .option('--status <status>', 'Filter by review/status substring (e.g. needs_review)')
    .option('--record-type <type>', 'Filter by record type')
    .option('--since <duration>', 'Filter created since (e.g. 24h, 7d)')
    .option('--failed', 'Show failed/error jobs only')
    .option('--limit <n>', 'Max rows', (v) => parseInt(v, 10), 100)
    .action(async (opts) => {
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;
      const client = new OcrApiClient({ profile, flags });
      const fmt = resolveOutputFormat(flags);

      try {
        const { jobs } = await client.listJobs(undefined, opts.limit);
        const filtered = filterJobs(jobs, opts);

        if (fmt === 'json') {
          writeJson({ jobs: filtered }, flags);
          return;
        }
        if (fmt === 'ndjson') {
          writeNdjson(filtered, flags);
          return;
        }

        const rows = filtered.map((j) => [
          j.id,
          j.church_id,
          j.record_type || '—',
          layoutFromJob(j as JobSummary & { layout_classification_json?: unknown }),
          statusLabel(j),
          j.records_count != null ? String(j.records_count) : '—',
          new Date(j.created_at).toLocaleString(),
        ]);
        console.log(formatTable(
          ['JOB ID', 'CHURCH', 'TYPE', 'LAYOUT', 'STATUS', 'RECORDS', 'CREATED'],
          rows,
        ));
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });
}
