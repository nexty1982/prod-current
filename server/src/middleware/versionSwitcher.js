/**
 * Version Switcher Middleware for OrthodoxMetrics
 * Allows superadmin users to switch between different front-end build directories
 */

const path = require('path');
const fs = require('fs');

// Available build directories (must exist on server)
const AVAILABLE_VERSIONS = {
  'production': '/dist',
  'beta': '/dist-beta', 
  'staging': '/dist-staging',
  'development': '/dist-dev',
  'experimental': '/dist-experimental'
};

// Default version
const DEFAULT_VERSION = 'production';

/**
 * Get the selected version from request (cookie, query param, or default)
 */
function getSelectedVersion(req) {
  // Priority: URL param > cookie > default
  let selectedVersion = req.query.version || req.cookies.om_version || DEFAULT_VERSION;
  
  // Validate that the version exists
  if (!AVAILABLE_VERSIONS[selectedVersion]) {
    selectedVersion = DEFAULT_VERSION;
  }
  
  return selectedVersion;
}

/**
 * Get the build directory path for a version
 */
function getBuildPath(version) {
  const relativePath = AVAILABLE_VERSIONS[version] || AVAILABLE_VERSIONS[DEFAULT_VERSION];
  return path.join(__dirname, '..', '..', 'front-end', relativePath);
}

/**
 * Check if a build directory exists
 */
function versionExists(version) {
  const buildPath = getBuildPath(version);
  return fs.existsSync(buildPath);
}

/**
 * Version switcher middleware
 * Serves static files from the selected build directory
 */
function versionSwitcherMiddleware(req, res, next) {
  // Only apply to static asset requests and root HTML
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/.test(req.path);
  const isRootRequest = req.path === '/' || req.path === '/index.html';
  
  if (!isStaticAsset && !isRootRequest) {
    return next();
  }

  const selectedVersion = getSelectedVersion(req);
  
  // Check if user is superadmin (only superadmins can use version switching)
  const user = req.session && req.session.user;
  const isSuperAdmin = user && user.role === 'super_admin';
  
  // Non-superadmins always get production version
  const version = isSuperAdmin ? selectedVersion : DEFAULT_VERSION;
  
  // Ensure the version exists
  if (!versionExists(version)) {
    console.warn(`⚠️  Version "${version}" does not exist, falling back to "${DEFAULT_VERSION}"`);
    const fallbackPath = getBuildPath(DEFAULT_VERSION);
    req.versionPath = fallbackPath;
    req.selectedVersion = DEFAULT_VERSION;
  } else {
    const buildPath = getBuildPath(version);
    req.versionPath = buildPath;
    req.selectedVersion = version;
  }
  
  // Log version switching for superadmins
  if (isSuperAdmin && version !== DEFAULT_VERSION) {
    console.log(`🔄 SuperAdmin ${user.email} using version: ${version} (${req.versionPath})`);
  }
  
  next();
}

/**
 * API endpoint to get available versions
 */
function getAvailableVersions(req, res) {
  const user = req.session && req.session.user;
  const isSuperAdmin = user && user.role === 'super_admin';
  
  if (!isSuperAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Superadmin role required.' 
    });
  }

  const versions = Object.keys(AVAILABLE_VERSIONS).map(id => ({
    id,
    path: AVAILABLE_VERSIONS[id],
    exists: versionExists(id),
    current: getSelectedVersion(req) === id
  }));

  res.json({
    success: true,
    versions,
    selected: getSelectedVersion(req)
  });
}

/**
 * API endpoint to switch version
 */
function switchVersion(req, res) {
  const user = req.session && req.session.user;
  const isSuperAdmin = user && user.role === 'super_admin';
  
  if (!isSuperAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Superadmin role required.' 
    });
  }

  const { version } = req.body;
  
  if (!version || !AVAILABLE_VERSIONS[version]) {
    return res.status(400).json({
      success: false,
      message: 'Invalid version specified',
      availableVersions: Object.keys(AVAILABLE_VERSIONS)
    });
  }
  
  if (!versionExists(version)) {
    return res.status(404).json({
      success: false,
      message: `Version "${version}" build directory does not exist`,
      path: getBuildPath(version)
    });
  }

  // Set cookie for persistence
  res.cookie('om_version', version, {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: false, // Allow client-side access
    secure: false, // Set to true in HTTPS production
    sameSite: 'lax'
  });

  console.log(`🔄 Version switched to "${version}" by superadmin ${user.email}`);

  res.json({
    success: true,
    message: `Switched to version: ${version}`,
    version,
    path: AVAILABLE_VERSIONS[version]
  });
}

module.exports = {
  versionSwitcherMiddleware,
  getAvailableVersions,
  switchVersion,
  getBuildPath,
  getSelectedVersion,
  AVAILABLE_VERSIONS,
  DEFAULT_VERSION
};
