const fs = require('fs');
const path = require('path');

const jobs = [
  { id: 266, expected: 'tabular', name: 'Baptism Tabular Spread' },
  { id: 267, expected: 'narrative', name: 'Baptism Narrative Journal' },
  { id: 268, expected: 'form', name: 'Baptism Printed Form' },
  { id: 269, expected: 'form', name: 'Baptism Multi-Doc Composite' },
  { id: 270, expected: 'tabular', name: 'Funeral Tabular Ledger' },
  { id: 271, expected: 'narrative', name: 'Funeral Narrative Paragraphs' },
  { id: 272, expected: 'form', name: 'Funeral Composite Cards' },
  { id: 273, expected: 'tabular', name: 'Marriage Tabular Ledger' },
  { id: 274, expected: 'narrative', name: 'Marriage Narrative Paragraphs' },
  { id: 275, expected: 'form', name: 'Marriage Printed Forms' }
];

const FEEDER_ROOT = '/var/www/orthodoxmetrics/prod/server/storage/feeder';

/**
 * Layout classifier v3 — refined scoring with overlapping-keyword resolution.
 *
 * Key design decisions:
 * 1. Keywords that appear in BOTH tabular ledger headers AND form certificates
 *    (like "FULL NAME OF GROOM") are scored as AMBIGUOUS — they contribute to
 *    both categories equally. The geometric signals break the tie.
 * 2. Narrative journals are identified by:
 *    - "BAPTISMS" / "MARRIAGES" / "Death Record" section headers
 *    - "No 1", "No 2" sequential record numbering
 *    - "SACRAMENT OF HOLY MATRIMONY" (implies prose ceremony description)
 *    - "died", "buried", "confessed" past-tense verbs
 * 3. Tabular ledgers are identified by:
 *    - Cyrillic ledger headers ("Счет", "родившихся", etc.)
 *    - "NUMBER" + "DATE" column structure
 *    - Multiple column peaks (≥3)
 * 4. Printed forms are identified by:
 *    - "parish record" / "certificate of" / structured label+value format
 *    - High form-label density with scattered short lines
 */
function runClassification(visionResultJson) {
  const page = visionResultJson.pages?.[0];
  if (!page || !page.width || !page.height) return null;

  const pageWidth = page.width;
  const pageHeight = page.height;

  // ── 1. Collect words with bounding boxes ──────────────────────────────
  const words = [];
  const formLabelRegex = /\b(name of|date of|place of|born at|baptized on|father|mother|godparent|sponsor|witness|priest|repose|deceased|age at|cause of|informant|signature|residence|occupation|street|baptis[me]|christening|godmother|godfather|wedding|bride|groom|crowning|funeral|death|burial|age|cause|address|born|baptized)\b/i;
  let formLabelMatches = 0;

  if (page.blocks) {
    for (const block of page.blocks) {
      if (block.paragraphs) {
        for (const paragraph of block.paragraphs) {
          if (paragraph.words) {
            for (const word of paragraph.words) {
              const box = word.boundingBox;
              if (!box || !box.vertices || box.vertices.length < 4) continue;
              const xs = box.vertices.map((v) => v.x ?? 0);
              const ys = box.vertices.map((v) => v.y ?? 0);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);
              const cy = (minY + maxY) / 2;
              const h = maxY - minY;
              const w = maxX - minX;

              words.push({
                text: word.text || '',
                minX, maxX, minY, maxY, cy, h, w
              });
            }
          }
        }
      }
    }
  }

  if (words.length === 0) return null;

  const totalWords = words.length;
  const avgWordHeight = words.reduce((sum, w) => sum + w.h, 0) / totalWords;

  // ── 2. Group words into lines via Y-clustering ────────────────────────
  words.sort((a, b) => a.cy - b.cy);
  const lines = [];
  for (const word of words) {
    let added = false;
    const tol = Math.max(avgWordHeight, word.h) * 0.75;
    for (const line of lines) {
      const lineCy = line.reduce((sum, w) => sum + w.cy, 0) / line.length;
      if (Math.abs(word.cy - lineCy) <= tol) {
        line.push(word);
        added = true;
        break;
      }
    }
    if (!added) lines.push([word]);
  }

  // ── 3. Compute geometric signals ──────────────────────────────────────
  let alignedWords = 0;
  let totalLineSpan = 0;
  for (const line of lines) {
    if (line.length >= 3) alignedWords += line.length;
    const xs = line.map(w => w.minX).concat(line.map(w => w.maxX));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    totalLineSpan += (maxX - minX) / pageWidth;

    const lineText = line.map(w => w.text).join(' ');
    if (formLabelRegex.test(lineText)) formLabelMatches++;
  }

  const horizontalAlignmentScore = alignedWords / totalWords;
  const formLabelDensity = formLabelMatches / lines.length;
  const narrativeContinuityScore = totalLineSpan / lines.length;
  const wordsPerLine = totalWords / lines.length;

  // ── 4. Column-distribution histogram ──────────────────────────────────
  const bins = new Array(40).fill(0);
  for (const w of words) {
    const startBin = Math.max(0, Math.floor((w.minX / pageWidth) * 40));
    const endBin = Math.min(39, Math.ceil((w.maxX / pageWidth) * 40));
    for (let b = startBin; b <= endBin; b++) {
      bins[b]++;
    }
  }
  const avgBinVal = bins.reduce((sum, v) => sum + v, 0) / 40;
  let peaks = 0;
  for (let b = 1; b < 39; b++) {
    if (bins[b] > bins[b - 1] && bins[b] > bins[b + 1] && bins[b] > avgBinVal * 0.4) {
      const leftValley = bins[b - 1] < bins[b] * 0.7;
      const rightValley = bins[b + 1] < bins[b] * 0.7;
      if (leftValley || rightValley) peaks++;
    }
  }
  const mean = avgBinVal;
  const variance = mean > 0 ? bins.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / 40 / Math.pow(mean, 2) : 0;

  // ── 5. Keyword matching ───────────────────────────────────────────────
  const rawText = (visionResultJson.text || '').toLowerCase();
  const wordText = words.map(w => w.text).join(' ').toLowerCase();

  let tabScore = 0;
  let formScore = 0;
  let narrScore = 0;

  // Helper: test against both raw and word-joined text
  const rx = (re) => re.test(rawText) || re.test(wordText);

  // ─── TABULAR-EXCLUSIVE keywords ──────────────────────────────────────
  // These only appear in multi-column tabular ledger spreads
  if (rx(/счет[ьъ]?\s/i)) tabScore += 6;
  if (rx(/родившихся|родившагося/i)) tabScore += 5;
  if (rx(/бракосочетавшихся/i)) tabScore += 5;
  if (rx(/умерших/i)) tabScore += 5;
  if (rx(/мужеска|мужескій/i)) tabScore += 5;
  if (rx(/женска|женскій/i)) tabScore += 5;
  if (rx(/number\s+male\s+female/i)) tabScore += 6;
  if (rx(/full\s+names?\s+of\s+sponsors/i)) tabScore += 5;
  if (rx(/воспр[іи]емник/i)) tabScore += 4;

  // ─── TABULAR/FORM AMBIGUOUS keywords ─────────────────────────────────
  // These appear in both tabular ledger headers AND form certificates.
  // Score both equally — geometry will disambiguate.
  if (rx(/priest'?s\s+name/i)) { tabScore += 3; formScore += 2; }
  if (rx(/officiant'?s\s+name/i)) { tabScore += 3; formScore += 2; }
  if (rx(/full\s+name\s+of\s+groom/i)) { tabScore += 3; formScore += 3; }
  if (rx(/full\s+name\s+of\s+bride/i)) { tabScore += 3; formScore += 3; }
  if (rx(/witnesses?\s+names?/i)) { tabScore += 3; formScore += 2; }
  if (rx(/father'?s\s+full\s+name/i)) { tabScore += 2; formScore += 3; }
  if (rx(/mother'?s\s+maiden/i)) { tabScore += 2; formScore += 3; }
  if (rx(/date\s+and\s+number\s+of\s+license/i)) { tabScore += 3; formScore += 2; }

  // ─── FORM-EXCLUSIVE keywords ─────────────────────────────────────────
  if (rx(/parish\s+record/i)) formScore += 6;
  if (rx(/certificate\s+of/i)) formScore += 6;
  if (rx(/residence\s*\(number/i)) formScore += 5;
  if (rx(/previous\s+marriages/i)) formScore += 5;
  if (rx(/groom'?s\s+parents/i)) formScore += 4;
  if (rx(/bride'?s\s+parents/i)) formScore += 4;
  if (rx(/signature\s+of/i)) formScore += 4;
  if (rx(/справка|свид[ѣе]тельство/i)) formScore += 5;

  // ─── NARRATIVE-EXCLUSIVE keywords ────────────────────────────────────
  // Journal/paragraph-style prose entries
  if (rx(/was\s+baptized/i)) narrScore += 5;
  if (rx(/baptized\s+on/i)) narrScore += 5;
  if (rx(/united\s+in\s+(holy\s+)?matri?mony/i)) narrScore += 6;
  if (rx(/sacrament\s+of\s+holy\s+matri?mony/i)) narrScore += 6;
  if (rx(/died[\s,.]+/i)) narrScore += 4;
  if (rx(/died\s+(on|at|in)/i)) narrScore += 5;
  if (rx(/buried\s+(on|at|in)/i)) narrScore += 5;
  if (rx(/was\s+buried/i)) narrScore += 5;
  if (rx(/sponsors?\s+were/i)) narrScore += 5;
  if (rx(/witnesses?\s+were/i)) narrScore += 5;
  if (rx(/confessed/i)) narrScore += 3;
  if (rx(/thrombosis|coronary|myocardial|carcinoma|arterioscler/i)) narrScore += 4;
  if (rx(/death\s+record/i)) narrScore += 5;
  if (rx(/крещен|крещена|крестил/i)) narrScore += 4;
  if (rx(/погребен/i)) narrScore += 4;
  if (rx(/повѣнчаны|повенчаны/i)) narrScore += 4;

  // ─── NARRATIVE journal-structure indicators ──────────────────────────
  // "BAPTISMS" / "MARRIAGES" as standalone section headers in journals,
  // but NOT when preceded by "PART 1-" (which indicates form sections).
  const hasBaptismsHeader = rx(/\bbaptisms\b/i) && !rx(/part\s+\d+[\s-]*baptisms/i);
  if (hasBaptismsHeader) narrScore += 3;
  // "No 1" / "No 2" — small sequential numbering (journal entries).
  // NOT "N° 31217" — 5-digit form record IDs.
  if (rx(/\bno\.?\s+\d{1,3}\b/i) && !rx(/n°\s*\d{4,}/i)) narrScore += 3;
  // "SACRAMENTS ADMINISTERED" (journal field, distinct from
  // "SACRAMENTS PERFORMED BY" which appears on forms)
  if (rx(/sacraments?\s+administered/i)) narrScore += 4;
  // "NAME OF PARENTS" + "GODPARENTS" + "DATE OF BAPTISM" combo:
  // Only score as narrative when NOT in a PARISH RECORD form context.
  if (rx(/name\s+of\s+parents/i) && rx(/godparents?/i) && rx(/date\s+of\s+baptism/i)
      && !rx(/parish\s+record/i)) {
    narrScore += 5;
  }
  // "WERE MARRIED" (prose verb form, not a header)
  if (rx(/were\s+married/i)) narrScore += 5;
  // "SACRAMENT" + "GROOM" + "BRIDE" without "parish record" → marriage journal
  if (rx(/sacrament/i) && rx(/groom/i) && rx(/bride/i) && !rx(/parish\s+record/i)) {
    narrScore += 4;
  }
  // "civil ceremony" or "prior civil ceremony"
  if (rx(/civil\s+ceremony/i)) narrScore += 3;
  // "CONVERT FROM" — conversion notation in journal entries
  if (rx(/convert\s+from/i)) narrScore += 3;

  // ─── Ledger-structure disambiguation for tabular ─────────────────────
  // When the text has "Счет" or "NUMBER" combined with columnar keywords
  // like "DATE", "FULL NAME", and Cyrillic ledger text, boost tabular
  // even if form keywords also match.
  const hasCyrillicLedger = rx(/счет|мѣсяца|день|вѣроисповѣданіе|поручител/i);
  const hasColumnarLayout = rx(/number/i) && rx(/date/i) && (
    rx(/full\s+name/i) || rx(/name\s+of/i)
  );
  if (hasCyrillicLedger && hasColumnarLayout) {
    tabScore += 8;  // Strong tabular boost
  }

  // ── 6. Geometric adjustments ──────────────────────────────────────────
  // Strong columnar structure → boost tabular
  if (peaks >= 4) {
    tabScore += 8;
  } else if (peaks >= 3) {
    tabScore += 5;
  }

  // High form-label density with low continuity → form
  if (formLabelDensity > 0.35) {
    formScore += 6;
  } else if (formLabelDensity > 0.22) {
    formScore += 4;
  }

  // Continuous text lines spanning page width → narrative
  // BUT: very high wpl (>20) suggests a multi-doc composite packed
  // onto one page, not flowing narrative prose.
  if (narrativeContinuityScore > 0.7 && wordsPerLine > 6 && wordsPerLine <= 20) {
    narrScore += 8;
  } else if (narrativeContinuityScore > 0.68 && wordsPerLine > 6 && wordsPerLine <= 20) {
    narrScore += 5;
  }

  // Low variance (evenly spread text) + high continuity → narrative
  if (variance < 0.3 && narrativeContinuityScore > 0.55) {
    narrScore += 3;
  }

  // Short scattered lines + moderate label density → form
  if (narrativeContinuityScore < 0.45 && formLabelDensity > 0.12) {
    formScore += 4;
  }

  // When PARISH RECORD appears, strongly boost form and suppress narrative
  const parishRecordCount = (rawText.match(/parish\s+record/gi) || []).length;
  if (parishRecordCount >= 2) {
    formScore += parishRecordCount * 4; // Multiple parish records on one page
  }

  // Very short text length with sparse words → likely cards/form
  if (totalWords < 80 && narrativeContinuityScore < 0.5) {
    formScore += 3;
  }

  // ── 7. Decision ───────────────────────────────────────────────────────
  let detected = 'form';
  let reason = '';

  const maxScore = Math.max(tabScore, formScore, narrScore);

  if (maxScore === 0) {
    // Pure geometric fallback — when no keywords match at all,
    // default to form (cards, poor OCR, etc.) unless very strong
    // columnar or continuous-prose signal.
    if (peaks >= 3) {
      detected = 'tabular';
      reason = `No keywords; peaks=${peaks} → tabular`;
    } else if (narrativeContinuityScore > 0.75 && wordsPerLine > 8) {
      detected = 'narrative';
      reason = `No keywords; very high continuity → narrative`;
    } else {
      detected = 'form';
      reason = 'No keywords; default form';
    }
  } else if (tabScore > formScore && tabScore > narrScore) {
    detected = 'tabular';
    reason = `tab=${tabScore} > form=${formScore}, narr=${narrScore}`;
  } else if (narrScore > formScore && narrScore > tabScore) {
    detected = 'narrative';
    reason = `narr=${narrScore} > tab=${tabScore}, form=${formScore}`;
  } else if (formScore > tabScore && formScore > narrScore) {
    detected = 'form';
    reason = `form=${formScore} > tab=${tabScore}, narr=${narrScore}`;
  } else {
    // Tie-breaking
    if (tabScore === narrScore && tabScore > formScore) {
      detected = peaks >= 3 ? 'tabular' : 'narrative';
      reason = `tab=narr=${tabScore}; peaks=${peaks} → ${detected}`;
    } else if (tabScore === formScore && tabScore > narrScore) {
      detected = peaks >= 3 ? 'tabular' : 'form';
      reason = `tab=form=${tabScore}; peaks=${peaks} → ${detected}`;
    } else if (formScore === narrScore && formScore > tabScore) {
      detected = formLabelDensity > 0.2 ? 'form' : 'narrative';
      reason = `form=narr=${formScore}; labelDensity=${formLabelDensity.toFixed(2)} → ${detected}`;
    } else {
      detected = 'form';
      reason = `3-way tie (${tabScore}/${formScore}/${narrScore}); default form`;
    }
  }

  return {
    horizontalAlignmentScore,
    formLabelDensity,
    narrativeContinuityScore,
    wordsPerLine,
    peaks,
    variance,
    tabScore,
    formScore,
    narrScore,
    detected,
    reason
  };
}

// ── Run tests ──────────────────────────────────────────────────────────────
let matches = 0;
let total = 0;
for (const job of jobs) {
  const filePath = path.join(FEEDER_ROOT, `job_${job.id}`, 'page_0', 'vision_result.json');
  if (!fs.existsSync(filePath)) {
    console.log(`Job ${job.id} not found.`);
    continue;
  }
  total++;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const res = runClassification(data);
  const ok = res.detected === job.expected;
  if (ok) matches++;
  const status = ok ? '✅ MATCH' : '❌ MISMATCH';

  console.log(`Job ${job.id} (${job.name}) - Expected: ${job.expected} | Detected: ${res.detected} (${status})`);
  console.log(`  Scores: tab=${res.tabScore} form=${res.formScore} narr=${res.narrScore}`);
  console.log(`  Signals: align=${res.horizontalAlignmentScore.toFixed(2)} label=${res.formLabelDensity.toFixed(2)} cont=${res.narrativeContinuityScore.toFixed(2)} peaks=${res.peaks} var=${res.variance.toFixed(2)} wpl=${res.wordsPerLine.toFixed(1)}`);
  console.log(`  Reason: ${res.reason}\n`);
}

console.log(`\n========== ACCURACY: ${matches}/${total} (${(matches/total*100).toFixed(0)}%) ==========\n`);
