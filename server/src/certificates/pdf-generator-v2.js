/**
 * Certificate PDF Generator v2 — Template-driven with PDF page embedding
 *
 * Uses pdf-lib to embed original OCA PDFs as backgrounds (preserving vector quality)
 * and overlays text fields at positions defined in certificate_template_fields.
 *
 * Key differences from v1:
 *   - PDF page embedding instead of PNG rasterization
 *   - Field positions from DB (certificate_template_fields) instead of hardcoded coordinate-maps
 *   - Supports all template types: baptism_adult, baptism_child, marriage, reception, funeral
 */

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Parse a hex color string to rgb values (0-1 range).
 */
function hexToRgb(hex) {
  if (!hex || hex === '#000000') return rgb(0, 0, 0);
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/**
 * Wrap text into lines that fit within maxWidth.
 */
function wrapText(text, font, fontSize, maxWidth) {
  if (!maxWidth) return [text];
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [''];
}

/**
 * Get the X offset for aligned text.
 */
function alignedX(text, x, align, font, fontSize, maxWidth) {
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  switch (align) {
    case 'center':
      return maxWidth ? x + (maxWidth - textWidth) / 2 : x - textWidth / 2;
    case 'right':
      return maxWidth ? x + maxWidth - textWidth : x - textWidth;
    case 'left':
    default:
      return x;
  }
}

/**
 * Resolve the embedded font for a given field definition.
 */
function resolveFont(fonts, fontFamily, fontWeight) {
  if (fontWeight === 'bold' || fontWeight === 'bold_italic') return fonts.bold;
  if (fontWeight === 'italic') return fonts.italic || fonts.regular;
  return fonts.regular;
}

/**
 * Draw a single field on a PDF page.
 */
function drawField(page, field, value, fonts) {
  if (!value || !String(value).trim()) return;

  const text = String(value);
  const fontSize = parseFloat(field.font_size) || 14;
  const x = parseFloat(field.x) || 0;
  const y = parseFloat(field.y) || 0;
  const maxWidth = field.width ? parseFloat(field.width) : null;
  const textAlign = field.text_align || 'center';
  const color = hexToRgb(field.color || '#000000');
  const font = resolveFont(fonts, field.font_family, field.font_weight);

  if (field.is_multiline && maxWidth) {
    const lines = wrapText(text, font, fontSize, maxWidth);
    const lineHeight = fontSize * 1.3;

    lines.forEach((line, i) => {
      const lineY = y - i * lineHeight;
      const lineX = alignedX(line, x, textAlign, font, fontSize, maxWidth);
      page.drawText(line, { x: lineX, y: lineY, size: fontSize, font, color });
    });
  } else {
    // Single line — truncate if necessary
    let displayText = text;
    if (maxWidth) {
      while (font.widthOfTextAtSize(displayText, fontSize) > maxWidth && displayText.length > 1) {
        displayText = displayText.slice(0, -1);
      }
      if (displayText.length < text.length) displayText += '…';
    }

    const textX = alignedX(displayText, x, textAlign, font, fontSize, maxWidth);
    page.drawText(displayText, { x: textX, y, size: fontSize, font, color });
  }
}

/**
 * Generate a certificate PDF from a resolved template + field values.
 *
 * @param {object} template — certificate_templates row (includes background_asset_path, page_width, page_height)
 * @param {object[]} fields — certificate_template_fields rows
 * @param {object} fieldValues — Map of field_key → rendered string value
 * @returns {Promise<Uint8Array>} — PDF bytes
 */
async function generateFromTemplate(template, fields, fieldValues) {
  const pdfDoc = await PDFDocument.create();

  // Embed standard fonts
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    bold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
  };

  const pageWidth = parseFloat(template.page_width) || 612;
  const pageHeight = parseFloat(template.page_height) || 792;

  // Try to load and embed the background PDF template
  let backgroundPage = null;
  if (template.background_asset_path) {
    const bgPath = path.isAbsolute(template.background_asset_path)
      ? template.background_asset_path
      : path.join(__dirname, '../../storage', template.background_asset_path);

    if (fs.existsSync(bgPath)) {
      try {
        const bgBytes = fs.readFileSync(bgPath);
        const bgDoc = await PDFDocument.load(bgBytes);
        const [embeddedPage] = await pdfDoc.embedPages(bgDoc.getPages());
        backgroundPage = embeddedPage;
      } catch (err) {
        console.error('[pdf-generator-v2] Failed to embed background PDF:', err.message);
      }
    } else {
      console.warn('[pdf-generator-v2] Background PDF not found:', bgPath);
    }
  }

  // Create the certificate page
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // Draw background
  if (backgroundPage) {
    page.drawPage(backgroundPage, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
  }

  // Draw each field
  for (const field of fields) {
    const value = fieldValues[field.field_key];
    drawField(page, field, value, fonts);
  }

  return await pdfDoc.save();
}

module.exports = {
  generateFromTemplate,
};
