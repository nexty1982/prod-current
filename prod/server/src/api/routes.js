const express = require('express');
const fs = require('fs');
const path = require('path');
const { registerPages } = require('../utils/pageRegistrar');

const router = express.Router();

const routesFile = path.resolve(__dirname, '../../src/routes/index.js');
const menuFile = path.resolve(__dirname, '../../src/assets/data/menu-items.js');

function loadJSFile(filePath, variableName) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const regex = new RegExp(`export const ${variableName} = (.*);`, 's');
  const match = content.match(regex);
  if (match && match[1]) {
    return JSON.parse(match[1]);
  }
  throw new Error(`Could not parse ${variableName} from ${filePath}`);
}

// GET current routes & menu
router.get('/routes', (req, res) => {
  try {
    const appRoutes = loadJSFile(routesFile, 'appRoutes');
    const MENU_ITEMS = loadJSFile(menuFile, 'MENU_ITEMS');
    res.json({ routes: appRoutes, menu: MENU_ITEMS });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST updated routes & menu, then re-scan pages
router.post('/routes', (req, res) => {
  const { routes, menu } = req.body;
  if (!routes || !menu) {
    return res.status(400).json({ error: 'Missing routes or menu in request body' });
  }

  const routesContent = `export const appRoutes = ${JSON.stringify(routes, null, 2)};\n`;
  const menuContent = `export const MENU_ITEMS = ${JSON.stringify(menu, null, 2)};\n`;

  try {
    fs.writeFileSync(routesFile, routesContent, 'utf-8');
    fs.writeFileSync(menuFile, menuContent, 'utf-8');
    // Re-generate based on .jsx pages
    registerPages();
    res.json({ message: 'Routes and menu updated; pages re-registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Trigger page scan manually
router.post('/pages/register', (req, res) => {
  try {
    registerPages();
    res.json({ message: 'Pages registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// SSE for real-time file updates
router.get('/routes/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = () => res.write('data: update\n\n');
  const watchers = [
    fs.watch(routesFile, sendUpdate),
    fs.watch(menuFile, sendUpdate)
  ];

  req.on('close', () => {
    watchers.forEach(w => w.close());
    res.end();
  });
});

module.exports = router;
