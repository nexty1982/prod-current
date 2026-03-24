/**
 * safeTranslate — safe translation lookup that never exposes raw dotted keys to users.
 *
 * Returns:
 *   1. The translated value if it exists
 *   2. A curated fallback if defined for the key
 *   3. A cleaned-up human-readable string derived from the key (strips prefix, replaces underscores)
 *   — Never returns a raw dotted key like "auth.label_email"
 *
 * Missing keys are reported in development for diagnostics.
 */

// ── Curated fallbacks for critical auth/public keys ──────────────────────────

const AUTH_FALLBACKS: Record<string, string> = {
  // Hero section
  'auth.hero_badge': 'Orthodox Church Management',
  'auth.hero_title_prefix': 'Welcome to',
  'auth.hero_title_brand': 'OrthodoxMetrics',
  'auth.hero_subtitle': 'A comprehensive platform for Orthodox church record management, sacramental documentation, and parish administration.',

  // Feature bullets
  'auth.feat1_title': 'Sacramental Records',
  'auth.feat1_desc': 'Manage baptisms, marriages, funerals, and chrismations with precision.',
  'auth.feat2_title': 'OCR Digitization',
  'auth.feat2_desc': 'Convert historical ledgers into searchable digital records.',
  'auth.feat3_title': 'Multi-Language Support',
  'auth.feat3_desc': 'Serve parishes in English, Greek, Russian, Romanian, and Georgian.',
  'auth.feat4_title': 'Secure & Private',
  'auth.feat4_desc': 'Role-based access and encrypted storage protect sensitive records.',

  // Login card
  'auth.card_heading': 'Sign In',
  'auth.card_subheading': 'Enter your credentials to access your account',
  'auth.new_to_om': 'New to OrthodoxMetrics?',
  'auth.create_account': 'Create an account',

  // Form labels
  'auth.label_email': 'Email Address',
  'auth.label_password': 'Password',
  'auth.remember_device': 'Remember this device',
  'auth.forgot_password': 'Forgot Password?',

  // Buttons
  'auth.btn_sign_in': 'Sign In',
  'auth.btn_signing_in': 'Signing in…',

  // Validation errors
  'auth.error_username_required': 'Email is required',
  'auth.error_password_required': 'Password is required',

  // Error messages
  'auth.error_still_trouble': 'Still having trouble?',
  'auth.error_contact_support': 'Contact support',
  'auth.error_or_refresh': 'or try refreshing the page.',
  'auth.error_forgot_password': 'Forgot your password?',
  'auth.error_reset_here': 'Reset it here',
  'auth.error_check_status_prefix': 'Check our',
  'auth.error_status_page': 'status page',
  'auth.error_check_status_suffix': 'for updates.',

  // Navigation
  'nav.home': 'Home',
  'nav.about': 'About',
  'nav.faq': 'FAQ',
  'nav.contact': 'Contact',
  'nav.login': 'Sign In',
  'nav.register': 'Sign Up',

  // Common / Header
  'common.brand_name': 'OrthodoxMetrics',
  'common.sign_in': 'Sign In',
  'common.sign_up': 'Sign Up',
  'common.language': 'Language',
  'common.dark_mode': 'Dark mode',
  'common.light_mode': 'Light mode',

  // Footer
  'footer.brand': 'OrthodoxMetrics',
  'footer.tagline': 'Preserving sacred records with modern technology',
  'footer.copyright': '© {year} OrthodoxMetrics. All rights reserved.',
};

// Track already-reported missing keys to avoid spam
const reportedKeys = new Set<string>();

/**
 * Check if a string looks like a raw translation key (e.g. "auth.label_email").
 * Raw keys contain dots and/or snake_case segments.
 */
function isRawKey(value: string): boolean {
  // A value is a raw key if it matches "prefix.some_key" or "prefix.someKey" patterns
  return /^[a-z_]+\.[a-z_]+/i.test(value) && !value.includes(' ');
}

/**
 * Convert a raw key to a human-readable string as a last resort.
 * "auth.label_email" → "Email"
 * "auth.hero_title_brand" → "Title Brand"
 */
function humanizeKey(key: string): string {
  // Strip the prefix (everything before first dot)
  const parts = key.split('.');
  const tail = parts.length > 1 ? parts.slice(1).join(' ') : key;

  // Remove common prefixes like label_, btn_, error_, hero_, feat1_
  const cleaned = tail
    .replace(/^(label|btn|error|hero|feat\d+|card|nav|footer)_/i, '')
    .replace(/_/g, ' ')
    .trim();

  // Capitalize first letter of each word
  return cleaned
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Safe translation lookup.
 *
 * @param translations - The current translations map
 * @param key - The translation key
 * @returns A human-readable string, never a raw dotted key
 */
export function safeTranslate(
  translations: Record<string, string>,
  key: string,
): string {
  // 1. Check the live translations map
  const translated = translations[key];
  if (translated && !isRawKey(translated)) {
    return translated;
  }

  // 2. Check curated fallbacks
  const fallback = AUTH_FALLBACKS[key];
  if (fallback) {
    // Report missing key in development
    if (process.env.NODE_ENV === 'development' && !reportedKeys.has(key)) {
      reportedKeys.add(key);
      console.debug(`[safeTranslate] Using fallback for missing key: "${key}"`);
    }
    return fallback;
  }

  // 3. Last resort: humanize the key
  if (process.env.NODE_ENV === 'development' && !reportedKeys.has(key)) {
    reportedKeys.add(key);
    console.warn(`[safeTranslate] No translation or fallback for key: "${key}"`);
  }
  return humanizeKey(key);
}

/**
 * Get all curated fallback keys (useful for regression testing).
 */
export function getCuratedFallbackKeys(): string[] {
  return Object.keys(AUTH_FALLBACKS);
}

/**
 * Check a translations map for missing critical auth keys.
 * Returns an array of missing key names.
 */
export function findMissingAuthKeys(translations: Record<string, string>): string[] {
  return Object.keys(AUTH_FALLBACKS).filter(key => !translations[key]);
}
