const { getAppPool } = require('../config/db-compat');
// server/routes/certificates.js
const express = require('express');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { promisePool } = require('../config/db-compat');

const router = express.Router();

// Helper function to get localized text
const getLocalizedText = (type, field, language = 'en') => {
  const translations = {
    baptism: {
      en: {
        title: 'CERTIFICATE OF BAPTISM',
        certifies: 'This is to certify that',
        wasBaptized: 'was baptized on',
        atChurch: 'at',
        byPriest: 'by',
        witnesses: 'Witnesses:',
        godparents: 'Godparents:',
        date: 'Date:',
        place: 'Place of Birth:',
        parents: 'Parents:',
        seal: 'CHURCH SEAL'
      },
      el: {
        title: 'ΠΙΣΤΟΠΟΙΗΤΙΚΟ ΒΑΠΤΙΣΗΣ',
        certifies: 'Πιστοποιείται ότι',
        wasBaptized: 'βαπτίστηκε στις',
        atChurch: 'στην',
        byPriest: 'από τον',
        witnesses: 'Μάρτυρες:',
        godparents: 'Ανάδοχοι:',
        date: 'Ημερομηνία:',
        place: 'Τόπος Γέννησης:',
        parents: 'Γονείς:',
        seal: 'ΣΦΡΑΓΙΔΑ ΕΚΚΛΗΣΙΑΣ'
      }
    },
    marriage: {
      en: {
        title: 'CERTIFICATE OF MARRIAGE',
        certifies: 'This is to certify that',
        wereMarried: 'were married on',
        atChurch: 'at',
        byPriest: 'by',
        witnesses: 'Witnesses:',
        date: 'Date:',
        groom: 'Groom:',
        bride: 'Bride:',
        seal: 'CHURCH SEAL'
      },
      el: {
        title: 'ΠΙΣΤΟΠΟΙΗΤΙΚΟ ΓΑΜΟΥ',
        certifies: 'Πιστοποιείται ότι',
        wereMarried: 'παντρεύτηκαν στις',
        atChurch: 'στην',
        byPriest: 'από τον',
        witnesses: 'Μάρτυρες:',
        date: 'Ημερομηνία:',
        groom: 'Γαμπρός:',
        bride: 'Νύφη:',
        seal: 'ΣΦΡΑΓΙΔΑ ΕΚΚΛΗΣΙΑΣ'
      }
    }
  };

  return translations[type]?.[language]?.[field] || translations[type]?.en?.[field] || field;
};

// Generate baptism certificate
router.post('/generate/baptism/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { language = 'en', includeWatermark = true } = req.body;

    // Fetch baptism record
    const [rows] = await getAppPool().query(
      'SELECT * FROM baptism_records WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Baptism record not found' });
    }

    const record = rows[0];

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();

    // Load fonts
    const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const textFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    // Colors
    const darkBlue = rgb(0.1, 0.1, 0.5);
    const black = rgb(0, 0, 0);
    const gold = rgb(0.8, 0.6, 0.1);

    // Header decoration
    page.drawRectangle({
      x: 50,
      y: height - 80,
      width: width - 100,
      height: 3,
      color: gold,
    });

    // Title
    const title = getLocalizedText('baptism', 'title', language);
    page.drawText(title, {
      x: width / 2 - (title.length * 12),
      y: height - 120,
      size: 24,
      font: titleFont,
      color: darkBlue,
    });

    // Decorative line under title
    page.drawRectangle({
      x: width / 2 - 150,
      y: height - 135,
      width: 300,
      height: 1,
      color: gold,
    });

    let yPosition = height - 180;

    // Certificate text
    const certifiesText = getLocalizedText('baptism', 'certifies', language);
    page.drawText(certifiesText, {
      x: 80,
      y: yPosition,
      size: 14,
      font: textFont,
      color: black,
    });

    yPosition -= 30;

    // Person's name (emphasized)
    const fullName = `${record.first_name || ''} ${record.middle_name || ''} ${record.last_name || ''}`.trim();
    page.drawText(fullName, {
      x: width / 2 - (fullName.length * 8),
      y: yPosition,
      size: 18,
      font: titleFont,
      color: darkBlue,
    });

    yPosition -= 40;

    // Baptism details
    const wasBaptizedText = getLocalizedText('baptism', 'wasBaptized', language);
    const baptismDate = new Date(record.baptism_date).toLocaleDateString();
    page.drawText(`${wasBaptizedText} ${baptismDate}`, {
      x: 80,
      y: yPosition,
      size: 12,
      font: textFont,
      color: black,
    });

    yPosition -= 25;

    const atChurchText = getLocalizedText('baptism', 'atChurch', language);
    page.drawText(`${atChurchText} ${record.church_name || 'Orthodox Church'}`, {
      x: 80,
      y: yPosition,
      size: 12,
      font: textFont,
      color: black,
    });

    yPosition -= 25;

    const byPriestText = getLocalizedText('baptism', 'byPriest', language);
    page.drawText(`${byPriestText} ${record.priest_name || 'Father [Name]'}`, {
      x: 80,
      y: yPosition,
      size: 12,
      font: textFont,
      color: black,
    });

    yPosition -= 40;

    // Birth details
    const dateText = getLocalizedText('baptism', 'date', language);
    const birthDate = record.birth_date ? new Date(record.birth_date).toLocaleDateString() : '[Date]';
    page.drawText(`${dateText} ${birthDate}`, {
      x: 80,
      y: yPosition,
      size: 11,
      font: textFont,
      color: black,
    });

    yPosition -= 20;

    const placeText = getLocalizedText('baptism', 'place', language);
    page.drawText(`${placeText} ${record.birth_place || '[Place]'}`, {
      x: 80,
      y: yPosition,
      size: 11,
      font: textFont,
      color: black,
    });

    yPosition -= 20;

    const parentsText = getLocalizedText('baptism', 'parents', language);
    const fatherName = record.father_name || '[Father Name]';
    const motherName = record.mother_name || '[Mother Name]';
    page.drawText(`${parentsText} ${fatherName} & ${motherName}`, {
      x: 80,
      y: yPosition,
      size: 11,
      font: textFont,
      color: black,
    });

    yPosition -= 30;

    // Godparents
    const godparentsText = getLocalizedText('baptism', 'godparents', language);
    const godparent1 = record.godparent_1 || '[Godparent 1]';
    const godparent2 = record.godparent_2 || '';
    page.drawText(`${godparentsText} ${godparent1}${godparent2 ? ', ' + godparent2 : ''}`, {
      x: 80,
      y: yPosition,
      size: 11,
      font: textFont,
      color: black,
    });

    // Church seal area
    yPosition -= 80;
    const sealText = getLocalizedText('baptism', 'seal', language);
    page.drawText(sealText, {
      x: width - 200,
      y: yPosition,
      size: 10,
      font: italicFont,
      color: black,
    });

    // Decorative border
    page.drawRectangle({
      x: 40,
      y: 40,
      width: width - 80,
      height: height - 80,
      borderColor: gold,
      borderWidth: 2,
    });

    // Watermark if requested
    if (includeWatermark) {
      page.drawText('ORTHODOX CHURCH CERTIFICATE', {
        x: width / 2 - 120,
        y: height / 2,
        size: 30,
        font: titleFont,
        color: rgb(0.9, 0.9, 0.9),
        rotate: { type: 'degrees', angle: -45 },
      });
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="baptism-certificate-${id}.pdf"`);
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

// Generate marriage certificate
router.post('/generate/marriage/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { language = 'en', includeWatermark = true } = req.body;

    // Fetch marriage record
    const [rows] = await getAppPool().query(
      'SELECT * FROM marriage_records WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Marriage record not found' });
    }

    const record = rows[0];

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();

    // Load fonts
    const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const textFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    // Colors
    const darkBlue = rgb(0.1, 0.1, 0.5);
    const black = rgb(0, 0, 0);
    const gold = rgb(0.8, 0.6, 0.1);

    // Header decoration
    page.drawRectangle({
      x: 50,
      y: height - 80,
      width: width - 100,
      height: 3,
      color: gold,
    });

    // Title
    const title = getLocalizedText('marriage', 'title', language);
    page.drawText(title, {
      x: width / 2 - (title.length * 12),
      y: height - 120,
      size: 24,
      font: titleFont,
      color: darkBlue,
    });

    // Decorative line under title
    page.drawRectangle({
      x: width / 2 - 150,
      y: height - 135,
      width: 300,
      height: 1,
      color: gold,
    });

    let yPosition = height - 180;

    // Certificate text
    const certifiesText = getLocalizedText('marriage', 'certifies', language);
    page.drawText(certifiesText, {
      x: 80,
      y: yPosition,
      size: 14,
      font: textFont,
      color: black,
    });

    yPosition -= 40;

    // Groom details
    const groomText = getLocalizedText('marriage', 'groom', language);
    const groomName = `${record.groom_first_name || ''} ${record.groom_last_name || ''}`.trim();
    page.drawText(`${groomText} ${groomName}`, {
      x: 80,
      y: yPosition,
      size: 14,
      font: titleFont,
      color: darkBlue,
    });

    yPosition -= 30;

    // Bride details
    const brideText = getLocalizedText('marriage', 'bride', language);
    const brideName = `${record.bride_first_name || ''} ${record.bride_last_name || ''}`.trim();
    page.drawText(`${brideText} ${brideName}`, {
      x: 80,
      y: yPosition,
      size: 14,
      font: titleFont,
      color: darkBlue,
    });

    yPosition -= 40;

    // Marriage details
    const wereMarriedText = getLocalizedText('marriage', 'wereMarried', language);
    const marriageDate = new Date(record.marriage_date).toLocaleDateString();
    page.drawText(`${wereMarriedText} ${marriageDate}`, {
      x: 80,
      y: yPosition,
      size: 12,
      font: textFont,
      color: black,
    });

    yPosition -= 25;

    const atChurchText = getLocalizedText('marriage', 'atChurch', language);
    page.drawText(`${atChurchText} ${record.church_name || 'Orthodox Church'}`, {
      x: 80,
      y: yPosition,
      size: 12,
      font: textFont,
      color: black,
    });

    yPosition -= 25;

    const byPriestText = getLocalizedText('marriage', 'byPriest', language);
    page.drawText(`${byPriestText} ${record.priest_name || 'Father [Name]'}`, {
      x: 80,
      y: yPosition,
      size: 12,
      font: textFont,
      color: black,
    });

    yPosition -= 40;

    // Witnesses
    const witnessesText = getLocalizedText('marriage', 'witnesses', language);
    const witness1 = record.witness_1 || '[Witness 1]';
    const witness2 = record.witness_2 || '[Witness 2]';
    page.drawText(`${witnessesText} ${witness1}, ${witness2}`, {
      x: 80,
      y: yPosition,
      size: 11,
      font: textFont,
      color: black,
    });

    // Church seal area
    yPosition -= 80;
    const sealText = getLocalizedText('marriage', 'seal', language);
    page.drawText(sealText, {
      x: width - 200,
      y: yPosition,
      size: 10,
      font: italicFont,
      color: black,
    });

    // Decorative border
    page.drawRectangle({
      x: 40,
      y: 40,
      width: width - 80,
      height: height - 80,
      borderColor: gold,
      borderWidth: 2,
    });

    // Watermark if requested
    if (includeWatermark) {
      page.drawText('ORTHODOX CHURCH CERTIFICATE', {
        x: width / 2 - 120,
        y: height / 2,
        size: 30,
        font: titleFont,
        color: rgb(0.9, 0.9, 0.9),
        rotate: { type: 'degrees', angle: -45 },
      });
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="marriage-certificate-${id}.pdf"`);
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

// Preview certificate (base64 encoded)
router.post('/preview/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { language = 'en' } = req.body;

    let tableName, queryField;
    if (type === 'baptism') {
      tableName = 'baptism_records';
    } else if (type === 'marriage') {
      tableName = 'marriage_records';
    } else {
      return res.status(400).json({ error: 'Invalid certificate type' });
    }

    // For preview, we'll return a simplified JSON representation
    // In a real implementation, you might generate a smaller PDF or image
    const [rows] = await getAppPool().query(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = rows[0];
    
    // Return preview data
    res.json({
      type,
      language,
      title: getLocalizedText(type, 'title', language),
      record,
      previewUrl: `/api/certificates/generate/${type}/${id}?preview=true`
    });

  } catch (error) {
    console.error('Certificate preview error:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

module.exports = router;
