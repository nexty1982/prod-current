/**
 * Tests for normalizeTreeItems utility
 */

import { normalizeTreeItems, validateTreeItems, resetValidationFlag } from './normalizeTreeItems';

describe('normalizeTreeItems', () => {
  beforeEach(() => {
    resetValidationFlag();
  });

  test('should handle items with missing ids but same label', () => {
    const input = [
      { label: 'Dashboard' },
      { label: 'Dashboard' },
    ];

    const result = normalizeTreeItems(input);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('/Dashboard#0');
    expect(result[1].id).toBe('/Dashboard#0__1'); // Collision resolved
    expect(result[0].id).not.toBe(result[1].id);
  });

  test('should handle nested children with repeated labels', () => {
    const input = [
      {
        label: 'Admin',
        children: [
          { label: 'Users' },
          { label: 'Users' },
        ],
      },
    ];

    const result = normalizeTreeItems(input);

    expect(result[0].id).toBe('/Admin#0');
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children![0].id).toBe('/Admin#0/Users#0');
    expect(result[0].children![1].id).toBe('/Admin#0/Users#0__1'); // Collision resolved
  });

  test('should prefer existing id properties in order', () => {
    const input = [
      { id: 123, label: 'Dashboard' },
      { itemId: 'item-456', label: 'Settings' },
      { nodeId: 'node-789', label: 'Profile' },
      { key: 'custom-key', label: 'Reports' },
      { key_name: 'menu-key', label: 'Analytics' },
      { path: '/admin/users', label: 'Users' },
    ];

    const result = normalizeTreeItems(input);

    expect(result[0].id).toBe('123');
    expect(result[1].id).toBe('item-456');
    expect(result[2].id).toBe('node-789');
    expect(result[3].id).toBe('custom-key');
    expect(result[4].id).toBe('menu-key');
    expect(result[5].id).toBe('/admin/users');
  });

  test('should create stable ids for items with no identifying properties', () => {
    const input = [
      { someProperty: 'value1' },
      { someProperty: 'value2' },
    ];

    const result = normalizeTreeItems(input);

    expect(result[0].id).toBe('/item#0');
    expect(result[1].id).toBe('/item#1');
  });

  test('should deep clone items to avoid mutations', () => {
    const input = [{ label: 'Original', data: { nested: true } }];
    const result = normalizeTreeItems(input);

    // Modify the result
    result[0].label = 'Modified';
    result[0].data.nested = false;

    // Original should be unchanged
    expect(input[0].label).toBe('Original');
    expect(input[0].data.nested).toBe(true);
  });

  test('should handle empty or invalid inputs gracefully', () => {
    expect(normalizeTreeItems([])).toEqual([]);
    expect(normalizeTreeItems(null as any)).toEqual([]);
    expect(normalizeTreeItems(undefined as any)).toEqual([]);
    expect(normalizeTreeItems('invalid' as any)).toEqual([]);
  });
});

describe('validateTreeItems', () => {
  beforeEach(() => {
    resetValidationFlag();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  test('should log warning for items lacking all ID properties', () => {
    const input = [
      { someProperty: 'value' }, // No ID properties
    ];

    validateTreeItems(input);

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[Tree Inspector] Item at root[0] lacks all ID properties'),
      expect.any(String),
      expect.any(String),
      expect.any(Object)
    );
  });

  test('should not log warning for items with valid ID properties', () => {
    const input = [
      { id: 1, label: 'Valid' },
      { key_name: 'valid-key' },
      { path: '/valid/path' },
    ];

    validateTreeItems(input);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('should only log once per session', () => {
    const input = [
      { someProperty: 'value1' },
      { someProperty: 'value2' },
    ];

    validateTreeItems(input);
    validateTreeItems(input); // Second call

    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
