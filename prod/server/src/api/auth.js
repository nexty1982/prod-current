const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  // TEMP auth: accept superadmin only
  if (email === 'superadmin@orthodoxmetrics.com') {
    req.session = req.session || {};
    req.session.user = { id: 1, email, role: 'admin' };
    return res.json({ ok: true, user: req.session.user });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

router.get('/check', (req, res) => {
  const u = req.session && req.session.user;
  if (u) return res.json({ authenticated: true, user: u });
  return res.status(401).json({ authenticated: false, message: 'Not authenticated' });
});

router.post('/logout', (req, res) => {
  if (req.session) req.session.user = null;
  res.json({ ok: true });
});

module.exports = router;
