import Jimp from 'jimp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputImage = join(__dirname, 'public', 'images', 'about.png');
const outputImage = join(__dirname, 'public', 'images', 'about.png'); // Overwrite original

// Dark indigo blue color: #1a1a2e
const backgroundColor = Jimp.rgbaToInt(26, 26, 46, 255);

async function modifyImage() {
  try {
    console.log('Loading image:', inputImage);
    
    // Load the image
    const image = await Jimp.read(inputImage);
    
    console.log('Image dimensions:', image.getWidth(), 'x', image.getHeight());
    
    // Create a new image with the background color
    const background = new Jimp(image.getWidth(), image.getHeight(), backgroundColor);
    
    // Composite the original image over the background
    // This replaces transparent areas with the background color
    background.composite(image, 0, 0, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 1,
      opacityDest: 1
    });
    
    // Also replace white/light pixels in the composited image with the background color
    background.scan(0, 0, background.getWidth(), background.getHeight(), function (x, y, idx) {
      const red = this.bitmap.data[idx];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      const alpha = this.bitmap.data[idx + 3];
      
      // If pixel is white or very light (and not transparent), replace with background
      if (alpha > 0 && red > 240 && green > 240 && blue > 240) {
        this.bitmap.data[idx] = 26;     // R
        this.bitmap.data[idx + 1] = 26; // G
        this.bitmap.data[idx + 2] = 46; // B
        // Keep original alpha
      }
    });
    
    // Save the modified image
    await background.writeAsync(outputImage);
    
    console.log('Image modified successfully!');
    console.log('Output saved to:', outputImage);
    
  } catch (error) {
    console.error('Error modifying image:', error);
    process.exit(1);
  }
}

modifyImage();

