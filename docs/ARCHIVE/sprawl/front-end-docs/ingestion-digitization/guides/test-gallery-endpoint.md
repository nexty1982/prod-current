# Testing Gallery Endpoint from Browser Console

## Quick Test: POST /api/gallery/test

Open your browser's Developer Console (F12) and paste this code:

```javascript
// Test POST /api/gallery/test
fetch('/api/gallery/test', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ test: 'data' })
})
  .then(response => {
    console.log('Response status:', response.status);
    return response.text();
  })
  .then(text => {
    console.log('Response text:', text);
    try {
      const json = JSON.parse(text);
      console.log('Response JSON:', json);
    } catch (e) {
      console.log('Response is not JSON');
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

## Test with FormData (like actual upload)

```javascript
// Test POST /api/gallery/test with FormData (simulates file upload)
const formData = new FormData();
formData.append('test', 'value');
formData.append('another', 'field');

fetch('/api/gallery/test', {
  method: 'POST',
  credentials: 'include',
  body: formData
})
  .then(response => {
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    return response.text();
  })
  .then(text => {
    console.log('Response text:', text);
    try {
      const json = JSON.parse(text);
      console.log('Response JSON:', json);
    } catch (e) {
      console.log('Response is not JSON:', text.substring(0, 200));
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

## Test actual file upload (small test image)

```javascript
// Create a small test image file
const canvas = document.createElement('canvas');
canvas.width = 100;
canvas.height = 100;
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 100, 100);
ctx.fillStyle = 'white';
ctx.font = '20px Arial';
ctx.fillText('TEST', 25, 55);

canvas.toBlob((blob) => {
  const formData = new FormData();
  formData.append('image', blob, 'test-image.png');
  
  console.log('Uploading test image...');
  fetch('/api/gallery/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData
  })
    .then(response => {
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      return response.text();
    })
    .then(text => {
      console.log('Response text:', text);
      try {
        const json = JSON.parse(text);
        console.log('✅ Success! Response JSON:', json);
      } catch (e) {
        console.log('❌ Response is not JSON:', text.substring(0, 500));
      }
    })
    .catch(error => {
      console.error('❌ Error:', error);
    });
}, 'image/png');
```

## What to Look For

After running any of these tests:

1. **Check Browser Console:**
   - Look for the response status (200 = success, 500 = server error)
   - Check if response is JSON or HTML
   - Look for any error messages

2. **Check PM2 Logs:**
   ```bash
   pm2 logs orthodox-backend --lines 50
   ```
   - Should see: `✅✅✅ POST /api/gallery/test - Test POST route hit`
   - Or: `📤 POST /api/gallery/upload` for actual upload

3. **Check Network Tab:**
   - Open DevTools → Network tab
   - Look for the request to `/api/gallery/test` or `/api/gallery/upload`
   - Check the request/response details

## Expected Results

### If Working:
- Response status: 200
- Response is JSON: `{ success: true, message: "Gallery POST API is working", ... }`
- PM2 logs show the route was hit

### If Not Working:
- Response status: 500 (or other error)
- Response is HTML (Nginx error page)
- No logs in PM2 (request not reaching Express)

