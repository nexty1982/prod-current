import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ASTParser } from '../core/ast-parser';
import * as fs from 'fs';
import * as path from 'path';

// Mock ts-morph Project
const mockProject = {
  addSourceFileAtPath: vi.fn(),
  addSourceFileAtPathIfExists: vi.fn(),
};

vi.mock('ts-morph', () => ({
  Project: vi.fn(() => mockProject),
  SyntaxKind: {
    ObjectLiteralExpression: 'ObjectLiteralExpression',
    ArrayLiteralExpression: 'ArrayLiteralExpression',
    StringLiteral: 'StringLiteral',
    CallExpression: 'CallExpression',
    PropertyAssignment: 'PropertyAssignment',
    JsxElement: 'JsxElement',
    JsxSelfClosingElement: 'JsxSelfClosingElement',
    ArrowFunction: 'ArrowFunction',
    BooleanLiteral: 'BooleanLiteral',
  },
  Node: {
    isObjectLiteralExpression: vi.fn(),
    isStringLiteral: vi.fn(),
    isPropertyAssignment: vi.fn(),
    isJsxElement: vi.fn(),
    isJsxSelfClosingElement: vi.fn(),
    isArrowFunction: vi.fn(),
    isCallExpression: vi.fn(),
    isBooleanLiteral: vi.fn(),
  },
}));

vi.mock('fs');
vi.mock('path');

describe('ASTParser', () => {
  let astParser: ASTParser;
  const mockFeRoot = '/mock/front-end';

  beforeEach(() => {
    astParser = new ASTParser(mockFeRoot);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Router Parsing', () => {
    it('should auto-detect router file', async () => {
      const mockExistsSync = vi.mocked(fs.existsSync);
      mockExistsSync.mockImplementation((filePath) => {
        return filePath === path.join(mockFeRoot, 'src/routes/Router.tsx');
      });

      const mockSourceFile = {
        getDescendantsOfKind: vi.fn().mockReturnValue([]),
      };
      mockProject.addSourceFileAtPath.mockReturnValue(mockSourceFile);

      await astParser.parseRouter();

      expect(mockProject.addSourceFileAtPath).toHaveBeenCalledWith(
        path.join(mockFeRoot, 'src/routes/Router.tsx')
      );
    });

    it('should throw error when no router found', async () => {
      const mockExistsSync = vi.mocked(fs.existsSync);
      mockExistsSync.mockReturnValue(false);

      await expect(astParser.parseRouter()).rejects.toThrow('Router.tsx not found in common locations');
    });
  });

  describe('Dynamic Parameter Extraction', () => {
    it('should extract dynamic parameters from route patterns', () => {
      const params = (astParser as any).extractDynamicParams('/apps/../features/records/records/:churchId/member/:memberId');
      expect(params).toEqual(['churchId', 'memberId']);
    });

    it('should handle routes without parameters', () => {
      const params = (astParser as any).extractDynamicParams('/admin/users');
      expect(params).toEqual([]);
    });

    it('should handle complex parameter patterns', () => {
      const params = (astParser as any).extractDynamicParams('/api/:version/church/:churchId(\\\\d+)');
      expect(params).toEqual(['version', 'churchId']);
    });
  });

  describe('Component Path Resolution', () => {
    it('should resolve relative imports', async () => {
      const mockExistsSync = vi.mocked(fs.existsSync);
      mockExistsSync.mockImplementation((filePath) => {
        return filePath === '/mock/front-end/src/shared/ui/legacy/Button.tsx';
      });

      const mockSourceFile = {
        getFilePath: () => '/mock/front-end/src/pages/Home.tsx',
      };

      const result = await astParser.resolveComponentPath('../shared/ui/legacy/Button', 'Button', mockSourceFile as any);
      expect(result).toBe('/mock/front-end/src/shared/ui/legacy/Button.tsx');
    });

    it('should resolve absolute imports with @ alias', async () => {
      const mockExistsSync = vi.mocked(fs.existsSync);
      mockExistsSync.mockImplementation((filePath) => {
        return filePath === '/mock/front-end/src/shared/ui/legacy/Button.tsx';
      });

      const result = await astParser.resolveComponentPath(@/features/misc-legacy/Button', 'Button');
      expect(result).toBe('/mock/front-end/src/shared/ui/legacy/Button.tsx');
    });

    it('should find index files when directory exists', async () => {
      const mockExistsSync = vi.mocked(fs.existsSync);
      mockExistsSync.mockImplementation((filePath) => {
        if (filePath === '/mock/front-end/src/shared/ui/legacy/Button') return false;
        if (filePath === '/mock/front-end/src/shared/ui/legacy/Button.tsx') return false;
        if (filePath === '/mock/front-end/src/shared/ui/legacy/Button/index.tsx') return true;
        return false;
      });

      const result = await astParser.resolveComponentPath(@/features/misc-legacy/Button', 'Button');
      expect(result).toBe('/mock/front-end/src/shared/ui/legacy/Button/index.tsx');
    });

    it('should return null for external modules', async () => {
      const result = await astParser.resolveComponentPath('react', 'React');
      expect(result).toBeNull();
    });
  });

  describe('File Finding', () => {
    it('should find menu files recursively', () => {
      const mockReaddirSync = vi.mocked(fs.readdirSync);
      const mockExistsSync = vi.mocked(fs.existsSync);

      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockImplementation((dir) => {
        if (dir === '/mock/front-end/src/layouts') {
          return [
            { name: 'MenuItems.ts', isDirectory: () => false, isFile: () => true },
            { name: 'sidebar', isDirectory: () => true, isFile: () => false },
          ] as any[];
        }
        if (dir === '/mock/front-end/src/layouts/sidebar') {
          return [
            { name: 'SidebarMenu.tsx', isDirectory: () => false, isFile: () => true },
          ] as any[];
        }
        return [];
      });

      const files = (astParser as any).findMenuFiles('front-end/src/**/*menu*.(ts|tsx)');
      expect(files).toContain('/mock/front-end/src/layouts/MenuItems.ts');
      expect(files).toContain('/mock/front-end/src/layouts/sidebar/SidebarMenu.tsx');
    });
  });

  describe('Route Object Parsing', () => {
    it('should parse route objects with path and element', () => {
      const mockRouteObj = {
        getProperties: () => [
          {
            getName: () => 'path',
            getInitializer: () => ({
              getLiteralValue: () => '/admin/users',
            }),
          },
          {
            getName: () => 'element',
            getInitializer: () => ({
              // Mock JSX element
            }),
          },
        ],
      };

      // Mock the Node.is* functions
      const { Node } = require('ts-morph');
      Node.isObjectLiteralExpression.mockReturnValue(true);
      Node.isPropertyAssignment.mockReturnValue(true);
      Node.isStringLiteral.mockReturnValue(true);
      Node.isJsxElement.mockReturnValue(true);

      const mockSourceFile = {};
      
      const route = (astParser as any).parseRouteObject(mockRouteObj, mockSourceFile);
      expect(route).toBeDefined();
      expect(route.urlPattern).toBe('/admin/users');
    });
  });

  describe('Menu Object Parsing', () => {
    it('should parse menu objects with label and path', () => {
      const mockMenuObj = {
        getProperties: () => [
          {
            getName: () => 'title',
            getInitializer: () => ({
              getLiteralValue: () => 'User Management',
            }),
          },
          {
            getName: () => 'href',
            getInitializer: () => ({
              getLiteralValue: () => '/admin/users',
            }),
          },
        ],
      };

      const { Node } = require('ts-morph');
      Node.isObjectLiteralExpression.mockReturnValue(true);
      Node.isPropertyAssignment.mockReturnValue(true);
      Node.isStringLiteral.mockReturnValue(true);

      const menu = (astParser as any).parseMenuObject(mockMenuObj);
      expect(menu).toBeDefined();
      expect(menu.label).toBe('User Management');
      expect(menu.path).toBe('/admin/users');
    });

    it('should handle both title and label properties', () => {
      const mockMenuObj = {
        getProperties: () => [
          {
            getName: () => 'label',
            getInitializer: () => ({
              getLiteralValue: () => 'Dashboard',
            }),
          },
          {
            getName: () => 'path',
            getInitializer: () => ({
              getLiteralValue: () => '/dashboard',
            }),
          },
        ],
      };

      const { Node } = require('ts-morph');
      Node.isObjectLiteralExpression.mockReturnValue(true);
      Node.isPropertyAssignment.mockReturnValue(true);
      Node.isStringLiteral.mockReturnValue(true);

      const menu = (astParser as any).parseMenuObject(mockMenuObj);
      expect(menu).toBeDefined();
      expect(menu.label).toBe('Dashboard');
      expect(menu.path).toBe('/dashboard');
    });
  });
});
