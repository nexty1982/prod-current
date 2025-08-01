# Avatar Extractor

This project provides two solutions for extracting 9 individual character avatars from a 3x3 grid image:

1. A Python script for command-line extraction
2. A Next.js web application with a React component for browser-based extraction

Both solutions extract avatars sized exactly 200x200 pixels and save them with the naming convention: avatar_1.png, avatar_2.png, etc.

## Python Script Solution

### Requirements
- Python 3.6+
- Pillow library (`pip install Pillow`)

### Usage

```bash
# Install the required library
pip install Pillow

# Run the script
python extract_avatars.py path/to/your/profile-images.png
```

The script will:
1. Extract each avatar from the 3x3 grid
2. Resize each avatar to exactly 200x200 pixels if needed
3. Save the avatars to the `public/images/profile/` directory with the naming convention:
   - avatar_1.png (top-left)
   - avatar_2.png (top-center)
   - avatar_3.png (top-right)
   - avatar_4.png (middle-left)
   - avatar_5.png (middle-center)
   - avatar_6.png (middle-right)
   - avatar_7.png (bottom-left)
   - avatar_8.png (bottom-center)
   - avatar_9.png (bottom-right)

## Web Application Solution

### Requirements
- Node.js 14+ and npm/yarn

### Setup and Usage

```bash
# Install dependencies
npm install
# or
yarn install

# Run the development server
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to use the web application.

### Features
- Upload any 3x3 grid image
- Extract all 9 avatars at once
- Preview all extracted avatars
- Download individual avatars or all at once
- Each avatar is automatically sized to 200x200 pixels

### How to Use the Web App
1. Click "Choose File" to upload your 3x3 grid image
2. Click "Extract Avatars" to process the image
3. Preview the extracted avatars
4. Download individual avatars or click "Download All Avatars"

## Implementation Details

### Python Script
The Python script uses the Pillow library to:
1. Open the source image
2. Calculate the dimensions for each avatar based on dividing the image into a 3x3 grid
3. Crop each section and resize to exactly 200x200 pixels
4. Save each avatar as a separate PNG file

### React Component
The TypeScript React component uses the HTML5 Canvas API to:
1. Load the uploaded image
2. Calculate the dimensions for each avatar
3. Extract each section and draw it to a canvas at 200x200 pixels
4. Convert each canvas to a PNG blob
5. Create downloadable links for each avatar

## License
MIT