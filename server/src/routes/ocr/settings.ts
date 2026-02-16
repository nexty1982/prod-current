/**
 * Church-specific OCR Settings Routes
 * GET/PUT OCR settings for a church, with table auto-creation.
 * Extracted from index.ts lines ~1011-1339.
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
import { resolveChurchDb } from './helpers';

// GET /api/church/:churchId/ocr/settings
router.get('/', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    console.log(`[OCR Settings] GET /api/church/${churchId}/ocr/settings`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    const defaultSettings: any = {
      engine: 'google-vision',
      language: 'eng',
      defaultLanguage: 'en',
      dpi: 300,
      deskew: true,
      removeNoise: true,
      preprocessImages: true,
      outputFormat: 'json',
      confidenceThreshold: 75
    };

    try {
      const [settingsRows] = await db.query(`
        SELECT
          engine, language, dpi, deskew, remove_noise, preprocess_images, output_format,
          confidence_threshold, default_language, preprocessing_enabled, auto_rotate, noise_reduction,
          settings_json
        FROM ocr_settings
        WHERE church_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `, [churchId]);

      if (settingsRows.length > 0) {
        const s = settingsRows[0];
        const loadedSettings: any = {
          engine: s.engine || defaultSettings.engine,
          language: s.language || defaultSettings.language,
          defaultLanguage: s.default_language || 'en',
          dpi: s.dpi || defaultSettings.dpi,
          deskew: s.deskew !== undefined ? Boolean(s.deskew) : (s.auto_rotate !== undefined ? Boolean(s.auto_rotate) : defaultSettings.deskew),
          removeNoise: s.remove_noise !== undefined ? Boolean(s.remove_noise) : (s.noise_reduction !== undefined ? Boolean(s.noise_reduction) : defaultSettings.removeNoise),
          preprocessImages: s.preprocess_images !== undefined ? Boolean(s.preprocess_images) : (s.preprocessing_enabled !== undefined ? Boolean(s.preprocessing_enabled) : defaultSettings.preprocessImages),
          outputFormat: s.output_format || defaultSettings.outputFormat,
          confidenceThreshold: s.confidence_threshold !== null && s.confidence_threshold !== undefined ? Math.round(Number(s.confidence_threshold) * 100) : defaultSettings.confidenceThreshold
        };

        if (s.settings_json) {
          try {
            const jsonSettings = typeof s.settings_json === 'string'
              ? JSON.parse(s.settings_json)
              : s.settings_json;
            if (jsonSettings.documentProcessing) {
              loadedSettings.documentProcessing = jsonSettings.documentProcessing;
            }
            if (jsonSettings.documentDeletion) {
              loadedSettings.documentDeletion = jsonSettings.documentDeletion;
            }
          } catch (e) {
            console.warn('[OCR Settings] Failed to parse settings_json:', e);
          }
        }

        if (!loadedSettings.documentProcessing) {
          loadedSettings.documentProcessing = {
            spellingCorrection: 'fix',
            extractAllText: 'yes',
            improveFormatting: 'yes',
          };
        }
        if (!loadedSettings.documentDeletion) {
          loadedSettings.documentDeletion = {
            deleteAfter: 7,
            deleteUnit: 'days',
          };
        }

        console.log(`[OCR Settings] Loaded settings for church ${churchId}:`, loadedSettings);
        return res.json(loadedSettings);
      } else {
        console.log(`[OCR Settings] No saved settings found for church ${churchId}, using defaults`);
      }
    } catch (dbError: any) {
      console.warn('OCR settings table may not exist, using defaults:', dbError.message);
    }

    console.log(`[OCR Settings] Returning default settings for church ${churchId}`);
    const defaultResponse = {
      ...defaultSettings,
      documentProcessing: {
        spellingCorrection: 'fix',
        extractAllText: 'yes',
        improveFormatting: 'yes',
      },
      documentDeletion: {
        deleteAfter: 7,
        deleteUnit: 'days',
      },
    };
    res.json(defaultResponse);
  } catch (error: any) {
    console.error('Error fetching church OCR settings:', error);
    res.status(500).json({ error: 'Failed to fetch OCR settings', message: error.message });
  }
});

// PUT /api/church/:churchId/ocr/settings
router.put('/', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const settings = req.body;

    console.log(`[OCR Settings] PUT /api/church/${churchId}/ocr/settings - settings:`, JSON.stringify(settings));

    if (!churchId) {
      return res.status(400).json({ error: 'Invalid church ID' });
    }

    if (settings.documentProcessing || settings.documentDeletion) {
      // Allow partial updates for document processing/deletion
    } else if (!settings.engine || !settings.language) {
      return res.status(400).json({ error: 'Invalid settings', message: 'Engine and language are required' });
    }

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    // Ensure table exists with canonical schema
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS ocr_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          church_id INT NOT NULL,
          engine VARCHAR(50) DEFAULT 'google-vision',
          language VARCHAR(10) DEFAULT 'eng',
          default_language CHAR(2) DEFAULT 'en',
          dpi INT DEFAULT 300,
          deskew TINYINT(1) DEFAULT 1,
          remove_noise TINYINT(1) DEFAULT 1,
          preprocess_images TINYINT(1) DEFAULT 1,
          output_format VARCHAR(20) DEFAULT 'json',
          confidence_threshold DECIMAL(5,2) DEFAULT 0.75,
          preprocessing_enabled TINYINT(1) DEFAULT 1,
          auto_contrast TINYINT(1) DEFAULT 1,
          auto_rotate TINYINT(1) DEFAULT 1,
          noise_reduction TINYINT(1) DEFAULT 1,
          settings_json JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_church_settings (church_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (createError) {
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS ocr_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            church_id INT NOT NULL,
            engine VARCHAR(50) DEFAULT 'google-vision',
            language VARCHAR(10) DEFAULT 'eng',
            dpi INT DEFAULT 300,
            deskew TINYINT(1) DEFAULT 1,
            remove_noise TINYINT(1) DEFAULT 1,
            preprocess_images TINYINT(1) DEFAULT 1,
            output_format VARCHAR(20) DEFAULT 'json',
            confidence_threshold DECIMAL(5,2) DEFAULT 0.75,
            default_language CHAR(2) DEFAULT 'en',
            preprocessing_enabled TINYINT(1) DEFAULT 1,
            auto_contrast TINYINT(1) DEFAULT 1,
            auto_rotate TINYINT(1) DEFAULT 1,
            noise_reduction TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_church_settings (church_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      } catch (e) {}
    }

    // Normalize confidenceThreshold: API sends percent (0-100), DB stores fraction (0-1)
    const confidenceThresholdFraction = settings.confidenceThreshold !== null && settings.confidenceThreshold !== undefined
      ? Number(settings.confidenceThreshold) / 100
      : 0.75;

    const languageToDefaultLanguage = (lang: string): string => {
      const mapping: Record<string, string> = {
        'eng': 'en', 'ell': 'el', 'grc': 'gr', 'rus': 'ru',
        'ron': 'ro', 'srp': 'sr', 'bul': 'bg', 'ukr': 'uk'
      };
      return mapping[lang] || lang.substring(0, 2) || 'en';
    };

    const defaultLanguage = settings.defaultLanguage
      ? languageToDefaultLanguage(settings.defaultLanguage)
      : (settings.language ? languageToDefaultLanguage(settings.language) : 'en');

    const languageValue = settings.language !== undefined ? settings.language : null;

    await db.query(`
      INSERT INTO ocr_settings (
        church_id, engine, language, dpi, deskew, remove_noise,
        preprocess_images, output_format, confidence_threshold,
        default_language, preprocessing_enabled, auto_contrast, auto_rotate, noise_reduction,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        engine = COALESCE(VALUES(engine), engine),
        language = COALESCE(IFNULL(VALUES(language), language), language),
        dpi = COALESCE(VALUES(dpi), dpi),
        deskew = COALESCE(VALUES(deskew), deskew),
        remove_noise = COALESCE(VALUES(remove_noise), remove_noise),
        preprocess_images = COALESCE(VALUES(preprocess_images), preprocess_images),
        output_format = COALESCE(VALUES(output_format), output_format),
        confidence_threshold = COALESCE(VALUES(confidence_threshold), confidence_threshold),
        default_language = COALESCE(VALUES(default_language), default_language),
        preprocessing_enabled = COALESCE(VALUES(preprocess_images), preprocessing_enabled),
        auto_rotate = COALESCE(VALUES(deskew), auto_rotate),
        noise_reduction = COALESCE(VALUES(remove_noise), noise_reduction),
        updated_at = NOW()
    `, [
      churchId,
      settings.engine || 'google-vision',
      languageValue || 'eng',
      settings.dpi || 300,
      settings.deskew !== undefined ? (settings.deskew ? 1 : 0) : 1,
      settings.removeNoise !== undefined ? (settings.removeNoise ? 1 : 0) : 1,
      settings.preprocessImages !== undefined ? (settings.preprocessImages ? 1 : 0) : 1,
      settings.outputFormat || 'json',
      confidenceThresholdFraction,
      defaultLanguage,
      settings.preprocessImages !== undefined ? (settings.preprocessImages ? 1 : 0) : 1,
      1,
      settings.deskew !== undefined ? (settings.deskew ? 1 : 0) : 1,
      settings.removeNoise !== undefined ? (settings.removeNoise ? 1 : 0) : 1
    ]);

    // Verify the settings were saved
    const [verifyRows] = await db.query(`
      SELECT engine, language, dpi, deskew, remove_noise, preprocess_images, output_format, confidence_threshold
      FROM ocr_settings
      WHERE church_id = ?
    `, [churchId]);

    if (verifyRows.length > 0) {
      console.log(`✅ Saved OCR settings for church ${churchId}:`, verifyRows[0]);
    } else {
      console.error(`❌ Failed to verify saved settings for church ${churchId}`);
    }

    // Store document processing and deletion settings in JSON column
    if (settings.documentProcessing || settings.documentDeletion) {
      try {
        const settingsJson = JSON.stringify({
          documentProcessing: settings.documentProcessing,
          documentDeletion: settings.documentDeletion,
        });

        try {
          await db.query(`
            UPDATE ocr_settings
            SET settings_json = ?
            WHERE church_id = ?
          `, [settingsJson, churchId]);
        } catch (jsonError: any) {
          if (jsonError.code === 'ER_BAD_FIELD_ERROR') {
            await db.query(`ALTER TABLE ocr_settings ADD COLUMN settings_json JSON NULL`);
            await db.query(`
              UPDATE ocr_settings
              SET settings_json = ?
              WHERE church_id = ?
            `, [settingsJson, churchId]);
          } else {
            throw jsonError;
          }
        }
      } catch (jsonError) {
        console.warn('[OCR Settings] Failed to save document processing/deletion settings:', jsonError);
      }
    }

    res.json({ success: true, message: 'OCR settings saved successfully', settings: settings });
  } catch (error: any) {
    console.error('Error saving church OCR settings:', error);
    res.status(500).json({ error: 'Failed to save OCR settings', message: error.message });
  }
});

module.exports = router;
