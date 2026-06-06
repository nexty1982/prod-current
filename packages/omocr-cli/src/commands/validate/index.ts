import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { OcrApiClient } from '../../api/ocrApiClient.js';
import { validateJobLocally } from '../../validation/jobValidator.js';
import { resolveOutputFormat, writeError, writeJson } from '../../output/format.js';
import type { GlobalCliFlags, OmocrProfile } from '../../types/index.js';
import { ExitCode } from '../../types/index.js';

export function registerValidateCommands(program: Command, getCtx: () => { profile: OmocrProfile; flags: GlobalCliFlags }) {
  const validate = program.command('validate').description('Validate extracted job data');

  validate
    .command('job')
    .argument('<jobId>', 'Job ID')
    .option('--church-id <id>', 'Church ID', (v) => parseInt(v, 10))
    .option('--strict', 'Treat warnings as errors')
    .option('--record <n>', 'Validate single record index', (v) => parseInt(v, 10))
    .action(async (jobIdStr, opts) => {
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;
      const client = new OcrApiClient({ profile, flags });
      const jobId = parseInt(jobIdStr, 10);
      const churchId = flags.churchId ?? profile.defaultChurchId!;

      try {
        const detail = await client.getJob(jobId);
        const { extract } = await client.getAgentExtract(jobId);
        let report = validateJobLocally(jobId, churchId, detail, extract);

        if (opts.record != null && extract && typeof extract === 'object' && 'records' in extract) {
          const recs = (extract as { records: unknown[] }).records;
          report = {
            ...report,
            issues: report.issues.filter((i) => i.recordIndex === opts.record || i.recordIndex === undefined),
          };
        }

        if (opts.strict) {
          report.passed = report.issues.length === 0;
        }

        try {
          const admin = await client.validateJobAdmin(jobId);
          (report.summary as Record<string, unknown>).adminValidation = admin;
        } catch {
          /* admin endpoint optional */
        }

        if (resolveOutputFormat(flags) === 'json') writeJson(report, flags);
        else {
          console.log(`Job ${jobId}: ${report.passed ? 'PASSED' : 'FAILED'}`);
          for (const issue of report.issues) {
            console.log(`  [${issue.severity}] ${issue.code}: ${issue.message}`);
          }
        }
        if (!report.passed) process.exit(ExitCode.VALIDATION_FAILED);
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });
}

export function registerArtifactsCommands(program: Command, getCtx: () => { profile: OmocrProfile; flags: GlobalCliFlags }) {
  const artifacts = program.command('artifacts').description('Inspect job pipeline artifacts');

  artifacts
    .command('list')
    .argument('<jobId>', 'Job ID')
    .option('--church-id <id>', 'Church ID', (v) => parseInt(v, 10))
    .action(async (jobIdStr, opts) => {
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;
      const client = new OcrApiClient({ profile, flags });
      const jobId = parseInt(jobIdStr, 10);
      try {
        const detail = await client.getJob(jobId);
        const names = ['ocr_text', 'table-extraction', 'record-candidates', 'agent-extract', 'scoring-v2', 'preprocessed.jpg'];
        const available: string[] = [];
        if (detail.ocr_text || detail.pages?.[0]?.rawText) available.push('ocr_text');
        if (detail.pages?.[0]?.tableExtractionJson) available.push('table-extraction');
        if (detail.pages?.[0]?.recordCandidates) available.push('record-candidates');
        try {
          const ex = await client.getAgentExtract(jobId);
          if (ex.extract) available.push('agent-extract');
        } catch { /* */ }
        const payload = { jobId, available: available.length ? available : names.map((n) => `${n} (check via show)`) };
        if (resolveOutputFormat(flags) === 'json') writeJson(payload, flags);
        else available.forEach((a) => console.log(a));
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });

  artifacts
    .command('show')
    .argument('<jobId>', 'Job ID')
    .argument('<artifact>', 'Artifact name (table-extraction, record-candidates, agent-extract, ocr_text)')
    .option('--church-id <id>', 'Church ID', (v) => parseInt(v, 10))
    .action(async (jobIdStr, artifact, opts) => {
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;
      const client = new OcrApiClient({ profile, flags });
      const jobId = parseInt(jobIdStr, 10);
      try {
        const detail = await client.getJob(jobId);
        let data: unknown;
        switch (artifact) {
          case 'table-extraction':
            data = detail.pages?.[0]?.tableExtractionJson;
            break;
          case 'record-candidates':
            data = detail.pages?.[0]?.recordCandidates;
            break;
          case 'agent-extract':
            data = (await client.getAgentExtract(jobId)).extract;
            break;
          case 'ocr_text':
            data = detail.ocr_text || detail.pages?.[0]?.rawText;
            break;
          default:
            writeError(`Unknown artifact: ${artifact}`, flags);
            process.exit(ExitCode.USAGE);
        }
        if (resolveOutputFormat(flags) === 'json') writeJson(data ?? null, flags);
        else console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });

  artifacts
    .command('export')
    .argument('<jobId>', 'Job ID')
    .requiredOption('--output <dir>', 'Output directory')
    .option('--church-id <id>', 'Church ID', (v) => parseInt(v, 10))
    .action(async (jobIdStr, opts) => {
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;
      const client = new OcrApiClient({ profile, flags });
      const jobId = parseInt(jobIdStr, 10);
      fs.mkdirSync(opts.output, { recursive: true });
      try {
        const detail = await client.getJob(jobId);
        const { extract } = await client.getAgentExtract(jobId);
        const page = detail.pages?.[0];
        if (page?.tableExtractionJson) {
          fs.writeFileSync(path.join(opts.output, 'table_extraction.json'), JSON.stringify(page.tableExtractionJson, null, 2));
        }
        if (page?.recordCandidates) {
          fs.writeFileSync(path.join(opts.output, 'record_candidates.json'), JSON.stringify(page.recordCandidates, null, 2));
        }
        if (extract) {
          fs.writeFileSync(path.join(opts.output, 'agent_extract.json'), JSON.stringify(extract, null, 2));
        }
        const text = detail.ocr_text || page?.rawText;
        if (text) fs.writeFileSync(path.join(opts.output, 'ocr_text.txt'), text);
        if (resolveOutputFormat(flags) === 'json') writeJson({ exported: opts.output }, flags);
        else console.log(`Exported artifacts to ${opts.output}`);
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });
}
