/**
 * LlamaParse Platform (LlamaCloud) integration for OM OCR Studio.
 * @see https://developers.llamaindex.ai/
 */
import fs from 'node:fs';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import LlamaCloud from '@llamaindex/llama-cloud';
import type { ParsingGetResponse } from '@llamaindex/llama-cloud/resources/parsing';

export type LlamaParseTier = 'fast' | 'cost_effective' | 'agentic' | 'agentic_plus';

const FEEDER_ROOT = '/var/www/orthodoxmetrics/prod/server/storage/feeder';

export function isLlamaParseConfigured(): boolean {
  return !!(process.env.LLAMA_CLOUD_API_KEY?.trim() || process.env.LLAMA_PARSE_API_KEY?.trim());
}

/** Enabled when API key is set and LLAMA_PARSE_ENABLED is not explicitly false. */
export function isLlamaParseEnabled(): boolean {
  if (process.env.LLAMA_PARSE_ENABLED === 'false') return false;
  return isLlamaParseConfigured();
}

export function getLlamaParseTier(): LlamaParseTier {
  const raw = (process.env.LLAMA_PARSE_TIER || 'agentic').toLowerCase();
  if (raw === 'fast' || raw === 'cost_effective' || raw === 'agentic' || raw === 'agentic_plus') {
    return raw;
  }
  return 'agentic';
}

function createClient(): LlamaCloud {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY?.trim() || process.env.LLAMA_PARSE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('LLAMA_CLOUD_API_KEY is not configured');
  }
  const timeoutMs = parseInt(process.env.LLAMA_PARSE_TIMEOUT_MS || '300000', 10);
  return new LlamaCloud({ apiKey, timeout: timeoutMs });
}

export interface LlamaParseSummary {
  parseJobId: string;
  status: string;
  tier: LlamaParseTier;
  textFull: string | null;
  markdownFull: string | null;
  pageCount: number;
  pages: Array<{ pageNumber: number; markdown: string; text: string }>;
  hasItems: boolean;
}

function summarizeResult(result: ParsingGetResponse, tier: LlamaParseTier): LlamaParseSummary {
  const mdPages = result.markdown?.pages ?? [];
  const textPages = result.text?.pages ?? [];

  const pages: LlamaParseSummary['pages'] = [];
  for (const mp of mdPages) {
    if ('markdown' in mp && mp.success) {
      const pn = mp.page_number;
      const tp = textPages.find((p) => p.page_number === pn);
      pages.push({
        pageNumber: pn,
        markdown: mp.markdown,
        text: tp?.text ?? '',
      });
    }
  }

  const joinedMarkdown = pages.map((p) => p.markdown).filter(Boolean).join('\n\n---\n\n');
  const joinedText = pages.map((p) => p.text).filter(Boolean).join('\n\n');

  return {
    parseJobId: result.job.id,
    status: result.job.status,
    tier,
    textFull: result.text_full ?? (joinedText || null),
    markdownFull: result.markdown_full ?? (joinedMarkdown || null),
    pageCount: pages.length,
    pages,
    hasItems: !!result.items,
  };
}

export interface ParseLocalFileOptions {
  tier?: LlamaParseTier;
  /** Save full SDK response JSON alongside summary */
  saveRawPath?: string;
}

/**
 * Parse a local image or PDF via LlamaParse Platform (blocking until complete).
 */
export async function parseLocalFile(
  filePath: string,
  options: ParseLocalFileOptions = {},
): Promise<{ summary: LlamaParseSummary; raw: ParsingGetResponse }> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const tier = options.tier ?? getLlamaParseTier();
  const client = createClient();

  const result = await client.parsing.parse(
    {
      tier,
      version: 'latest',
      upload_file: createReadStream(filePath),
      client_name: 'orthodoxmetrics-ocr-studio',
      output_options: {
        markdown: { tables: { output_tables_as_markdown: true } },
      },
      processing_options: {
        ocr_parameters: { languages: ['en'] },
      },
      expand: ['text', 'markdown', 'items'],
    },
    { verbose: process.env.LLAMA_PARSE_VERBOSE === 'true' },
  );

  const summary = summarizeResult(result, tier);

  if (options.saveRawPath) {
    fs.mkdirSync(path.dirname(options.saveRawPath), { recursive: true });
    fs.writeFileSync(options.saveRawPath, JSON.stringify(result, null, 2));
  }

  return { summary, raw: result };
}

export function getFeederPageDir(platformJobId: number, pageIndex = 0): string {
  return path.join(FEEDER_ROOT, `job_${platformJobId}`, `page_${pageIndex}`);
}

export function resolveFeederPageImage(platformJobId: number, pageIndex = 0): string {
  const dir = getFeederPageDir(platformJobId, pageIndex);
  const preprocessed = path.join(dir, 'preprocessed.jpg');
  if (fs.existsSync(preprocessed)) return preprocessed;
  const original = path.join(dir, 'source_image.jpg');
  if (fs.existsSync(original)) return original;
  throw new Error(`No preprocessed or source image for job ${platformJobId} page ${pageIndex}`);
}

/**
 * Run LlamaParse on an existing OCR feeder page and persist artifacts.
 */
export async function parseOcrJobPage(
  platformJobId: number,
  pageIndex = 0,
  options: ParseLocalFileOptions = {},
): Promise<{ summary: LlamaParseSummary; artifactPaths: { json: string; markdown: string; text: string } }> {
  const imagePath = resolveFeederPageImage(platformJobId, pageIndex);
  const pageDir = getFeederPageDir(platformJobId, pageIndex);
  const ts = Date.now();

  const jsonPath = path.join(pageDir, `llamaparse_result_${ts}.json`);
  const mdPath = path.join(pageDir, `llamaparse_${ts}.md`);
  const txtPath = path.join(pageDir, `llamaparse_${ts}.txt`);

  const { summary, raw } = await parseLocalFile(imagePath, {
    ...options,
    saveRawPath: jsonPath,
  });

  if (summary.markdownFull) {
    fs.writeFileSync(mdPath, summary.markdownFull);
  } else if (summary.pages.length) {
    fs.writeFileSync(mdPath, summary.pages.map((p) => p.markdown).join('\n\n---\n\n'));
  }

  if (summary.textFull) {
    fs.writeFileSync(txtPath, summary.textFull);
  } else if (summary.pages.length) {
    fs.writeFileSync(txtPath, summary.pages.map((p) => p.text).join('\n\n'));
  }

  // Convenience symlink-style latest copies for tooling
  fs.writeFileSync(path.join(pageDir, 'llamaparse_latest.json'), JSON.stringify({ summary, job: raw.job }, null, 2));
  if (summary.markdownFull || summary.pages.length) {
    fs.writeFileSync(
      path.join(pageDir, 'llamaparse_latest.md'),
      summary.markdownFull ?? summary.pages.map((p) => p.markdown).join('\n\n---\n\n'),
    );
  }

  console.log(
    `LLAMAPARSE ${JSON.stringify({
      platformJobId,
      pageIndex,
      parseJobId: summary.parseJobId,
      tier: summary.tier,
      status: summary.status,
      pageCount: summary.pageCount,
    })}`,
  );

  return {
    summary,
    artifactPaths: { json: jsonPath, markdown: mdPath, text: txtPath },
  };
}

export function listFeederPageIndexes(platformJobId: number): number[] {
  const jobDir = path.join(FEEDER_ROOT, `job_${platformJobId}`);
  if (!fs.existsSync(jobDir)) return [];
  return fs.readdirSync(jobDir)
    .filter((d) => /^page_\d+$/.test(d))
    .map((d) => parseInt(d.replace('page_', ''), 10))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
}

/** Aggregate LlamaParse markdown across all feeder pages for a job. */
export function readLlamaParseMarkdownForJob(platformJobId: number): string {
  const pages = listFeederPageIndexes(platformJobId);
  const parts: string[] = [];
  for (const pi of pages) {
    const mdPath = path.join(getFeederPageDir(platformJobId, pi), 'llamaparse_latest.md');
    if (fs.existsSync(mdPath)) {
      const text = fs.readFileSync(mdPath, 'utf8').trim();
      if (text) parts.push(text);
    }
  }
  return parts.join('\n\n---\n\n');
}

export function getLlamaParseStatus() {
  return {
    configured: isLlamaParseConfigured(),
    enabled: isLlamaParseEnabled(),
    tier: getLlamaParseTier(),
    timeoutMs: parseInt(process.env.LLAMA_PARSE_TIMEOUT_MS || '300000', 10),
    pipelineMode: process.env.LLAMA_PARSE_PIPELINE || 'manual',
  };
}

/** True when worker/API should auto-run LlamaParse during OCR pipeline. */
export function shouldRunLlamaParseInPipeline(): boolean {
  const mode = (process.env.LLAMA_PARSE_PIPELINE || 'manual').toLowerCase();
  return isLlamaParseEnabled() && (mode === 'shadow' || mode === 'supplement');
}

/**
 * Non-blocking shadow/supplement parse during feeder pipeline.
 * Writes artifacts under storage/feeder/job_{id}/page_{n}/.
 */
export async function runLlamaParseShadowIfEnabled(
  platformJobId: number,
  pageIndex: number,
  hooks?: { tenantPool?: { execute: (...args: unknown[]) => Promise<unknown> }; feederPageId?: number },
): Promise<LlamaParseSummary | null> {
  if (!shouldRunLlamaParseInPipeline()) return null;

  const pageDir = getFeederPageDir(platformJobId, pageIndex);
  const latest = path.join(pageDir, 'llamaparse_latest.json');
  if (fs.existsSync(latest) && process.env.LLAMA_PARSE_FORCE !== 'true') {
    return null;
  }

  try {
    const { summary, artifactPaths } = await parseOcrJobPage(platformJobId, pageIndex);
    if (hooks?.tenantPool && hooks.feederPageId) {
      await hooks.tenantPool.execute(
        `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json)
         VALUES (?, 'llamaparse', ?, ?)`,
        [
          hooks.feederPageId,
          artifactPaths.json,
          JSON.stringify({
            parseJobId: summary.parseJobId,
            tier: summary.tier,
            pageCount: summary.pageCount,
            markdownChars: summary.markdownFull?.length ?? 0,
            mode: process.env.LLAMA_PARSE_PIPELINE || 'shadow',
          }),
        ],
      );
    }
    return summary;
  } catch (err: unknown) {
    console.warn(
      `[LlamaParse] Shadow parse failed job=${platformJobId} page=${pageIndex}: ${(err as Error).message}`,
    );
    return null;
  }
}
