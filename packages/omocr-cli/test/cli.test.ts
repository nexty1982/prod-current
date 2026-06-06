import { describe, expect, it } from 'vitest';
import { parseSince, pad, formatTable } from '../src/output/format.js';
import { validateJobLocally } from '../src/validation/jobValidator.js';
import { ConfigFileSchema } from '../src/config/schema.js';

describe('format helpers', () => {
  it('parseSince parses hours', () => {
    const d = parseSince('24h');
    expect(d).toBeTruthy();
    expect(Date.now() - d!.getTime()).toBeGreaterThan(23 * 3600_000);
  });

  it('formatTable aligns columns', () => {
    const t = formatTable(['A', 'B'], [['1', '22'], ['333', '4']]);
    expect(t).toContain('A');
    expect(t.split('\n').length).toBeGreaterThan(2);
  });

  it('pad pads strings', () => {
    expect(pad('x', 3)).toBe('x  ');
  });
});

describe('jobValidator', () => {
  it('flags birth after baptism', () => {
    const report = validateJobLocally(1, 46, {
      id: '1',
      church_id: '46',
      filename: 't.jpg',
      status: 'complete',
      record_type: 'baptism',
      created_at: new Date().toISOString(),
      pages: [],
    }, {
      record_type: 'baptism',
      records: [{ child_name: 'Test', date_of_birth: '5/12/74', date_of_baptism: '5/5/74' }],
    });
    expect(report.passed).toBe(false);
    expect(report.issues.some((i) => i.code === 'chronology_birth_after_baptism')).toBe(true);
  });
});

describe('config schema', () => {
  it('accepts minimal yaml-shaped object', () => {
    const cfg = ConfigFileSchema.parse({ activeProfile: 'dev', profiles: { dev: { apiBase: 'http://localhost:3002' } } });
    expect(cfg.activeProfile).toBe('dev');
  });
});
