// React Site Creation Utility
// Creates localized React instances for provisioned churches

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const logger = require('./logger');

const TEMPLATE_DIR = path.join(__dirname, '../../templates');
const CHURCHES_DIR = path.join(__dirname, '../../misc/public/churches');
const BASE_URL = process.env.BASE_URL || 'https://orthodoxmetrics.com';

// Language-specific template configurations
const LANGUAGE_CONFIGS = {
  en: {
    templateDir: 'react-site-en',
    name: 'English',
    rtl: false,
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD'
  },
  gr: {
    templateDir: 'react-site-gr',
    name: 'Greek',
    rtl: false,
    dateFormat: 'DD/MM/YYYY',
    currency: 'EUR'
  },
  ru: {
    templateDir: 'react-site-ru',
    name: 'Russian',
    rtl: false,
    dateFormat: 'DD.MM.YYYY',
    currency: 'RUB'
  },
  ro: {
    templateDir: 'react-site-ro',
    name: 'Romanian',
    rtl: false,
    dateFormat: 'DD.MM.YYYY',
    currency: 'RON'
  }
};

// Create React site for a church
async function createReactSite({ queueId, siteSlug, language, churchData }) {
  try {
    logger.info(`Starting React site creation for ${siteSlug} in ${language}`);

    const config = LANGUAGE_CONFIGS[language] || LANGUAGE_CONFIGS.en;
    const templatePath = path.join(TEMPLATE_DIR, config.templateDir);
    const sitePath = path.join(CHURCHES_DIR, siteSlug);
    const siteUrl = `${BASE_URL}/churches/${siteSlug}`;

    // Ensure template exists
    try {
      await fs.access(templatePath);
    } catch (error) {
      // If template doesn't exist, create it from base template
      await createLanguageTemplate(language, config);
    }

    // Ensure churches directory exists
    await fs.mkdir(CHURCHES_DIR, { recursive: true });

    // Check if site already exists
    try {
      await fs.access(sitePath);
      logger.warn(`Site directory already exists: ${sitePath}`);
      // Clean up existing directory
      await fs.rm(sitePath, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, which is good
    }

    // Copy template to site directory
    await copyDirectory(templatePath, sitePath);

    // Customize the site
    await customizeSite(sitePath, {
      siteSlug,
      language,
      config,
      churchData,
      siteUrl
    });

    // Build the site
    await buildSite(sitePath);

    logger.info(`React site created successfully: ${siteUrl}`);

    return {
      success: true,
      siteUrl,
      sitePath,
      language,
      buildTime: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Failed to create React site for ${siteSlug}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Create language template if it doesn't exist
async function createLanguageTemplate(language, config) {
  const baseTemplatePath = path.join(TEMPLATE_DIR, 'react-site-base');
  const languageTemplatePath = path.join(TEMPLATE_DIR, config.templateDir);

  try {
    // Copy base template
    await copyDirectory(baseTemplatePath, languageTemplatePath);

    // Load language-specific customizations
    const i18nPath = path.join(__dirname, `../../data/i18n/site/${language}.json`);
    let translations = {};

    try {
      const i18nContent = await fs.readFile(i18nPath, 'utf8');
      translations = JSON.parse(i18nContent);
    } catch (error) {
      logger.warn(`No translations found for ${language}, using English defaults`);
      const englishPath = path.join(__dirname, '../../data/i18n/site/en.json');
      const englishContent = await fs.readFile(englishPath, 'utf8');
      translations = JSON.parse(englishContent);
    }

    // Customize template for language
    await customizeLanguageTemplate(languageTemplatePath, {
      language,
      config,
      translations
    });

    logger.info(`Created language template for ${language}`);

  } catch (error) {
    logger.error(`Failed to create language template for ${language}:`, error);
    throw error;
  }
}

// Customize language template
async function customizeLanguageTemplate(templatePath, { language, config, translations }) {
  // Update package.json
  const packageJsonPath = path.join(templatePath, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  packageJson.name = `orthodox-church-${language}`;
  packageJson.description = `Orthodox Metrics - ${config.name}`;
  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Update language configuration
  const configPath = path.join(templatePath, 'src/config/language.js');
  const configContent = `
export const LANGUAGE_CONFIG = {
  code: '${language}',
  name: '${config.name}',
  rtl: ${config.rtl},
  dateFormat: '${config.dateFormat}',
  currency: '${config.currency}',
  translations: ${JSON.stringify(translations, null, 2)}
};

export default LANGUAGE_CONFIG;
`;
  await fs.writeFile(configPath, configContent);

  // Update HTML lang attribute
  const indexHtmlPath = path.join(templatePath, 'public/index.html');
  let indexHtml = await fs.readFile(indexHtmlPath, 'utf8');
  indexHtml = indexHtml.replace(/lang="en"/, `lang="${language}"`);
  indexHtml = indexHtml.replace(/<title>.*<\/title>/, `<title>${translations.siteTitle || 'Orthodox Metrics'}</title>`);
  await fs.writeFile(indexHtmlPath, indexHtml);
}

// Customize site for specific church
async function customizeSite(sitePath, { siteSlug, language, config, churchData, siteUrl }) {
  // Update package.json with church-specific info
  const packageJsonPath = path.join(sitePath, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  packageJson.name = `${siteSlug}-church-site`;
  packageJson.description = `${churchData.name} - Orthodox Metrics`;
  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Create church-specific configuration
  const churchConfigPath = path.join(sitePath, 'src/config/church.js');
  const churchConfig = `
export const CHURCH_CONFIG = {
  slug: '${siteSlug}',
  name: '${churchData.name}',
  location: '${churchData.location}',
  email: '${churchData.email}',
  siteUrl: '${siteUrl}',
  language: '${language}',
  createdAt: '${new Date().toISOString()}',
  
  // API Configuration
  apiBaseUrl: '${BASE_URL}/api',
  apiPrefix: '/churches/${siteSlug}',
  
  // Feature Configuration
  features: {
    baptismRecords: true,
    marriageRecords: true,
    funeralRecords: true,
    liturgicalCalendar: true,
    billing: true,
    userManagement: true,
    analytics: true
  },
  
  // UI Configuration
  theme: {
    primaryColor: '#8B4513',
    secondaryColor: '#DAA520',
    backgroundColor: '#F5F5DC',
    textColor: '#333333'
  }
};

export default CHURCH_CONFIG;
`;
  await fs.writeFile(churchConfigPath, churchConfig);

  // Update index.html with church info
  const indexHtmlPath = path.join(sitePath, 'public/index.html');
  let indexHtml = await fs.readFile(indexHtmlPath, 'utf8');

  // Update title and meta tags
  indexHtml = indexHtml.replace(
    /<title>.*<\/title>/,
    `<title>${churchData.name} - Orthodox Metrics</title>`
  );

  // Add church-specific meta tags
  const metaTags = `
    <meta name="description" content="${churchData.name} - Orthodox Metrics in ${churchData.location}">
    <meta name="keywords" content="orthodox church, ${churchData.name}, church management, ${churchData.location}">
    <meta property="og:title" content="${churchData.name} - Orthodox Metrics">
    <meta property="og:description" content="Church management system for ${churchData.name} in ${churchData.location}">
    <meta property="og:url" content="${siteUrl}">
    <meta property="og:type" content="website">
  `;

  indexHtml = indexHtml.replace('</head>', `${metaTags}\n</head>`);
  await fs.writeFile(indexHtmlPath, indexHtml);

  // Update .env file with church-specific variables
  const envPath = path.join(sitePath, '.env');
  const envContent = `
REACT_APP_CHURCH_SLUG=${siteSlug}
REACT_APP_CHURCH_NAME=${churchData.name}
REACT_APP_LANGUAGE=${language}
REACT_APP_API_BASE_URL=${BASE_URL}/api
REACT_APP_SITE_URL=${siteUrl}
REACT_APP_BUILD_TIME=${new Date().toISOString()}
`;
  await fs.writeFile(envPath, envContent.trim());

  // Create custom landing page
  await createLandingPage(sitePath, { churchData, language, config });

  // Update manifest.json
  const manifestPath = path.join(sitePath, 'public/manifest.json');
  if (await fileExists(manifestPath)) {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    manifest.name = `${churchData.name} - Orthodox Metrics`;
    manifest.short_name = churchData.name;
    manifest.start_url = `/?utm_source=pwa&utm_medium=homescreen&church=${siteSlug}`;
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }
}

// Create custom landing page
async function createLandingPage(sitePath, { churchData, language, config }) {
  const landingPagePath = path.join(sitePath, 'src/pages/Landing.jsx');

  const landingPageContent = `
import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

const Landing = () => {
  const { t } = useTranslation();

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section bg-primary text-white py-5">
        <Container>
          <Row className="align-items-center">
            <Col lg={8}>
              <h1 className="display-4 mb-4">
                ${churchData.name}
              </h1>
              <p className="lead mb-4">
                ${churchData.location}
              </p>
              <p className="mb-4">
                {t('welcome.description', 'Welcome to our Orthodox Metrics')}
              </p>
              <Button as={Link} to="/login" variant="light" size="lg" className="me-3">
                {t('navigation.login', 'Login')}
              </Button>
              <Button as={Link} to="/pages/calendar" variant="outline-light" size="lg">
                {t('navigation.calendar', 'View Calendar')}
              </Button>
            </Col>
            <Col lg={4}>
              <Card className="text-dark">
                <Card.Body>
                  <Card.Title>{t('contact.title', 'Contact Information')}</Card.Title>
                  <Card.Text>
                    <strong>{t('contact.email', 'Email')}:</strong><br />
                    <a href="mailto:${churchData.email}">${churchData.email}</a>
                  </Card.Text>
                  <Card.Text>
                    <strong>{t('contact.location', 'Location')}:</strong><br />
                    ${churchData.location}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Section */}
      <section className="features-section py-5">
        <Container>
          <h2 className="text-center mb-5">{t('features.title', 'Church Management Features')}</h2>
          <Row>
            <Col md={4} className="mb-4">
              <Card className="h-100">
                <Card.Body className="text-center">
                  <div className="feature-icon mb-3">
                    👶
                  </div>
                  <Card.Title>{t('features.baptism', 'Baptism Records')}</Card.Title>
                  <Card.Text>
                    {t('features.baptismDesc', 'Manage and track baptism records with digital certificates')}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-4">
              <Card className="h-100">
                <Card.Body className="text-center">
                  <div className="feature-icon mb-3">
                    💒
                  </div>
                  <Card.Title>{t('features.marriage', 'Marriage Records')}</Card.Title>
                  <Card.Text>
                    {t('features.marriageDesc', 'Track marriage ceremonies and generate certificates')}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-4">
              <Card className="h-100">
                <Card.Body className="text-center">
                  <div className="feature-icon mb-3">
                    📅
                  </div>
                  <Card.Title>{t('features.calendar', 'Liturgical Calendar')}</Card.Title>
                  <Card.Text>
                    {t('features.calendarDesc', 'Orthodox liturgical calendar with feast days and saints')}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Quick Links Section */}
      <section className="quick-links-section bg-light py-5">
        <Container>
          <h2 className="text-center mb-5">{t('quickLinks.title', 'Quick Access')}</h2>
          <Row className="justify-content-center">
            <Col md={8}>
              <Row>
                <Col sm={6} className="mb-3">
                  <Button 
                    as={Link} 
                    to="/pages/baptismrecords" 
                    variant="outline-primary" 
                    className="w-100"
                  >
                    {t('navigation.baptismRecords', 'Baptism Records')}
                  </Button>
                </Col>
                <Col sm={6} className="mb-3">
                  <Button 
                    as={Link} 
                    to="/pages/marriagerecords" 
                    variant="outline-primary" 
                    className="w-100"
                  >
                    {t('navigation.marriageRecords', 'Marriage Records')}
                  </Button>
                </Col>
                <Col sm={6} className="mb-3">
                  <Button 
                    as={Link} 
                    to="/pages/funeralrecords" 
                    variant="outline-primary" 
                    className="w-100"
                  >
                    {t('navigation.funeralRecords', 'Funeral Records')}
                  </Button>
                </Col>
                <Col sm={6} className="mb-3">
                  <Button 
                    as={Link} 
                    to="/pages/calendar" 
                    variant="outline-primary" 
                    className="w-100"
                  >
                    {t('navigation.calendar', 'Liturgical Calendar')}
                  </Button>
                </Col>
              </Row>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
};

export default Landing;
`;

  await fs.writeFile(landingPagePath, landingPageContent);
}

// Build the React site
async function buildSite(sitePath) {
  try {
    logger.info(`Building React site at ${sitePath}`);

    // Install dependencies if needed
    const nodeModulesPath = path.join(sitePath, 'node_modules');
    try {
      await fs.access(nodeModulesPath);
    } catch (error) {
      logger.info('Installing npm dependencies...');
      await execAsync('npm install', { cwd: sitePath });
    }

    // Build the site
    const { stdout, stderr } = await execAsync('npm run build', {
      cwd: sitePath,
      timeout: 300000 // 5 minutes timeout
    });

    if (stderr && !stderr.includes('warning')) {
      throw new Error(`Build failed: ${stderr}`);
    }

    logger.info(`Site built successfully: ${stdout}`);

  } catch (error) {
    logger.error(`Failed to build site at ${sitePath}:`, error);
    throw error;
  }
}

// Copy directory recursively
async function copyDirectory(src, dest) {
  const entries = await fs.readdir(src, { withFileTypes: true });

  await fs.mkdir(dest, { recursive: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Check if file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

// Create base templates for all languages (run once during setup)
async function initializeTemplates() {
  try {
    logger.info('Initializing React site templates...');

    for (const [language, config] of Object.entries(LANGUAGE_CONFIGS)) {
      const templatePath = path.join(TEMPLATE_DIR, config.templateDir);

      try {
        await fs.access(templatePath);
        logger.info(`Template already exists for ${language}`);
      } catch (error) {
        logger.info(`Creating template for ${language}...`);
        await createLanguageTemplate(language, config);
      }
    }

    logger.info('Template initialization completed');

  } catch (error) {
    logger.error('Failed to initialize templates:', error);
    throw error;
  }
}

module.exports = {
  createReactSite,
  initializeTemplates,
  LANGUAGE_CONFIGS
};
