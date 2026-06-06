import type { Command } from 'commander';
import { OcrApiClient } from '../../api/ocrApiClient.js';
import { formatTable, resolveOutputFormat, writeError, writeJson, writeNdjson } from '../../output/format.js';
import type { GlobalCliFlags, OmocrProfile } from '../../types/index.js';
import { ExitCode } from '../../types/index.js';

export function registerStatusCommand(program: Command, getCtx: () => { profile: OmocrProfile; flags: GlobalCliFlags }) {
  program
    .command('status')
    .description('OCR pipeline and service status')
    .option('--services', 'Check API health endpoint')
    .option('--workers', 'Show pipeline metrics (requires admin token)')
    .option('--queue', 'Summarize pending/processing jobs for default church')
    .action(async (opts) => {
      const { profile, flags } = getCtx();
      const client = new OcrApiClient({ profile, flags });
      const fmt = resolveOutputFormat(flags);

      try {
        const result: Record<string, unknown> = { profile: profile.apiBase };

        if (opts.services || (!opts.workers && !opts.queue)) {
          result.health = await client.getSystemHealth();
        }
        if (opts.workers) {
          try {
            result.pipeline = await client.getPipelineMetrics();
          } catch (e: unknown) {
            result.pipeline = { error: (e as Error).message, hint: 'Requires super_admin OMOCR_TOKEN' };
          }
        }
        if (opts.queue) {
          const { jobs } = await client.listJobs();
          const pending = jobs.filter((j) => ['pending', 'processing'].includes(j.status));
          result.queue = { total: jobs.length, active: pending.length, jobs: pending.slice(0, 20) };
        }

        if (fmt === 'json') {
          writeJson(result, flags);
        } else if (fmt === 'ndjson') {
          writeNdjson([result], flags);
        } else {
          if (result.health) {
            const h = result.health as { status?: string; ok?: boolean };
            console.log(`API ${profile.apiBase}: ${h.status || (h.ok ? 'ok' : 'unknown')}`);
          }
          if (result.queue) {
            const q = result.queue as { active: number; total: number };
            console.log(`Queue: ${q.active} active / ${q.total} recent jobs`);
          }
          if (result.pipeline && !(result.pipeline as { error?: string }).error) {
            console.log('Pipeline metrics retrieved (use --json for details)');
          }
        }
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });
}
