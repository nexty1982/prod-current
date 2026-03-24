/**
 * Regression tests for safeTranslate — ensures raw dotted keys
 * never leak to the UI under any translation failure scenario.
 */
import { safeTranslate, getCuratedFallbackKeys, findMissingAuthKeys } from '../safeTranslate';

describe('safeTranslate', () => {
  const fullTranslations: Record<string, string> = {
    'auth.label_email': 'Email Address',
    'auth.label_password': 'Password',
    'auth.btn_sign_in': 'Sign In',
    'auth.hero_title_brand': 'OrthodoxMetrics',
    'common.brand_name': 'OrthodoxMetrics',
  };

  // ── Scenario 1: Translations available ──
  test('returns translated value when available', () => {
    expect(safeTranslate(fullTranslations, 'auth.label_email')).toBe('Email Address');
    expect(safeTranslate(fullTranslations, 'auth.btn_sign_in')).toBe('Sign In');
  });

  // ── Scenario 2: Missing key, curated fallback exists ──
  test('returns curated fallback when translation is missing', () => {
    const result = safeTranslate({}, 'auth.label_email');
    expect(result).toBe('Email Address');
    expect(result).not.toContain('.');
  });

  // ── Scenario 3: Missing key, no curated fallback ──
  test('returns humanized key as last resort, never raw dotted key', () => {
    const result = safeTranslate({}, 'some.unknown_fancy_key');
    expect(result).not.toContain('.');
    expect(result).not.toContain('_');
    // Should be something like "Unknown Fancy Key"
    expect(result).toMatch(/^[A-Z]/);
  });

  // ── Scenario 4: Empty translations map ──
  test('handles empty translations gracefully', () => {
    const criticalKeys = ['auth.label_email', 'auth.btn_sign_in', 'auth.card_heading', 'common.brand_name'];
    for (const key of criticalKeys) {
      const result = safeTranslate({}, key);
      expect(result).not.toMatch(/^[a-z]+\.[a-z]/); // No raw dotted keys
      expect(result.length).toBeGreaterThan(0);
    }
  });

  // ── Scenario 5: Invalid language code produces no raw keys ──
  test('all curated fallback keys have human-readable values', () => {
    const keys = getCuratedFallbackKeys();
    expect(keys.length).toBeGreaterThan(30); // Should have 30+ auth keys

    for (const key of keys) {
      const result = safeTranslate({}, key);
      expect(result).not.toMatch(/^[a-z]+\.[a-z_]+$/); // Not a raw key
      expect(result.length).toBeGreaterThan(0);
    }
  });

  // ── Scenario 6: findMissingAuthKeys identifies gaps ──
  test('findMissingAuthKeys reports missing keys correctly', () => {
    const partial = { 'auth.label_email': 'Email' };
    const missing = findMissingAuthKeys(partial);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing).not.toContain('auth.label_email');
    expect(missing).toContain('auth.label_password');
  });

  // ── Scenario 7: Delayed load = translations eventually empty ──
  test('never returns a dotted key even with completely empty map', () => {
    const allKeys = getCuratedFallbackKeys();
    for (const key of allKeys) {
      const result = safeTranslate({}, key);
      expect(result).not.toContain('auth.');
      expect(result).not.toContain('common.');
      expect(result).not.toContain('nav.');
      expect(result).not.toContain('footer.');
    }
  });
});
