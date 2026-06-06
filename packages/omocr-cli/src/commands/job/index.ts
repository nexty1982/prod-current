import type { Command } from 'commander';
import { OcrApiClient, OmocrApiError } from '../../api/ocrApiClient.js';
import { resolveOutputFormat, sleep, writeError, writeJson, writeVerbose } from '../../output/format.js';
import type { GlobalCliFlags, OmocrProfile } from '../../types/index.js';
import { ExitCode } from '../../types/index.js';

const TERMINAL = new Set(['completed', 'complete', 'failed', 'error', 'seeded', 'ready_to_seed']);

export function registerJobCommands(program: Command, getCtx: () => { profile: OmocrProfile; flags: GlobalCliFlags }) {
  const job = program.command('job').description('Inspect and control a single OCR job');

  job
    .command('show')
    .argument('<jobId>', 'Job ID')
    .option('--church-id <id>', 'Church ID', (v) => parseInt(v, 10))
    .action(async (jobIdStr, opts) => {
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;
      const client = new OcrApiClient({ profile, flags });
      const jobId = parseInt(jobIdStr, 10);
      const fmt = resolveOutputFormat(flags);

      try {
        const detail = await client.getJob(jobId);
        let extract: unknown = null;
        try {
          extract = (await client.getAgentExtract(jobId)).extract;
        } catch {
          /* optional */
        }
        const payload = { ...detail, agent_extract: extract };
        if (fmt === 'json') writeJson(payload, flags);
        else {
          console.log(`Job #${jobId}  church=${detail.church_id}  status=${detail.status}`);
          console.log(`  review: ${detail.review_status || '—'}  type: ${detail.record_type || '—'}`);
          console.log(`  file: ${detail.filename}`);
          if (detail.records_count != null) console.log(`  records: ${detail.records_count}`);
          if (detail.pages?.length) console.log(`  pages: ${detail.pages.length}`);
        }
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(e instanceof OmocrApiError ? ExitCode.API : ExitCode.ERROR);
      }
    });

  job
    .command('watch')
    .argument('<jobId>', 'Job ID')
    .option('--church-id <id>', 'Church ID', (v) => parseInt(v, 10))
    .option('--interval <ms>', 'Poll interval ms', (v) => parseInt(v, 10), 3000)
    .action(async (jobIdStr, opts) => {
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;
      const client = new OcrApiClient({ profile, flags });
      const jobId = parseInt(jobIdStr, 10);

      try {
        for (;;) {
          const detail = await client.getJob(jobId);
          const line = `[${new Date().toISOString()}] job=${jobId} status=${detail.status} review=${detail.review_status || '—'} agent=${detail.agent_status || '—'}`;
          if (resolveOutputFormat(flags) === 'json') writeJson({ jobId, status: detail.status, review_status: detail.review_status }, flags);
          else console.log(line);
          if (TERMINAL.has(detail.status) || detail.review_status === 'seeded') break;
          await sleep(opts.interval);
        }
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });

  job
    .command('cancel')
    .argument('<jobId>', 'Job ID')
    .option('--church-id <id>', 'Church ID', (v) => parseInt(v, 10))
    .option('--reason <text>', 'Cancellation reason')
    .action(async (jobIdStr, opts) => {
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;
      const client = new OcrApiClient({ profile, flags });
      try {
        const res = await client.cancelJob(parseInt(jobIdStr, 10), undefined, opts.reason);
        if (resolveOutputFormat(flags) === 'json') writeJson(res, flags);
        else console.log(`Job ${jobIdStr} cancelled`);
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });

  job
    .command('retry')
    .argument('<jobId>', 'Job ID')
    .option('--church-id <id>', 'Church ID', (v) => parseInt(v, 10))
    .action(async (jobIdStr, opts) => {
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;
      const client = new OcrApiClient({ profile, flags });
      try {
        const res = await client.retryJob(parseInt(jobIdStr, 10));
        if (resolveOutputFormat(flags) === 'json') writeJson(res, flags);
        else console.log(`Job ${jobIdStr} re-queued`);
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });

  job
    .command('logs')
    .argument('<jobId>', 'Job ID')
    .option('--church-id <id>', 'Church ID', (v) => parseInt(v, 10))
    .action(async (jobIdStr, opts) => {
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;
      const client = new OcrApiClient({ profile, flags });
      try {
        const res = await client.getJobHistory(parseInt(jobIdStr, 10));
        if (resolveOutputFormat(flags) === 'json') writeJson(res, flags);
        else {
          const hist = (res.history || []) as Array<{ stage?: string; status?: string; message?: string; created_at?: string }>;
          for (const h of hist) {
            console.log(`${h.created_at || ''}  ${h.stage || ''}  ${h.status || ''}  ${h.message || ''}`);
          }
          if (!hist.length) console.log('(no history entries)');
        }
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });
}
