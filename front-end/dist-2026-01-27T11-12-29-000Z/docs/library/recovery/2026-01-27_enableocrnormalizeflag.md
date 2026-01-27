# Enable OCR Normalization Feature Flag

To enable the server-side OCR normalization feature, set the flag in your browser's localStorage.

## Quick Enable (Browser Console)

Open your browser's developer console (F12) and run:

```javascript
localStorage.setItem('OCR_NORMALIZE_SERVER', '1');
location.reload();
```

## Verify Flag is Enabled

Check if the flag is set:

```javascript
localStorage.getItem('OCR_NORMALIZE_SERVER'); // Should return "1"
```

## Disable Flag

To disable the feature:

```javascript
localStorage.removeItem('OCR_NORMALIZE_SERVER');
location.reload();
```

## Expected Behavior

When enabled:
- A "Normalize" button appears in the TranscriptionPanel header
- Clicking "Normalize" calls the server-side normalization API
- Normalized text replaces the client-side formatted text
- Normalized text is included in Save Draft payloads as `ocr_text_normalized`

## Alternative: Environment Variable

You can also enable via environment variable (requires rebuild):

```bash
# In .env file
VITE_OCR_NORMALIZE_SERVER=1
```

Then rebuild:
```bash
npm run build
```

