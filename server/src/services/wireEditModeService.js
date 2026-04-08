/**
 * wireEditModeService.js — Transform engine for auto-wiring Edit Mode
 *
 * Extracts the core transform logic from scripts/wire-edit-mode.js into a
 * reusable service callable from both CLI and API endpoints.
 *
 * Given an absolute path to a TSX file, produces a preview (diff + summary)
 * or applies the transformation in place.
 */

const fs = require('fs');
const path = require('path');

// ── Config ─────────────────────────────────────────────────────────

const WRAPPABLE_TAGS = new Set(['h1','h2','h3','h4','h5','h6','p','span','li','label']);
const SHARED_EDIT_COMPONENTS = ['HeroSection','SectionHeader','CTASection','FeatureCard','BulletList'];
const EDITABLE_TEXT_IMPORT = "import EditableText from '@/components/frontend-pages/shared/EditableText';";

const FRONTEND_SRC = path.resolve(__dirname, '../../../front-end/src');

// ── Shared section field awareness ─────────────────────────────────

function findCoveredPrefixes(source) {
  const prefixes = [];
  for (const comp of SHARED_EDIT_COMPONENTS) {
    const re = new RegExp(`<${comp}[^>]*editKeyPrefix=["'\`]([^"'\`]+)["'\`]`, 'g');
    let m;
    while ((m = re.exec(source)) !== null) {
      prefixes.push(m[1]);
    }
  }
  return prefixes;
}

function isCoveredBySharedSection(key, coveredPrefixes) {
  for (const prefix of coveredPrefixes) {
    if (key.startsWith(prefix + '.')) return true;
    if (key === prefix) return true;
  }
  return false;
}

// ── Phase 1: Direct element wrapping ───────────────────────────────

function transformDirectElements(src, coveredPrefixes) {
  let result = src;
  let changeCount = 0;
  const tags = [...WRAPPABLE_TAGS].join('|');

  // Multi-line: <tag attrs>\n  {t('key')}\n</tag>
  const multiLineRe = new RegExp(
    `([ \\t]*)<(${tags})(\\s[^>]*)?>\\s*\\n(\\s*)\\{t\\(['"]([^'"]+)['"]\\)\\}\\s*\\n\\s*<\\/\\2>`,
    'g'
  );

  result = result.replace(multiLineRe, (match, leadIndent, tag, attrs, contentIndent, key) => {
    if (isCoveredBySharedSection(key, coveredPrefixes)) return match;
    const attrStr = attrs ? attrs.trim() : '';
    const classMatch = attrStr.match(/className=(?:"([^"]*)"|{`([^`]*)`}|\{([^}]*)\})/);
    const classAttr = classMatch ? ` className=${classMatch[0].replace(/^className=/, '')}` : '';
    const otherAttrs = attrStr.replace(/className=(?:"[^"]*"|{`[^`]*`}|\{[^}]*\})/, '').trim();
    const extraAttrs = otherAttrs ? ` ${otherAttrs}` : '';
    changeCount++;
    return `${leadIndent}<EditableText contentKey="${key}" as="${tag}"${classAttr}${extraAttrs}>\n${contentIndent}{t('${key}')}\n${leadIndent}</EditableText>`;
  });

  // Single-line: <tag attrs>{t('key')}</tag>
  const singleLineRe = new RegExp(
    `(<(?:${tags})(\\s[^>]*)?>)\\{t\\(['"]([^'"]+)['"]\\)\\}(</(?:${tags})>)`,
    'g'
  );

  result = result.replace(singleLineRe, (match, openTag, attrs, key, closeTag) => {
    if (isCoveredBySharedSection(key, coveredPrefixes)) return match;
    const tagMatch = openTag.match(/^<(\w+)/);
    const tag = tagMatch[1];
    const attrStr = attrs ? attrs.trim() : '';
    const classMatch = attrStr.match(/className=(?:"([^"]*)"|{`([^`]*)`}|\{([^}]*)\})/);
    const classAttr = classMatch ? ` className=${classMatch[0].replace(/^className=/, '')}` : '';
    const otherAttrs = attrStr.replace(/className=(?:"[^"]*"|{`[^`]*`}|\{[^}]*\})/, '').trim();
    const extraAttrs = otherAttrs ? ` ${otherAttrs}` : '';
    changeCount++;
    return `<EditableText contentKey="${key}" as="${tag}"${classAttr}${extraAttrs}>{t('${key}')}</EditableText>`;
  });

  return { result, changeCount };
}

// ── Phase 2: Array patterns ────────────────────────────────────────

function transformArrayPatterns(src, coveredPrefixes) {
  let result = src;
  let changeCount = 0;

  // Sub-pattern A: Simple arrays of t() calls
  const simpleArrayRe = /const\s+(\w+)\s*=\s*\[\s*\n((?:\s*t\(['"][^'"]+['"]\),?\s*\n)+)\s*\]/g;
  const simpleArrayMatches = [];
  let sam;
  while ((sam = simpleArrayRe.exec(src)) !== null) {
    simpleArrayMatches.push({ varName: sam[1], fullMatch: sam[0], body: sam[2] });
  }

  for (const arr of simpleArrayMatches) {
    const keyRe = /t\(['"]([^'"]+)['"]\)/g;
    const keys = [];
    let km;
    while ((km = keyRe.exec(arr.body)) !== null) {
      if (!isCoveredBySharedSection(km[1], coveredPrefixes)) keys.push(km[1]);
    }
    if (keys.length === 0) continue;

    let newBody = arr.body;
    for (const key of keys) {
      newBody = newBody.replace(`t('${key}')`, `'${key}'`);
      newBody = newBody.replace(`t("${key}")`, `'${key}'`);
    }
    result = result.replace(arr.fullMatch, arr.fullMatch.replace(arr.body, newBody));
    changeCount += keys.length;

    const mapRe = new RegExp(`${arr.varName}\\.map\\(\\(\\s*(\\w+)`, 'g');
    const mapMatch = mapRe.exec(result);
    if (!mapMatch) continue;

    const iterVar = mapMatch[1];
    const tags = [...WRAPPABLE_TAGS].join('|');

    // Single-line render site
    const renderSingleRe = new RegExp(`<(${tags})(\\s[^>]*)?>\\{${iterVar}\\}</(${tags})>`, 'g');
    result = result.replace(renderSingleRe, (match, tag, attrs) => {
      const attrStr = attrs ? attrs.trim() : '';
      const classMatch = attrStr.match(/className=(?:"([^"]*)"|{`([^`]*)`}|\{([^}]*)\})/);
      const classAttr = classMatch ? ` className=${classMatch[0].replace(/^className=/, '')}` : '';
      return `<EditableText contentKey={${iterVar}} as="${tag}"${classAttr}>{t(${iterVar})}</EditableText>`;
    });

    // Multi-line render site
    const renderMultiRe = new RegExp(`<(${tags})(\\s[^>]*)?>\\s*\\n(\\s*)\\{${iterVar}\\}\\s*\\n\\s*</(${tags})>`, 'g');
    result = result.replace(renderMultiRe, (match, tag, attrs, indent) => {
      const attrStr = attrs ? attrs.trim() : '';
      const classMatch = attrStr.match(/className=(?:"([^"]*)"|{`([^`]*)`}|\{([^}]*)\})/);
      const classAttr = classMatch ? ` className=${classMatch[0].replace(/^className=/, '')}` : '';
      return `${indent}<EditableText contentKey={${iterVar}} as="${tag}"${classAttr}>\n${indent}  {t(${iterVar})}\n${indent}</EditableText>`;
    });
  }

  // Sub-pattern B: Object arrays with t() values
  const objectArrayRe = /const\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*\[\s*\n([\s\S]*?)\n\s*\];/g;
  const objectArrayMatches = [];
  let oam;
  while ((oam = objectArrayRe.exec(result)) !== null) {
    if (!/\w+:\s*t\(['"]/.test(oam[2])) continue;
    objectArrayMatches.push({ varName: oam[1], fullMatch: oam[0], body: oam[2] });
  }

  for (const arr of objectArrayMatches) {
    const propRe = /(\w+):\s*t\(['"]([^'"]+)['"]\)/g;
    const propMap = new Map();
    let pm;
    while ((pm = propRe.exec(arr.body)) !== null) {
      if (isCoveredBySharedSection(pm[2], coveredPrefixes)) continue;
      if (!propMap.has(pm[1])) propMap.set(pm[1], new Set());
      propMap.get(pm[1]).add(pm[2]);
    }
    if (propMap.size === 0) continue;

    let newBody = arr.body;
    for (const [prop] of propMap) {
      const replaceRe = new RegExp(`${prop}:\\s*t\\(['"]([^'"]+)['"]\\)`, 'g');
      newBody = newBody.replace(replaceRe, (m, key) => `${prop}Key: '${key}'`);
    }
    result = result.replace(arr.fullMatch, arr.fullMatch.replace(arr.body, newBody));

    const mapRe = new RegExp(`${arr.varName}\\.map\\(\\(\\s*(\\w+)`, 'g');
    const mapMatch = mapRe.exec(result);
    if (!mapMatch) continue;

    const iterVar = mapMatch[1];
    const tags = [...WRAPPABLE_TAGS].join('|');

    for (const [prop] of propMap) {
      const keyProp = `${prop}Key`;
      changeCount++;

      // Single-line render
      const propSingleRe = new RegExp(`<(${tags})(\\s[^>]*)?>\\{${iterVar}\\.${prop}\\}</(${tags})>`, 'g');
      result = result.replace(propSingleRe, (match, tag, attrs) => {
        const attrStr = attrs ? attrs.trim() : '';
        const classMatch = attrStr.match(/className=(?:"([^"]*)"|{`([^`]*)`}|\{([^}]*)\})/);
        const classAttr = classMatch ? ` className=${classMatch[0].replace(/^className=/, '')}` : '';
        return `<EditableText contentKey={${iterVar}.${keyProp}} as="${tag}"${classAttr}>{t(${iterVar}.${keyProp})}</EditableText>`;
      });

      // Multi-line render
      const propMultiRe = new RegExp(`<(${tags})(\\s[^>]*)?>\\s*\\n(\\s*)\\{${iterVar}\\.${prop}\\}\\s*\\n\\s*</(${tags})>`, 'g');
      result = result.replace(propMultiRe, (match, tag, attrs, indent) => {
        const attrStr = attrs ? attrs.trim() : '';
        const classMatch = attrStr.match(/className=(?:"([^"]*)"|{`([^`]*)`}|\{([^}]*)\})/);
        const classAttr = classMatch ? ` className=${classMatch[0].replace(/^className=/, '')}` : '';
        return `${indent}<EditableText contentKey={${iterVar}.${keyProp}} as="${tag}"${classAttr}>\n${indent}  {t(${iterVar}.${keyProp})}\n${indent}</EditableText>`;
      });

      // Fallback: bare {iterVar.prop} not inside a wrappable tag
      const bareLines = result.split('\n');
      for (let li = 0; li < bareLines.length; li++) {
        const line = bareLines[li];
        const bareMatch = line.match(new RegExp(`^(\\s*)\\{${iterVar}\\.${prop}\\}\\s*$`));
        if (bareMatch) {
          const prevLine = li > 0 ? bareLines[li - 1] : '';
          if (/EditableText/.test(prevLine)) continue;
          bareLines[li] = `${bareMatch[1]}<EditableText contentKey={${iterVar}.${keyProp}} as="span">{t(${iterVar}.${keyProp})}</EditableText>`;
        }
      }
      result = bareLines.join('\n');
    }
  }

  return { result, changeCount };
}

// ── Phase 2b: Standalone {t('key')} in non-wrappable parents ──────

function transformStandaloneTCalls(src, coveredPrefixes) {
  let changeCount = 0;
  const lines = src.split('\n');
  const tags = [...WRAPPABLE_TAGS].join('|');

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)\{t\(['"]([^'"]+)['"]\)\}\s*$/);
    if (!m) continue;

    const [, indent, key] = m;
    if (isCoveredBySharedSection(key, coveredPrefixes)) continue;

    // Already inside EditableText?
    if (i > 0 && /EditableText/.test(lines[i - 1])) continue;

    // Next line is closing wrappable tag? (handled by Phase 1)
    if (i < lines.length - 1 && new RegExp(`^\\s*</(${tags})>`).test(lines[i + 1])) continue;

    lines[i] = `${indent}<EditableText contentKey="${key}" as="span">{t('${key}')}</EditableText>`;
    changeCount++;
  }

  return { result: lines.join('\n'), changeCount };
}

// ── Phase 3: Ensure import ─────────────────────────────────────────

function ensureImport(src) {
  if (/import\s+EditableText\s+from/.test(src)) return src;
  const lines = src.split('\n');
  let lastImportLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) lastImportLine = i;
    if (/^\s*\}\s*from\s+['"]/.test(lines[i])) lastImportLine = i;
  }
  if (lastImportLine >= 0) {
    lines.splice(lastImportLine + 1, 0, EDITABLE_TEXT_IMPORT);
  } else {
    lines.unshift(EDITABLE_TEXT_IMPORT);
  }
  return lines.join('\n');
}

// ── Phase 4: Uncovered detection ───────────────────────────────────

function findUncoveredCalls(transformedSrc, coveredPrefixes) {
  const remaining = [];
  const re = /\bt\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(transformedSrc)) !== null) {
    const key = m[1];
    if (isCoveredBySharedSection(key, coveredPrefixes)) continue;

    const before = transformedSrc.substring(Math.max(0, m.index - 500), m.index);
    const afterText = transformedSrc.substring(m.index, Math.min(transformedSrc.length, m.index + 500));

    if (/EditableText[^>]*>\s*\{?\s*$/.test(before)) continue;
    if (/<EditableText[^>]*>.*$/.test(before.split('\n').pop())) continue;

    const lineStart = before.lastIndexOf('\n') + 1;
    const lineContext = before.substring(lineStart) + afterText.split('\n')[0];
    const isPropValue = /\w+=\{t\(/.test(lineContext) && !/>\s*\{t\(/.test(lineContext);

    remaining.push({
      key,
      context: isPropValue ? 'prop-value' : 'uncovered',
      line: transformedSrc.substring(0, m.index).split('\n').length,
      lineText: lineContext.trim().substring(0, 120),
    });
  }
  return remaining;
}

// ── Diff generation ────────────────────────────────────────────────

function generateDiff(original, transformed) {
  const origLines = original.split('\n');
  const newLines = transformed.split('\n');
  const hunks = [];
  const maxLines = Math.max(origLines.length, newLines.length);
  let currentHunk = null;

  for (let i = 0; i < maxLines; i++) {
    const orig = origLines[i] || '';
    const newL = newLines[i] || '';
    if (orig !== newL) {
      if (!currentHunk) {
        currentHunk = { startLine: i + 1, changes: [] };
        // Context line before
        if (i > 0) currentHunk.changes.push({ type: 'context', line: i, text: origLines[i - 1] });
      }
      if (origLines[i] !== undefined) currentHunk.changes.push({ type: 'removed', line: i + 1, text: orig });
      if (newLines[i] !== undefined) currentHunk.changes.push({ type: 'added', line: i + 1, text: newL });
    } else {
      if (currentHunk) {
        // Context line after
        currentHunk.changes.push({ type: 'context', line: i + 1, text: orig });
        hunks.push(currentHunk);
        currentHunk = null;
      }
    }
  }
  if (currentHunk) hunks.push(currentHunk);

  return hunks;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Resolve a relative file path (from candidate data) to an absolute path.
 * Accepts paths relative to front-end/src or absolute paths.
 */
function resolveFilePath(filePath) {
  if (path.isAbsolute(filePath)) return filePath;
  // Try relative to front-end/src first
  const fromSrc = path.resolve(FRONTEND_SRC, filePath);
  if (fs.existsSync(fromSrc)) return fromSrc;
  // Try from project root
  const fromRoot = path.resolve(__dirname, '../../..', filePath);
  if (fs.existsSync(fromRoot)) return fromRoot;
  return fromSrc; // Return best guess
}

/**
 * Preview the transformation for a file without writing.
 * Returns structured result with summary, diff hunks, and uncovered calls.
 */
function previewTransform(filePath) {
  const absPath = resolveFilePath(filePath);
  if (!fs.existsSync(absPath)) {
    return { success: false, error: `File not found: ${absPath}` };
  }

  const original = fs.readFileSync(absPath, 'utf-8');
  const coveredPrefixes = findCoveredPrefixes(original);

  // Run transform phases
  const phase1 = transformDirectElements(original, coveredPrefixes);
  const phase2 = transformArrayPatterns(phase1.result, coveredPrefixes);
  const phase2b = transformStandaloneTCalls(phase2.result, coveredPrefixes);

  let transformed = phase2b.result;
  const hadImport = /import\s+EditableText\s+from/.test(original);
  const totalChanges = phase1.changeCount + phase2.changeCount + phase2b.changeCount;

  if (totalChanges > 0 && !hadImport) {
    transformed = ensureImport(transformed);
  }

  // Detect remaining uncovered
  const remaining = findUncoveredCalls(transformed, coveredPrefixes);
  const uncovered = remaining.filter(r => r.context === 'uncovered');
  const propValues = remaining.filter(r => r.context === 'prop-value');

  // Generate diff
  const diff = totalChanges > 0 ? generateDiff(original, transformed) : [];

  return {
    success: true,
    file: absPath,
    relativeFile: path.relative(path.resolve(__dirname, '../../..'), absPath),
    totalChanges,
    phases: {
      directElements: phase1.changeCount,
      arrayPatterns: phase2.changeCount,
      standaloneCalls: phase2b.changeCount,
      importAdded: totalChanges > 0 && !hadImport,
    },
    coveredPrefixes,
    uncovered,
    propValues: propValues.length,
    diff,
    allCovered: uncovered.length === 0,
  };
}

/**
 * Apply the transformation to a file (writes in place).
 * Returns the same result as previewTransform plus write confirmation.
 */
function applyTransform(filePath) {
  const absPath = resolveFilePath(filePath);
  if (!fs.existsSync(absPath)) {
    return { success: false, error: `File not found: ${absPath}` };
  }

  const original = fs.readFileSync(absPath, 'utf-8');
  const coveredPrefixes = findCoveredPrefixes(original);

  const phase1 = transformDirectElements(original, coveredPrefixes);
  const phase2 = transformArrayPatterns(phase1.result, coveredPrefixes);
  const phase2b = transformStandaloneTCalls(phase2.result, coveredPrefixes);

  let transformed = phase2b.result;
  const hadImport = /import\s+EditableText\s+from/.test(original);
  const totalChanges = phase1.changeCount + phase2.changeCount + phase2b.changeCount;

  if (totalChanges === 0) {
    return { success: true, applied: false, totalChanges: 0, message: 'No changes needed' };
  }

  if (!hadImport) {
    transformed = ensureImport(transformed);
  }

  const remaining = findUncoveredCalls(transformed, coveredPrefixes);
  const uncovered = remaining.filter(r => r.context === 'uncovered');

  // Write the file
  fs.writeFileSync(absPath, transformed, 'utf-8');

  return {
    success: true,
    applied: true,
    file: absPath,
    relativeFile: path.relative(path.resolve(__dirname, '../../..'), absPath),
    totalChanges,
    phases: {
      directElements: phase1.changeCount,
      arrayPatterns: phase2.changeCount,
      standaloneCalls: phase2b.changeCount,
      importAdded: !hadImport,
    },
    uncovered,
    allCovered: uncovered.length === 0,
  };
}

module.exports = {
  previewTransform,
  applyTransform,
  resolveFilePath,
};
