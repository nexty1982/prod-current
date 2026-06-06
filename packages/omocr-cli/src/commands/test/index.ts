import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { OcrApiClient } from '../../api/ocrApiClient.js';
import { resolveOutputFormat, writeError, writeJson } from '../../output/format.js';
import type { GlobalCliFlags, OmocrProfile } from '../../types/index.js';
import { ExitCode } from '../../types/index.js';

interface TestReport {
  fixture?: string;
  file?: string;
  passed: boolean;
  expectedRecords?: number;
  detectedRecords?: number;
  layoutClassification?: string | null;
  issues: string[];
  durationMs: number;
}

async function runScanTest(
  client: OcrApiClient,
  file: string,
  flags: GlobalCliFlags,
  baseline?: Record<string, unknown>,
): Promise<TestReport> {
  const start = Date.now();
  const issues: string[] = [];
  const upload = await client.uploadFiles([file], { churchId: flags.churchId, recordType: 'custom' });
  const jobId = upload.jobs?.[0]?.id;
  if (!jobId) throw new Error('Upload did not return a job id');

  // Poll up to 2 minutes
  let detail = await client.getJob(jobId);
  for (let i = 0; i < 40; i++) {
    if (['completed', 'complete', 'failed', 'error'].includes(detail.status)) break;
    await new Promise((r) => setTimeout(r, 3000));
    detail = await client.getJob(jobId);
  }

  let extract: { records?: unknown[] } | null = null;
  try {
    extract = (await client.getAgentExtract(jobId)).extract as { records?: unknown[] } | null;
  } catch { /* optional */ }

  const candidates = (detail.pages?.[0]?.recordCandidates as { candidates?: unknown[] } | undefined)?.candidates;
  const detected = extract?.records?.length ?? candidates?.length ?? 0;
  const expected = baseline?.expectedRecords as number | undefined;

  if (expected != null && detected !== expected) {
    issues.push(`Record count mismatch: expected ${expected}, detected ${detected}`);
  }

  const report: TestReport = {
    file: path.basename(file),
    passed: issues.length === 0,
    expectedRecords: expected,
    detectedRecords: detected,
    layoutClassification: null,
    issues,
    durationMs: Date.now() - start,
  };

  if (baseline && baseline.expectedRecords !== detected) {
    report.passed = false;
  }

  return report;
}

export function registerTestCommands(program: Command, getCtx: () => { profile: OmocrProfile; flags: GlobalCliFlags }) {
  const test = program.command('test').description('Non-destructive OCR regression harness (does not seed records)');

  test
    .command('scan')
    .argument('<file>', 'Image file')
    .option('--church-id <id>', 'Test church ID', (v) => parseInt(v, 10))
    .option('--report <path>', 'Write JSON report')
    .action(async (file, opts) => {
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;
      const client = new OcrApiClient({ profile, flags });
      try {
        const report = await runScanTest(client, file, flags);
        if (opts.report) fs.writeFileSync(opts.report, JSON.stringify(report, null, 2));
        if (resolveOutputFormat(flags) === 'json') writeJson(report, flags);
        else {
          console.log(`Result: ${report.passed ? 'PASSED' : 'FAILED'}`);
          console.log(`Detected records: ${report.detectedRecords}`);
          for (const i of report.issues) console.log(`  - ${i}`);
        }
        if (!report.passed) process.exit(ExitCode.VALIDATION_FAILED);
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });

  test
    .command('fixture')
    .argument('<name>', 'Fixture directory name under ./fixtures/ or path')
    .option('--church-id <id>', 'Church ID', (v) => parseInt(v, 10))
    .option('--stage <stage>', 'column-mapping|vision|full', 'full')
    .option('--compare-baseline', 'Compare against fixture/baseline.json')
    .option('--report <path>', 'Write JSON report')
    .action(async (name, opts) => {
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;
      const fixtureDir = fs.existsSync(name) ? name : path.join('fixtures', name);
      if (!fs.existsSync(fixtureDir)) {
        writeError(`Fixture not found: ${fixtureDir}`, flags);
        process.exit(ExitCode.USAGE);
      }
      const baselinePath = path.join(fixtureDir, 'baseline.json');
      const baseline = opts.compareBaseline && fs.existsSync(baselinePath)
        ? JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
        : undefined;

      const images = fs.readdirSync(fixtureDir).filter((f) => /\.(jpe?g|png|tif?f|webp)$/i.test(f));
      if (!images.length) {
        writeError(`No images in fixture ${fixtureDir}`, flags);
        process.exit(ExitCode.USAGE);
      }

      const client = new OcrApiClient({ profile, flags });
      const reports: TestReport[] = [];
      for (const img of images) {
        reports.push(await runScanTest(client, path.join(fixtureDir, img), flags, baseline));
      }
      const passed = reports.every((r) => r.passed);
      const summary = { fixture: name, passed, reports, stage: opts.stage };
      if (opts.report) fs.writeFileSync(opts.report, JSON.stringify(summary, null, 2));
      if (resolveOutputFormat(flags) === 'json') writeJson(summary, flags);
      else {
        console.log(`Fixture: ${name}`);
        console.log(`Result: ${passed ? 'PASSED' : 'FAILED'}`);
        for (const r of reports) {
          console.log(`  ${r.file}: ${r.detectedRecords} records (${r.durationMs}ms)`);
        }
      }
      if (!passed) process.exit(ExitCode.VALIDATION_FAILED);
    });

  test
    .command('directory')
    .argument('<dir>', 'Directory of test scans')
    .option('--record-type <type>', 'Record type hint', 'auto')
    .option('--report <path>', 'Write JSON report')
    .action(async (dir, opts) => {
      const { profile, flags } = getCtx();
      const client = new OcrApiClient({ profile, flags });
      const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|tif?f|webp)$/i.test(f)).map((f) => path.join(dir, f));
      const reports: TestReport[] = [];
      for (const f of files) reports.push(await runScanTest(client, f, flags));
      const summary = { directory: dir, passed: reports.every((r) => r.passed), reports };
      if (opts.report) fs.writeFileSync(opts.report, JSON.stringify(summary, null, 2));
      if (resolveOutputFormat(flags) === 'json') writeJson(summary, flags);
      else console.log(`${reports.filter((r) => r.passed).length}/${reports.length} passed`);
      if (!summary.passed) process.exit(ExitCode.VALIDATION_FAILED);
    });
}
