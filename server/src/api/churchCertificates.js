/**
 * Church-specific Certificate Generation API
 * Uses canvas for preview (PNG) and pdf-lib for PDF generation
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { getChurchPool } = require('../db/pool');

// Template paths
const BAPTISM_TEMPLATE_PATH = path.join(__dirname, '../templates/baptism_certificate_template.png');
const MARRIAGE_TEMPLATE_PATH = path.join(__dirname, '../templates/marriage_certificate_template.png');

// Default field positions for baptism certificate
const BAPTISM_POSITIONS = {
  fullName: { x: 383, y: 574 },
  birthplace: { x: 400, y: 600 },
  birthDate: { x: 444, y: 626 },
  clergy: { x: 410, y: 698 },
  church: { x: 514, y: 724 },
  baptismDate: { x: 424, y: 754 },
  sponsors: { x: 400, y: 784 }
};

// Default field positions for marriage certificate
const MARRIAGE_POSITIONS = {
  groomName: { x: 383, y: 574 },
  groomParents: { x: 400, y: 600 },
  brideName: { x: 383, y: 626 },
  brideParents: { x: 400, y: 652 },
  marriageDate: { x: 444, y: 678 },
  marriagePlace: { x: 410, y: 704 },
  clergy: { x: 410, y: 730 },
  church: { x: 514, y: 756 },
  witnesses: { x: 400, y: 782 }
};

/**
 * Generate baptism certificate preview using canvas (PNG)
 */
const generateBaptismPreview = async (record, fieldOffsets = {}, hiddenFields = []) => {
  // Check if template exists, if not create a simple certificate
  let canvas, ctx;
  
  if (fs.existsSync(BAPTISM_TEMPLATE_PATH)) {
    const image = await loadImage(BAPTISM_TEMPLATE_PATH);
    canvas = createCanvas(image.width, image.height);
    ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
  } else {
    // Create a simple certificate without template
    canvas = createCanvas(800, 1000);
    ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 1000);
    
    // Gold border
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 8;
    ctx.strokeRect(30, 30, 740, 940);
    
    // Inner border
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, 700, 900);
    
    // Header
    ctx.fillStyle = '#1a365d';
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE OF BAPTISM', 400, 120);
    
    // Decorative line
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(150, 140);
    ctx.lineTo(650, 140);
    ctx.stroke();
    
    // Orthodox cross symbol
    ctx.font = '48px serif';
    ctx.fillText('☦', 400, 200);
  }

  // Text config
  ctx.font = '28px serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';

  const positions = {};
  Object.keys(BAPTISM_POSITIONS).forEach(key => {
    positions[key] = {
      x: BAPTISM_POSITIONS[key].x + (fieldOffsets[key]?.x || 0),
      y: BAPTISM_POSITIONS[key].y + (fieldOffsets[key]?.y || 0)
    };
  });

  // For template-less version, use different positions
  if (!fs.existsSync(BAPTISM_TEMPLATE_PATH)) {
    const baseY = 280;
    const lineHeight = 50;
    
    ctx.font = '20px serif';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    
    ctx.fillText('This is to certify that', 400, baseY);
    
    // Full name (emphasized)
    const fullName = `${record.first_name || ''} ${record.last_name || ''}`.trim() || '[Name]';
    ctx.font = 'bold 32px serif';
    ctx.fillStyle = '#1a365d';
    ctx.fillText(fullName, 400, baseY + lineHeight);
    
    ctx.font = '20px serif';
    ctx.fillStyle = '#333333';
    
    // Birth info
    const birthDate = record.birth_date ? new Date(record.birth_date).toLocaleDateString() : '[Birth Date]';
    ctx.fillText(`Born: ${birthDate}`, 400, baseY + lineHeight * 2);
    
    const birthplace = record.birthplace || '[Birthplace]';
    ctx.fillText(`Place of Birth: ${birthplace}`, 400, baseY + lineHeight * 2.8);
    
    // Baptism info
    ctx.fillText('was received into the Holy Orthodox Church through', 400, baseY + lineHeight * 4);
    ctx.font = 'bold 24px serif';
    ctx.fillText('HOLY BAPTISM', 400, baseY + lineHeight * 4.8);
    
    ctx.font = '20px serif';
    const receptionDate = record.reception_date ? new Date(record.reception_date).toLocaleDateString() : '[Baptism Date]';
    ctx.fillText(`on ${receptionDate}`, 400, baseY + lineHeight * 5.6);
    
    // Parents
    const parents = record.parents || '[Parents]';
    ctx.fillText(`Parents: ${parents}`, 400, baseY + lineHeight * 6.8);
    
    // Sponsors
    const sponsors = record.sponsors || '[Sponsors/Godparents]';
    ctx.fillText(`Sponsors: ${sponsors}`, 400, baseY + lineHeight * 7.6);
    
    // Clergy
    const clergy = record.clergy || '[Clergy]';
    ctx.fillText(`Officiated by: ${clergy}`, 400, baseY + lineHeight * 8.8);
    
    // Church seal area
    ctx.font = 'italic 16px serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('Church Seal', 650, 900);
    
    // Signature line
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(500, 880);
    ctx.lineTo(750, 880);
    ctx.stroke();
    ctx.fillText('Priest Signature', 625, 870);
  } else {
    // Use template positions
    if (!hiddenFields.includes('fullName')) {
      const fullName = `${record.first_name || ''} ${record.last_name || ''}`.trim();
      if (fullName) ctx.fillText(fullName, positions.fullName.x, positions.fullName.y);
    }
    
    if (record.birthplace && !hiddenFields.includes('birthplace')) {
      ctx.fillText(record.birthplace, positions.birthplace.x, positions.birthplace.y);
    }
    
    if (record.birth_date && !hiddenFields.includes('birthDate')) {
      const birthDate = new Date(record.birth_date).toLocaleDateString();
      ctx.fillText(birthDate, positions.birthDate.x, positions.birthDate.y);
    }
    
    if (record.clergy && !hiddenFields.includes('clergy')) {
      ctx.fillText(record.clergy, positions.clergy.x, positions.clergy.y);
    }
    
    if (!hiddenFields.includes('church')) {
      ctx.fillText('Orthodox Church in America', positions.church.x, positions.church.y);
    }
    
    if (record.reception_date && !hiddenFields.includes('baptismDate')) {
      const baptismDate = new Date(record.reception_date).toLocaleDateString();
      ctx.fillText(baptismDate, positions.baptismDate.x, positions.baptismDate.y);
    }
    
    if (record.sponsors && !hiddenFields.includes('sponsors')) {
      ctx.fillText(record.sponsors, positions.sponsors.x, positions.sponsors.y);
    }
  }

  return canvas;
};

/**
 * Generate marriage certificate preview using canvas (PNG)
 */
const generateMarriagePreview = async (record, fieldOffsets = {}, hiddenFields = []) => {
  let canvas, ctx;
  
  if (fs.existsSync(MARRIAGE_TEMPLATE_PATH)) {
    const image = await loadImage(MARRIAGE_TEMPLATE_PATH);
    canvas = createCanvas(image.width, image.height);
    ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
  } else {
    // Create a simple certificate without template
    canvas = createCanvas(800, 1000);
    ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 1000);
    
    // Gold border
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 8;
    ctx.strokeRect(30, 30, 740, 940);
    
    // Inner border
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, 700, 900);
    
    // Header
    ctx.fillStyle = '#1a365d';
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE OF MARRIAGE', 400, 120);
    
    // Decorative line
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(150, 140);
    ctx.lineTo(650, 140);
    ctx.stroke();
    
    // Orthodox cross symbol
    ctx.font = '48px serif';
    ctx.fillText('☦', 400, 200);
  }

  // Text config
  ctx.font = '28px serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';

  // For template-less version
  if (!fs.existsSync(MARRIAGE_TEMPLATE_PATH)) {
    const baseY = 260;
    const lineHeight = 45;
    
    ctx.font = '20px serif';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    
    ctx.fillText('This is to certify that', 400, baseY);
    
    // Groom name
    const groomName = `${record.fname_groom || record.groom_first_name || ''} ${record.lname_groom || record.groom_last_name || ''}`.trim() || '[Groom Name]';
    ctx.font = 'bold 28px serif';
    ctx.fillStyle = '#1a365d';
    ctx.fillText(groomName, 400, baseY + lineHeight);
    
    ctx.font = '20px serif';
    ctx.fillStyle = '#333333';
    ctx.fillText('and', 400, baseY + lineHeight * 1.7);
    
    // Bride name
    const brideName = `${record.fname_bride || record.bride_first_name || ''} ${record.lname_bride || record.bride_last_name || ''}`.trim() || '[Bride Name]';
    ctx.font = 'bold 28px serif';
    ctx.fillStyle = '#1a365d';
    ctx.fillText(brideName, 400, baseY + lineHeight * 2.4);
    
    ctx.font = '20px serif';
    ctx.fillStyle = '#333333';
    ctx.fillText('were united in Holy Matrimony', 400, baseY + lineHeight * 3.4);
    
    // Marriage date
    const marriageDate = record.marriage_date ? new Date(record.marriage_date).toLocaleDateString() : '[Marriage Date]';
    ctx.fillText(`on ${marriageDate}`, 400, baseY + lineHeight * 4.2);
    
    // Parents
    const groomParents = record.parentsg || record.parents_groom || '[Groom\'s Parents]';
    ctx.fillText(`Groom's Parents: ${groomParents}`, 400, baseY + lineHeight * 5.4);
    
    const brideParents = record.parentsb || record.parents_bride || '[Bride\'s Parents]';
    ctx.fillText(`Bride's Parents: ${brideParents}`, 400, baseY + lineHeight * 6.2);
    
    // Witnesses
    const witnesses = record.witnesses || '[Witnesses]';
    ctx.fillText(`Witnesses: ${witnesses}`, 400, baseY + lineHeight * 7.4);
    
    // Clergy
    const clergy = record.clergy || '[Clergy]';
    ctx.fillText(`Officiated by: ${clergy}`, 400, baseY + lineHeight * 8.4);
    
    // Church seal area
    ctx.font = 'italic 16px serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('Church Seal', 650, 900);
    
    // Signature line
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(500, 880);
    ctx.lineTo(750, 880);
    ctx.stroke();
    ctx.fillText('Priest Signature', 625, 870);
  }

  return canvas;
};

/**
 * Generate baptism certificate PDF using pdf-lib
 */
const generateBaptismPDF = async (record) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();

  const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const textFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const darkBlue = rgb(0.1, 0.2, 0.4);
  const black = rgb(0, 0, 0);
  const gold = rgb(0.79, 0.63, 0.15);

  // Decorative border
  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: gold,
    borderWidth: 3,
  });

  page.drawRectangle({
    x: 40,
    y: 40,
    width: width - 80,
    height: height - 80,
    borderColor: gold,
    borderWidth: 1,
  });

  // Title
  const title = 'CERTIFICATE OF BAPTISM';
  const titleWidth = titleFont.widthOfTextAtSize(title, 28);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height - 100,
    size: 28,
    font: titleFont,
    color: darkBlue,
  });

  // Decorative line under title
  page.drawLine({
    start: { x: width / 2 - 150, y: height - 115 },
    end: { x: width / 2 + 150, y: height - 115 },
    thickness: 2,
    color: gold,
  });

  let yPosition = height - 180;
  const leftMargin = 80;

  // Certificate text
  page.drawText('This is to certify that', {
    x: leftMargin,
    y: yPosition,
    size: 14,
    font: textFont,
    color: black,
  });

  yPosition -= 40;

  // Full name
  const fullName = `${record.first_name || ''} ${record.last_name || ''}`.trim() || '[Name]';
  const nameWidth = titleFont.widthOfTextAtSize(fullName, 22);
  page.drawText(fullName, {
    x: (width - nameWidth) / 2,
    y: yPosition,
    size: 22,
    font: titleFont,
    color: darkBlue,
  });

  yPosition -= 50;

  // Birth details
  const birthDate = record.birth_date ? new Date(record.birth_date).toLocaleDateString() : '[Birth Date]';
  page.drawText(`Born: ${birthDate}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: textFont,
    color: black,
  });

  yPosition -= 25;

  const birthplace = record.birthplace || '[Birthplace]';
  page.drawText(`Place of Birth: ${birthplace}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: textFont,
    color: black,
  });

  yPosition -= 40;

  page.drawText('was received into the Holy Orthodox Church through', {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: textFont,
    color: black,
  });

  yPosition -= 30;

  const holyBaptismWidth = titleFont.widthOfTextAtSize('HOLY BAPTISM', 18);
  page.drawText('HOLY BAPTISM', {
    x: (width - holyBaptismWidth) / 2,
    y: yPosition,
    size: 18,
    font: titleFont,
    color: darkBlue,
  });

  yPosition -= 35;

  const receptionDate = record.reception_date ? new Date(record.reception_date).toLocaleDateString() : '[Baptism Date]';
  page.drawText(`on ${receptionDate}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: textFont,
    color: black,
  });

  yPosition -= 40;

  // Parents
  const parents = record.parents || '[Parents]';
  page.drawText(`Parents: ${parents}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: textFont,
    color: black,
  });

  yPosition -= 25;

  // Sponsors
  const sponsors = record.sponsors || '[Sponsors/Godparents]';
  page.drawText(`Sponsors: ${sponsors}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: textFont,
    color: black,
  });

  yPosition -= 40;

  // Clergy
  const clergy = record.clergy || '[Clergy]';
  page.drawText(`Officiated by: ${clergy}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: textFont,
    color: black,
  });

  // Signature area
  page.drawLine({
    start: { x: width - 250, y: 120 },
    end: { x: width - 50, y: 120 },
    thickness: 1,
    color: black,
  });

  page.drawText('Priest Signature', {
    x: width - 200,
    y: 100,
    size: 10,
    font: italicFont,
    color: black,
  });

  page.drawText('Church Seal', {
    x: width - 200,
    y: 60,
    size: 10,
    font: italicFont,
    color: black,
  });

  return pdfDoc.save();
};

/**
 * Generate marriage certificate PDF using pdf-lib
 */
const generateMarriagePDF = async (record) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const textFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const darkBlue = rgb(0.1, 0.2, 0.4);
  const black = rgb(0, 0, 0);
  const gold = rgb(0.79, 0.63, 0.15);

  // Decorative border
  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: gold,
    borderWidth: 3,
  });

  page.drawRectangle({
    x: 40,
    y: 40,
    width: width - 80,
    height: height - 80,
    borderColor: gold,
    borderWidth: 1,
  });

  // Title
  const title = 'CERTIFICATE OF MARRIAGE';
  const titleWidth = titleFont.widthOfTextAtSize(title, 28);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height - 100,
    size: 28,
    font: titleFont,
    color: darkBlue,
  });

  // Decorative line
  page.drawLine({
    start: { x: width / 2 - 150, y: height - 115 },
    end: { x: width / 2 + 150, y: height - 115 },
    thickness: 2,
    color: gold,
  });

  let yPosition = height - 180;
  const leftMargin = 80;

  page.drawText('This is to certify that', {
    x: leftMargin,
    y: yPosition,
    size: 14,
    font: textFont,
    color: black,
  });

  yPosition -= 40;

  // Groom name
  const groomName = `${record.fname_groom || record.groom_first_name || ''} ${record.lname_groom || record.groom_last_name || ''}`.trim() || '[Groom Name]';
  const groomWidth = titleFont.widthOfTextAtSize(groomName, 20);
  page.drawText(groomName, {
    x: (width - groomWidth) / 2,
    y: yPosition,
    size: 20,
    font: titleFont,
    color: darkBlue,
  });

  yPosition -= 30;

  const andWidth = textFont.widthOfTextAtSize('and', 14);
  page.drawText('and', {
    x: (width - andWidth) / 2,
    y: yPosition,
    size: 14,
    font: textFont,
    color: black,
  });

  yPosition -= 30;

  // Bride name
  const brideName = `${record.fname_bride || record.bride_first_name || ''} ${record.lname_bride || record.bride_last_name || ''}`.trim() || '[Bride Name]';
  const brideWidth = titleFont.widthOfTextAtSize(brideName, 20);
  page.drawText(brideName, {
    x: (width - brideWidth) / 2,
    y: yPosition,
    size: 20,
    font: titleFont,
    color: darkBlue,
  });

  yPosition -= 40;

  page.drawText('were united in Holy Matrimony', {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: textFont,
    color: black,
  });

  yPosition -= 30;

  const marriageDate = record.marriage_date ? new Date(record.marriage_date).toLocaleDateString() : '[Marriage Date]';
  page.drawText(`on ${marriageDate}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: textFont,
    color: black,
  });

  yPosition -= 40;

  // Parents
  const groomParents = record.parentsg || record.parents_groom || '[Groom\'s Parents]';
  page.drawText(`Groom's Parents: ${groomParents}`, {
    x: leftMargin,
    y: yPosition,
    size: 11,
    font: textFont,
    color: black,
  });

  yPosition -= 25;

  const brideParents = record.parentsb || record.parents_bride || '[Bride\'s Parents]';
  page.drawText(`Bride's Parents: ${brideParents}`, {
    x: leftMargin,
    y: yPosition,
    size: 11,
    font: textFont,
    color: black,
  });

  yPosition -= 35;

  // Witnesses
  const witnesses = record.witnesses || '[Witnesses]';
  page.drawText(`Witnesses: ${witnesses}`, {
    x: leftMargin,
    y: yPosition,
    size: 11,
    font: textFont,
    color: black,
  });

  yPosition -= 35;

  // Clergy
  const clergy = record.clergy || '[Clergy]';
  page.drawText(`Officiated by: ${clergy}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: textFont,
    color: black,
  });

  // Signature area
  page.drawLine({
    start: { x: width - 250, y: 120 },
    end: { x: width - 50, y: 120 },
    thickness: 1,
    color: black,
  });

  page.drawText('Priest Signature', {
    x: width - 200,
    y: 100,
    size: 10,
    font: italicFont,
    color: black,
  });

  page.drawText('Church Seal', {
    x: width - 200,
    y: 60,
    size: 10,
    font: italicFont,
    color: black,
  });

  return pdfDoc.save();
};

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/church/:churchId/certificate/baptism/:id/preview
 * Generate baptism certificate preview (PNG via canvas)
 */
router.post('/baptism/:id/preview', async (req, res) => {
  const { churchId } = req.params;
  const id = parseInt(req.params.id);
  
  if (!churchId) {
    return res.status(400).json({ success: false, error: 'Church ID is required' });
  }
  if (!id) {
    return res.status(400).json({ success: false, error: 'Invalid record ID' });
  }

  try {
    const pool = getChurchPool(churchId);
    const [rows] = await pool.query('SELECT * FROM baptism_records WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Baptism record not found' });
    }

    const record = rows[0];
    const fieldOffsets = req.body.fieldOffsets || {};
    const hiddenFields = req.body.hiddenFields || [];

    const canvas = await generateBaptismPreview(record, fieldOffsets, hiddenFields);
    const buffer = canvas.toBuffer('image/png');
    const base64Image = buffer.toString('base64');

    res.json({
      success: true,
      preview: `data:image/png;base64,${base64Image}`,
      positions: BAPTISM_POSITIONS,
      record: {
        id: record.id,
        first_name: record.first_name,
        last_name: record.last_name,
      }
    });

  } catch (err) {
    console.error('Baptism certificate preview error:', err);
    res.status(500).json({ success: false, error: err.message || 'Error generating preview' });
  }
});

/**
 * GET /api/church/:churchId/certificate/baptism/:id/download
 * Download baptism certificate (PDF via pdf-lib)
 */
router.get('/baptism/:id/download', async (req, res) => {
  const { churchId } = req.params;
  const id = parseInt(req.params.id);
  
  if (!churchId) {
    return res.status(400).send('Church ID is required');
  }
  if (!id) {
    return res.status(400).send('Invalid record ID');
  }

  try {
    const pool = getChurchPool(churchId);
    const [rows] = await pool.query('SELECT * FROM baptism_records WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).send('Baptism record not found');
    }

    const record = rows[0];
    const pdfBytes = await generateBaptismPDF(record);

    const filename = `baptism_certificate_${record.first_name || 'unknown'}_${record.last_name || 'unknown'}_${id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error('Baptism certificate download error:', err);
    res.status(500).send('Error generating certificate');
  }
});

/**
 * POST /api/church/:churchId/certificate/marriage/:id/preview
 * Generate marriage certificate preview (PNG via canvas)
 */
router.post('/marriage/:id/preview', async (req, res) => {
  const { churchId } = req.params;
  const id = parseInt(req.params.id);
  
  if (!churchId) {
    return res.status(400).json({ success: false, error: 'Church ID is required' });
  }
  if (!id) {
    return res.status(400).json({ success: false, error: 'Invalid record ID' });
  }

  try {
    const pool = getChurchPool(churchId);
    const [rows] = await pool.query('SELECT * FROM marriage_records WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Marriage record not found' });
    }

    const record = rows[0];
    const fieldOffsets = req.body.fieldOffsets || {};
    const hiddenFields = req.body.hiddenFields || [];

    const canvas = await generateMarriagePreview(record, fieldOffsets, hiddenFields);
    const buffer = canvas.toBuffer('image/png');
    const base64Image = buffer.toString('base64');

    res.json({
      success: true,
      preview: `data:image/png;base64,${base64Image}`,
      positions: MARRIAGE_POSITIONS,
      record: {
        id: record.id,
        groom: `${record.fname_groom || ''} ${record.lname_groom || ''}`.trim(),
        bride: `${record.fname_bride || ''} ${record.lname_bride || ''}`.trim(),
      }
    });

  } catch (err) {
    console.error('Marriage certificate preview error:', err);
    res.status(500).json({ success: false, error: err.message || 'Error generating preview' });
  }
});

/**
 * GET /api/church/:churchId/certificate/marriage/:id/download
 * Download marriage certificate (PDF via pdf-lib)
 */
router.get('/marriage/:id/download', async (req, res) => {
  const { churchId } = req.params;
  const id = parseInt(req.params.id);
  
  if (!churchId) {
    return res.status(400).send('Church ID is required');
  }
  if (!id) {
    return res.status(400).send('Invalid record ID');
  }

  try {
    const pool = getChurchPool(churchId);
    const [rows] = await pool.query('SELECT * FROM marriage_records WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).send('Marriage record not found');
    }

    const record = rows[0];
    const pdfBytes = await generateMarriagePDF(record);

    const groomName = `${record.fname_groom || 'unknown'}_${record.lname_groom || ''}`.trim();
    const brideName = `${record.fname_bride || 'unknown'}_${record.lname_bride || ''}`.trim();
    const filename = `marriage_certificate_${groomName}_${brideName}_${id}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error('Marriage certificate download error:', err);
    res.status(500).send('Error generating certificate');
  }
});

module.exports = router;

