# Orthodox Avatar Image Setup Instructions

## Avatar Images Provided
You have provided two sets of beautiful Orthodox character avatars:

**Set 1 (Top Grid - 3x3):**
- Row 1: Orthodox monks/clergy with black caps
- Row 2: Orthodox nun, Orthodox woman with headscarf, Orthodox man in suit
- Row 3: Orthodox priests with crosses and vestments

**Set 2 (Bottom Grid - 3x3):**
- Row 1: Orthodox elder monk, Orthodox nun with cross, Orthodox priest
- Row 2: Orthodox men in formal attire (varying ages)
- Row 3: Orthodox clergy in traditional vestments

## Step-by-Step Setup

### 1. Extract Individual Avatars
Using an image editor (like Photoshop, GIMP, or online tools):

1. **Open each grid image**
2. **Create 9 separate images** from each grid (3x3 = 9 per grid)
3. **Crop each character** to approximately 200x200 pixels
4. **Save as PNG files** with transparent backgrounds if possible

### 2. Naming Convention
Save the extracted avatars with these names in `/front-end/public/assets/avatars/`:

**From First Grid:**
- `orthodox-monk-1.png` (top-left monk)
- `orthodox-monk-2.png` (top-center elder monk)
- `orthodox-priest-1.png` (top-right priest)
- `orthodox-nun-1.png` (middle-left nun)
- `orthodox-woman-1.png` (middle-center woman with headscarf)
- `orthodox-man-1.png` (middle-right man in suit)
- `orthodox-priest-2.png` (bottom-left priest with cross)
- `orthodox-elder-1.png` (bottom-center elder with cross)
- `orthodox-priest-3.png` (bottom-right priest in vestments)

**From Second Grid:**
- `orthodox-elder-2.png` (top-left elder monk)
- `orthodox-nun-2.png` (top-center nun with cross)
- `orthodox-priest-4.png` (top-right priest)
- `orthodox-man-2.png` (middle-left man with mustache)
- `orthodox-man-3.png` (middle-center younger man)
- `orthodox-elder-3.png` (middle-right elder man)
- `orthodox-priest-5.png` (bottom-left priest with cross)
- `orthodox-deacon-1.png` (bottom-center deacon)
- `orthodox-bishop-1.png` (bottom-right bishop in gold vestments)

### 3. Quick Extraction Tools
**Online Options:**
- **Photopea.com** (free online Photoshop alternative)
- **Canva.com** (has crop tools)
- **Remove.bg** (for background removal)

**Software Options:**
- **GIMP** (free)
- **Adobe Photoshop**
- **Paint.NET** (Windows, free)

### 4. Automated Script (Optional)
I can create a simple HTML tool to help you crop these systematically:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Orthodox Avatar Cropper</title>
    <style>
        .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .cell { border: 2px solid red; cursor: pointer; }
        canvas { max-width: 100%; }
    </style>
</head>
<body>
    <h2>Orthodox Avatar Extractor</h2>
    <input type="file" id="imageInput" accept="image/*">
    <div id="output"></div>
    
    <script>
        // JavaScript to help extract individual avatars from grid
        // (Implementation details would go here)
    </script>
</body>
</html>
```

## Current Avatar System Integration

Once you have the individual avatar files, they will automatically work with the existing system. The current avatar data structure supports:

- **Clergy**: Priests, Monks, Nuns, Deacons, Bishops, Elders
- **Laity**: Orthodox Men, Women, Families, Youth

The fallback emoji system will continue to work until you replace the files.

## File Structure After Setup
```
front-end/public/assets/avatars/
├── orthodox-priest-1.png
├── orthodox-priest-2.png
├── orthodox-priest-3.png
├── orthodox-priest-4.png
├── orthodox-priest-5.png
├── orthodox-monk-1.png
├── orthodox-monk-2.png
├── orthodox-nun-1.png
├── orthodox-nun-2.png
├── orthodox-elder-1.png
├── orthodox-elder-2.png
├── orthodox-elder-3.png
├── orthodox-deacon-1.png
├── orthodox-bishop-1.png
├── orthodox-man-1.png
├── orthodox-man-2.png
├── orthodox-man-3.png
└── orthodox-woman-1.png
```

## Next Steps
1. Extract the 18 individual avatars from your two grid images
2. Name them according to the convention above
3. Place them in the `/front-end/public/assets/avatars/` directory
4. The avatar system will automatically use them instead of emoji fallbacks

The avatars you provided are perfect for an Orthodox church management system - they show appropriate traditional dress, diverse age ranges, and both clergy and laity representations!
