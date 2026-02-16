import { describe, it, expect, beforeEach, vi } from 'vitest';
import { URLTracer } from '../core/url-tracer';

// Mock dependencies
vi.mock('../core/ast-parser');
vi.mock('../core/logger');

describe('URLTracer', () => {
  let urlTracer: URLTracer;
  const mockFeRoot = '/mock/front-end';

  beforeEach(() => {
    urlTracer = new URLTracer(mockFeRoot);
  });

  describe('Route Matching', () => {
    it('should match exact routes correctly', () => {
      const routes = [
        { urlPattern: '/admin/users', componentName: 'UserManagement' },
        { urlPattern: '/dashboards/modern', componentName: 'ModernDashboard' },
      ];

      // Access private method through any for testing
      const match = (urlTracer as any).findRouteMatch('/admin/users', routes);
      
      expect(match).toBeDefined();
      expect(match.pattern).toBe('/admin/users');
      expect(match.specificity).toBe(1000); // Exact match has highest specificity
    });

    it('should match dynamic routes with parameters', () => {
      const routes = [
        { urlPattern: '/apps/records/:churchId', componentName: 'RecordsUI' },
        { urlPattern: '/admin/church/:id', componentName: 'ChurchAdmin' },
      ];

      const match = (urlTracer as any).findRouteMatch('/apps/records/46', routes);
      
      expect(match).toBeDefined();
      expect(match.pattern).toBe('/apps/records/:churchId');
      expect(match.params).toEqual({ churchId: '46' });
    });

    it('should handle multiple dynamic parameters', () => {
      const routes = [
        { urlPattern: '/apps/records/:churchId/member/:memberId', componentName: 'MemberDetail' },
      ];

      const match = (urlTracer as any).findRouteMatch('/apps/records/46/member/123', routes);
      
      expect(match).toBeDefined();
      expect(match.params).toEqual({ churchId: '46', memberId: '123' });
    });

    it('should choose most specific route when multiple match', () => {
      const routes = [
        { urlPattern: '/apps/:type', componentName: 'GenericApp' },
        { urlPattern: '/apps/records', componentName: 'RecordsApp' },
        { urlPattern: '/apps/records/:churchId', componentName: 'ChurchRecords' },
      ];

      const match1 = (urlTracer as any).findRouteMatch('/apps/records', routes);
      expect(match1.pattern).toBe('/apps/records'); // Exact match wins

      const match2 = (urlTracer as any).findRouteMatch('/apps/records/46', routes);
      expect(match2.pattern).toBe('/apps/records/:churchId'); // More specific than /apps/:type
    });
  });

  describe('Dynamic Parameter Extraction', () => {
    it('should extract dynamic parameters correctly', () => {
      const params = (urlTracer as any).extractDynamicParams(
        '/apps/records/46/member/123', 
        '/apps/records/:churchId/member/:memberId'
      );
      
      expect(params).toEqual({
        churchId: '46',
        memberId: '123',
      });
    });

    it('should handle missing parameters gracefully', () => {
      const params = (urlTracer as any).extractDynamicParams(
        '/apps/records', 
        '/apps/records/:churchId'
      );
      
      expect(params).toEqual({});
    });
  });

  describe('Menu Path Matching', () => {
    it('should match menu paths to route patterns', () => {
      const matches1 = (urlTracer as any).menuPathMatches(
        '/apps/records/:churchId',
        '/apps/records/:churchId'
      );
      expect(matches1).toBe(true);

      const matches2 = (urlTracer as any).menuPathMatches(
        '/apps/records/46',
        '/apps/records/:churchId'
      );
      expect(matches2).toBe(false); // Menu shouldn't have concrete values for dynamic params
    });

    it('should handle static segments correctly', () => {
      const matches = (urlTracer as any).menuPathMatches(
        '/admin/users',
        '/admin/users'
      );
      expect(matches).toBe(true);
    });
  });

  describe('Truth Determination', () => {
    it('should return not_found when no route matches', () => {
      const result = (urlTracer as any).determineTruth('/nonexistent', undefined, [], []);
      expect(result.status).toBe('not_found');
    });

    it('should return router_only when no menus match', () => {
      const routeMatch = {
        pattern: '/admin/users',
        route: { componentName: 'UserManagement' },
        specificity: 1000,
        params: {},
      };

      const result = (urlTracer as any).determineTruth('/admin/users', routeMatch, [], []);
      expect(result.status).toBe('router_only');
      expect(result.warnings).toContain('No menu items found for this route');
    });

    it('should return definitive when router and menus align', () => {
      const routeMatch = {
        pattern: '/admin/users',
        route: { componentName: 'UserManagement' },
        specificity: 1000,
        params: {},
      };

      const menus = [
        { label: 'User Management', path: '/admin/users', componentRef: 'UserManagement' },
      ];

      const result = (urlTracer as any).determineTruth('/admin/users', routeMatch, [], menus);
      expect(result.status).toBe('definitive');
    });

    it('should return conflict when components mismatch', () => {
      const routeMatch = {
        pattern: '/admin/users',
        route: { componentName: 'UserManagement' },
        specificity: 1000,
        params: {},
      };

      const menus = [
        { label: 'User Management', path: '/admin/users', componentRef: 'DifferentComponent' },
      ];

      const result = (urlTracer as any).determineTruth('/admin/users', routeMatch, [], menus);
      expect(result.status).toBe('conflict');
    });
  });

  describe('Dependency Classification', () => {
    it('should classify API dependencies correctly', () => {
      const kind1 = (urlTracer as any).classifyDependency('src/services/userApi.ts', 'userApi');
      expect(kind1).toBe('api');

      const kind2 = (urlTracer as any).classifyDependency('src/api/records.ts', 'records');
      expect(kind2).toBe('api');
    });

    it('should classify hooks correctly', () => {
      const kind1 = (urlTracer as any).classifyDependency('src/hooks/useAuth.ts', 'useAuth');
      expect(kind1).toBe('hook');

      const kind2 = (urlTracer as any).classifyDependency('src/hooks/useRecords.ts', 'useRecords');
      expect(kind2).toBe('hook');
    });

    it('should classify components correctly', () => {
      const kind1 = (urlTracer as any).classifyDependency('src/components/Button.tsx', 'Button');
      expect(kind1).toBe('component');

      const kind2 = (urlTracer as any).classifyDependency('src/ui/Modal.tsx', 'Modal');
      expect(kind2).toBe('component');
    });

    it('should classify styles correctly', () => {
      const kind1 = (urlTracer as any).classifyDependency('src/styles/main.css', 'main.css');
      expect(kind1).toBe('style');

      const kind2 = (urlTracer as any).classifyDependency('src/components/Button.scss', 'Button.scss');
      expect(kind2).toBe('style');
    });

    it('should default to util for unknown types', () => {
      const kind = (urlTracer as any).classifyDependency('src/utils/helper.ts', 'helper');
      expect(kind).toBe('util');
    });
  });
});
