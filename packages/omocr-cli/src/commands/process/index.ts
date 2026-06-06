import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { OcrApiClient } from '../../api/ocrApiClient.js';
import { resolveOutputFormat, sleep, writeError, writeJson, writeVerbose } from '../../output/format.js';
import type { GlobalCliFlags, OmocrProfile } from '../../types/index.js';
import { ExitCode } from '../../types/index.js';

async function waitForJob(
  client: OcrApiClient,
  jobId: number,
  flags: GlobalCliFlags,
  stopAfter?: string,
): Promise<void> {
  if (!flags.verbose && resolveOutputFormat(flags) === 'table') {
    process.stderr.write(`Waiting for job ${jobId}…\n`);
  }
  for (let i = 0; i < 120; i++) {
    const detail = await client.getJob(jobId);
    writeVerbose(`  poll: status=${detail.status} review=${detail.review_status}`, flags);

    const ocrDone = ['completed', 'complete'].includes(detail.status);
    if (stopAfter === 'table-extraction' && ocrDone && detail.pages?.[0]?.tableExtractionJson) return;
    if (stopAfter === 'candidates' && detail.pages?.[0]?.recordCandidates) return;
    if (stopAfter === 'vision') {
      try {
        const ex = await client.getAgentExtract(jobId);
        if (ex.extract) return;
      } catch { /* keep waiting */ }
    }
    if (ocrDone && (detail.review_status === 'agent_extracted' || detail.agent_status === 'complete')) return;
    if (['failed', 'error'].includes(detail.status)) return;
    await sleep(3000);
  }
}

export function registerProcessCommands(program: Command, getCtx: () => { profile: OmocrProfile; flags: GlobalCliFlags }) {
  const proc = program.command('process').description('Submit scans to the OCR pipeline (never seeds unless --seed)');

  proc
    .command('scan')
    .argument('<file>', 'Image file path')
    .option('--church-id <id>', 'Church ID', (v) => parseInt(v, 10))
    .option('--record-type <type>', 'baptism|marriage|funeral|custom|auto', 'custom')
    .option('--layout <layout>', 'Layout hint (stored on job metadata when supported)')
    .option('--template-id <id>', 'Layout template ID')
    .option('--wait', 'Wait until processing reaches a terminal or stop stage')
    .option('--watch', 'Alias for --wait')
    .option('--stop-after <stage>', 'table-extraction|candidates|vision')
    .option('--output-dir <path>', 'Write job summary JSON here')
    .option('--seed', 'DANGER: allow seeding (not implemented — always false)')
    .action(async (file, opts) => {
      if (opts.seed) {
        writeError('Automatic seeding is not supported by the CLI. Use OCR Studio Confirm & Seed.', getCtx().flags);
        process.exit(ExitCode.USAGE);
      }
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;
      if (!fs.existsSync(file)) {
        writeError(`File not found: ${file}`, flags);
        process.exit(ExitCode.USAGE);
      }

      const client = new OcrApiClient({ profile, flags });
      const recordType = opts.recordType === 'auto' ? 'custom' : opts.recordType;

      try {
        const upload = await client.uploadFiles([file], { churchId: flags.churchId, recordType });
        const created = upload.jobs?.[0];
        if (!created?.id) {
          writeError('Upload succeeded but no job id returned', flags);
          process.exit(ExitCode.API);
        }

        const summary = { jobId: created.id, churchId: flags.churchId, filename: path.basename(file), recordType, layout: opts.layout, templateId: opts.templateId };

        if (opts.wait || opts.watch) {
          await waitForJob(client, created.id, flags, opts.stopAfter);
          const detail = await client.getJob(created.id);
          Object.assign(summary, { status: detail.status, review_status: detail.review_status });
        }

        if (opts.outputDir) {
          fs.mkdirSync(opts.outputDir, { recursive: true });
          fs.writeFileSync(path.join(opts.outputDir, `job-${created.id}.json`), JSON.stringify(summary, null, 2));
        }

        if (resolveOutputFormat(flags) === 'json') writeJson(summary, flags);
        else console.log(`Created job #${created.id}  church=${flags.churchId}  file=${path.basename(file)}`);
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });

  proc
    .command('directory')
    .argument('<dir>', 'Directory of image files')
    .option('--church-id <id>', 'Church ID', (v) => parseInt(v, 10))
    .option('--record-type <type>', 'Record type', 'custom')
    .option('--layout <layout>', 'Layout hint')
    .option('--wait', 'Wait for all jobs')
    .action(async (dir, opts) => {
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;
      const exts = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp']);
      const files = fs.readdirSync(dir)
        .filter((f) => exts.has(path.extname(f).toLowerCase()))
        .map((f) => path.join(dir, f));
      if (!files.length) {
        writeError(`No image files in ${dir}`, flags);
        process.exit(ExitCode.USAGE);
      }

      const client = new OcrApiClient({ profile, flags });
      try {
        const upload = await client.uploadFiles(files, { churchId: flags.churchId, recordType: opts.recordType });
        const jobs = upload.jobs || [];
        if (opts.wait) {
          for (const j of jobs) {
            if (j.id) await waitForJob(client, j.id, flags);
          }
        }
        if (resolveOutputFormat(flags) === 'json') writeJson({ jobs }, flags);
        else console.log(`Uploaded ${jobs.length} job(s)`);
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });
}
