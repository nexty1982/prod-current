import { REFACTORED_ROUTES, REFACTORED_IMPORTS } from '../refactoredRegistry';

describe('REFACTORED_ROUTES registry', () => {
  it('paths are unique', () => {
    const paths = REFACTORED_ROUTES.map(r => r.path);
    const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
    expect(duplicates).toEqual([]);
  });

  it('each route has a static lazy import', () => {
    const missing = REFACTORED_ROUTES.filter(r => !REFACTORED_IMPORTS[r.path]);
    expect(missing).toEqual([]);
  });

  it('all routes have required fields', () => {
    REFACTORED_ROUTES.forEach(route => {
      expect(route.path).toBeTruthy();
      expect(route.importPath).toBeTruthy();
      expect(route.label).toBeTruthy();
    });
  });
});
