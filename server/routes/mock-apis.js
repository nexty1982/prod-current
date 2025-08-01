const express = require('express');
const router = express.Router();

// Mock endpoints to prevent 404 errors from frontend components

// Mock gallery endpoint
router.get('/data/gallery', (req, res) => {
  res.json({
    success: true,
    data: {
      gallery: [],
      total: 0
    }
  });
});

// Mock post data endpoint
router.get('/data/postData', (req, res) => {
  res.json({
    success: true,
    data: {
      posts: [],
      total: 0
    }
  });
});

// Mock users data endpoint
router.get('/data/users', (req, res) => {
  res.json({
    success: true,
    data: {
      users: [],
      total: 0
    }
  });
});

// Mock global images endpoint - DISABLED: Real implementation exists at /api/admin/global-images/public
// router.get('/global-images/public', (req, res) => {
//   res.json({
//     success: true,
//     data: {
//       images: [],
//       total: 0
//     }
//   });
// });

// Mock chat data endpoint (for existing chat component)
router.get('/data/chat/ChatData', (req, res) => {
  res.json({
    success: true,
    data: [],
    msg: 'success'
  });
});

// Mock send message endpoint
router.post('/sendMessage', (req, res) => {
  res.json({
    success: true,
    data: [],
    msg: 'Message sent successfully'
  });
});

module.exports = router; 