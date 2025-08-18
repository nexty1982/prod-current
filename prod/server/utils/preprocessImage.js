// server/utils/preprocessImage.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Preprocess image for better OCR results
 * @param {string} inputPath - Path to original image
 * @param {string} outputPath - Path for processed image
 * @returns {Promise<string>} - Path to processed image
 */
async function preprocessImage(inputPath, outputPath) {
    try {
        console.log(`Starting image preprocessing: ${inputPath}`);

        // Get image metadata
        const metadata = await sharp(inputPath).metadata();
        console.log(`Image metadata:`, {
            format: metadata.format,
            width: metadata.width,
            height: metadata.height,
            channels: metadata.channels
        });

        // Apply preprocessing pipeline
        await sharp(inputPath)
            // Convert to grayscale for better OCR
            .grayscale()
            // Normalize contrast
            .normalize()
            // Apply slight sharpening
            .sharpen()
            // Ensure minimum DPI for OCR
            .png({ quality: 100 })
            .toFile(outputPath);

        console.log(`✅ Image preprocessed successfully: ${outputPath}`);
        return outputPath;

    } catch (error) {
        console.error('❌ Error preprocessing image:', error);

        // If preprocessing fails, return original path
        console.log('Falling back to original image');
        return inputPath;
    }
}

/**
 * Advanced preprocessing with additional steps
 * @param {string} inputPath - Path to original image
 * @param {string} outputPath - Path for processed image
 * @returns {Promise<string>} - Path to processed image
 */
async function advancedPreprocessImage(inputPath, outputPath) {
    try {
        console.log(`Starting advanced image preprocessing: ${inputPath}`);

        const tempPath = outputPath.replace(/\.(jpg|jpeg|png)$/i, '_temp.png');

        // Step 1: Basic preprocessing
        await sharp(inputPath)
            .grayscale()
            .normalize()
            .sharpen()
            .png()
            .toFile(tempPath);

        // Step 2: Apply threshold for binarization
        await sharp(tempPath)
            .threshold(128) // Convert to black and white
            .png()
            .toFile(outputPath);

        // Clean up temp file
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }

        console.log(`✅ Advanced preprocessing completed: ${outputPath}`);
        return outputPath;

    } catch (error) {
        console.error('❌ Error in advanced preprocessing:', error);

        // Try basic preprocessing as fallback
        try {
            return await preprocessImage(inputPath, outputPath);
        } catch (fallbackError) {
            console.error('❌ Fallback preprocessing also failed:', fallbackError);
            return inputPath;
        }
    }
}

/**
 * Clean up temporary files
 * @param {Array<string>} filePaths - Array of file paths to delete
 */
function cleanupTempFiles(filePaths) {
    filePaths.forEach(filePath => {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Cleaned up temp file: ${filePath}`);
            }
        } catch (error) {
            console.error(`Failed to clean up file ${filePath}:`, error);
        }
    });
}

module.exports = {
    preprocessImage,
    advancedPreprocessImage,
    cleanupTempFiles
};
