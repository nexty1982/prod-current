/**
 * Tree Items Normalization Utility
 * Ensures every tree item has a stable, unique string ID
 */

interface TreeItem {
  id?: string | number;
  itemId?: string | number;
  nodeId?: string | number;
  key?: string;
  path?: string;
  label?: string;
  title?: string;
  key_name?: string;
  children?: TreeItem[];
  [key: string]: any;
}

/**
 * Normalizes tree items to ensure every item has a stable, unique string `id`.
 * @param items - Array of tree items to normalize
 * @param parentPath - Parent path for generating IDs (used internally for recursion)
 * @returns Deep-cloned array with normalized IDs
 */
export function normalizeTreeItems<T extends TreeItem>(
  items: T[],
  parentPath: string = ''
): T[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const usedIds = new Set<string>();
  
  return items.map((item, index) => {
    // Deep clone the item to avoid mutations
    const normalizedItem = JSON.parse(JSON.stringify(item)) as T;
    
    // Generate a stable ID from available properties
    let baseId = '';
    
    // Try to derive ID from existing properties in order of preference
    if (item.id) {
      baseId = String(item.id);
    } else if (item.itemId) {
      baseId = String(item.itemId);
    } else if (item.nodeId) {
      baseId = String(item.nodeId);
    } else if (item.key) {
      baseId = String(item.key);
    } else if (item.key_name) {
      baseId = String(item.key_name);
    } else if (item.path) {
      baseId = String(item.path);
    } else if (item.label) {
      baseId = `${parentPath}/${item.label}#${index}`;
    } else if (item.title) {
      baseId = `${parentPath}/${item.title}#${index}`;
    } else {
      baseId = `${parentPath}/item#${index}`;
    }
    
    // Ensure uniqueness at current level
    let finalId = baseId;
    let counter = 0;
    while (usedIds.has(finalId)) {
      counter++;
      finalId = `${baseId}__${counter}`;
    }
    
    usedIds.add(finalId);
    normalizedItem.id = finalId;
    
    // Recursively normalize children
    if (normalizedItem.children && Array.isArray(normalizedItem.children)) {
      normalizedItem.children = normalizeTreeItems(normalizedItem.children, finalId);
    }
    
    return normalizedItem;
  });
}

/**
 * Development guard to log items that lack common ID properties
 * @param items - Items to validate
 * @param path - Current path for debugging
 */
let hasLoggedMissingIds = false;

export function validateTreeItems<T extends TreeItem>(
  items: T[],
  path: string = 'root'
): void {
  if (!Array.isArray(items) || hasLoggedMissingIds) {
    return;
  }
  
  items.forEach((item, index) => {
    const hasValidId = item.id || item.itemId || item.nodeId || 
                      item.key || item.key_name || item.path || 
                      item.label || item.title;
    
    if (!hasValidId) {
      console.warn(
        `[Tree Inspector] Item at ${path}[${index}] lacks all ID properties:`,
        'id, itemId, nodeId, key, key_name, path, label, title',
        '\nItem:', JSON.stringify(item, null, 2)
      );
      hasLoggedMissingIds = true;
    }
    
    if (item.children && Array.isArray(item.children)) {
      validateTreeItems(item.children, `${path}[${index}].children`);
    }
  });
}

/**
 * Reset the dev guard flag (useful for testing)
 */
export function resetValidationFlag(): void {
  hasLoggedMissingIds = false;
}
