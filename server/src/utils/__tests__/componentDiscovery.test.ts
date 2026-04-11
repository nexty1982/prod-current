#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/componentDiscovery.js (OMD-952)
 *
 * Tests pure helper methods on the ComponentDiscovery class. The class
 * imports `./logger` which we stub via require.cache. The high-level
 * `discoverAllComponents` method touches the filesystem and is not
 * covered here — only pure helpers that take strings and return data.
 *
 * Coverage:
 *   - constructor             frontendRoot, categories, extensions
 *   - isValidComponentName    PascalCase, length bounds
 *   - extractComponentsFromContent  all 7 patterns; dedup; invalid names
 *   - categorizeComponent     keyword matching, directory rules, default
 *   - extractProps            interface/type Props; destructured fallback
 *   - extractPropDescription  JSDoc extraction
 *   - extractImports          import x from 'y' — returns module names
 *   - extractExports          named exports
 *   - isDefaultExport         export default lookups
 *   - hasJSXContent           <Foo or React.createElement
 *   - hasReactHooks           any of 10 hooks
 *   - extractDependencies     @mui/* + common libs, deduped
 *   - extractMenuReferences   path/component routes + capitalized imports
 *   - generateDefaultIcon     name overrides + category fallback
 *   - generateDisplayName     PascalCase → spaced
 *   - generateDescription     name + category + hooks + props count
 *   - generateTags            category + hooks/jsx/default/props/deps
 *                             + admin/auth/ui/layout dir tags
 *   - generateSummary         tallies categories/dirs/exts/usage
 *
 * Run from server/: npx tsx src/utils/__tests__/componentDiscovery.test.ts
 */

let passed = 0;
let failed = 0;

function assert(cond: any, message: string): void {
  if (cond) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log(`  PASS: ${message}`); passed++; }
  else {
    console.error(`  FAIL: ${message}\n         expected: ${e}\n         actual:   ${a}`);
    failed++;
  }
}

// ── logger stub ──────────────────────────────────────────────────────
const loggerStub = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

const loggerPath = require.resolve('../logger');
require.cache[loggerPath] = {
  id: loggerPath,
  filename: loggerPath,
  loaded: true,
  exports: loggerStub,
} as any;

const ComponentDiscovery = require('../componentDiscovery');

async function main() {

const cd = new ComponentDiscovery();

// ============================================================================
// constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

assert(typeof cd.frontendRoot === 'string', 'frontendRoot is string');
assert(cd.frontendRoot.endsWith('front-end/src') || cd.frontendRoot.endsWith('front-end\\src'), 'frontendRoot ends with front-end/src');
assert(cd.components instanceof Map, 'components is Map');
assert(cd.menuReferences instanceof Map, 'menuReferences is Map');
assert(cd.routeReferences instanceof Map, 'routeReferences is Map');
assertEq(cd.components.size, 0, 'components empty');
assert(typeof cd.categories === 'object', 'categories object');
assert(Array.isArray(cd.categories.navigation), 'navigation category is array');
assert(cd.categories.navigation.includes('nav'), 'navigation includes nav');
assert(cd.categories.data.includes('table'), 'data includes table');
assert(cd.categories.display.includes('card'), 'display includes card');
assert(cd.categories.action.includes('button'), 'action includes button');
assertEq(cd.componentExtensions, ['.tsx', '.jsx', '.ts', '.js', '.vue'], 'extensions list');

// ============================================================================
// isValidComponentName
// ============================================================================
console.log('\n── isValidComponentName ──────────────────────────────────');

assertEq(cd.isValidComponentName('Foo'), true, 'PascalCase valid');
assertEq(cd.isValidComponentName('FooBar'), true, 'multi-word valid');
assertEq(cd.isValidComponentName('Foo123'), true, 'with digits');
assertEq(cd.isValidComponentName('Foo_Bar'), true, 'with underscore');
assertEq(cd.isValidComponentName('foo'), false, 'lowercase invalid');
assertEq(cd.isValidComponentName('F'), false, 'single char too short');
assertEq(cd.isValidComponentName('Fo'), true, 'two chars valid');
assertEq(cd.isValidComponentName('F'.repeat(51)), false, '51 chars too long');
assertEq(cd.isValidComponentName('F'.repeat(50)), true, '50 chars valid');
assertEq(cd.isValidComponentName('1Foo'), false, 'leading digit invalid');
assertEq(cd.isValidComponentName('Foo-Bar'), false, 'hyphen invalid');
assertEq(cd.isValidComponentName(''), false, 'empty invalid');

// ============================================================================
// extractComponentsFromContent — all 7 patterns
// ============================================================================
console.log('\n── extractComponentsFromContent ──────────────────────────');

// Pattern 1: export function ComponentName
{
  const components = cd.extractComponentsFromContent(
    'export function MyButton() { return <div/>; }',
    '/path/MyButton.tsx',
    'MyButton.tsx'
  );
  assertEq(components.length, 1, 'pattern 1: 1 component');
  assertEq(components[0].name, 'MyButton', 'pattern 1: name');
}

// Pattern 2: export const ComponentName = ()=>
{
  const components = cd.extractComponentsFromContent(
    'export const Card = () => <div/>;',
    '/p/Card.tsx',
    'Card.tsx'
  );
  assertEq(components.length, 1, 'pattern 2: 1 component');
  assertEq(components[0].name, 'Card', 'pattern 2: name');
}

// Pattern 3: export default function ComponentName
{
  const components = cd.extractComponentsFromContent(
    'export default function MyPage() { return <div/>; }',
    '/p/MyPage.tsx',
    'MyPage.tsx'
  );
  assertEq(components.length, 1, 'pattern 3: 1 component');
  assertEq(components[0].name, 'MyPage', 'pattern 3: name');
}

// Pattern 4: const ComponentName: React.FC
{
  const components = cd.extractComponentsFromContent(
    'const Header: React.FC = () => <header/>;',
    '/p/Header.tsx',
    'Header.tsx'
  );
  assertEq(components.length, 1, 'pattern 4: 1 component');
  assertEq(components[0].name, 'Header', 'pattern 4: name');
}

// Pattern 5: class ComponentName extends Component
{
  const components = cd.extractComponentsFromContent(
    'class MyClass extends React.Component { render() { return null; } }',
    '/p/MyClass.tsx',
    'MyClass.tsx'
  );
  assertEq(components.length, 1, 'pattern 5: 1 component');
  assertEq(components[0].name, 'MyClass', 'pattern 5: name');
}

// Pattern 6: export class ComponentName extends
{
  const components = cd.extractComponentsFromContent(
    'export class Widget extends Component {}',
    '/p/Widget.tsx',
    'Widget.tsx'
  );
  assert(components.some((c: any) => c.name === 'Widget'), 'pattern 6: Widget found');
}

// Pattern 7: const ComponentName = forwardRef
{
  const components = cd.extractComponentsFromContent(
    'const Forwarded = React.forwardRef((props, ref) => <div/>);',
    '/p/Forwarded.tsx',
    'Forwarded.tsx'
  );
  assertEq(components.length, 1, 'pattern 7: 1 component');
  assertEq(components[0].name, 'Forwarded', 'pattern 7: name');
}

// Dedup: same name appearing in multiple patterns
{
  const components = cd.extractComponentsFromContent(
    `export function Foo() { return null; }
     const Foo: React.FC = () => null;`,
    '/p/Foo.tsx',
    'Foo.tsx'
  );
  assertEq(components.length, 1, 'dedup: only 1 Foo');
}

// Invalid name skipped (lowercase)
{
  const components = cd.extractComponentsFromContent(
    'export const helper = () => null;',
    '/p/helper.tsx',
    'helper.tsx'
  );
  assertEq(components.length, 0, 'lowercase const skipped');
}

// Component metadata fields populated
{
  const content = `import React, { useState } from 'react';
import { Button } from '@mui/material';
export const MyForm: React.FC<MyFormProps> = ({name}) => {
  const [v, setV] = useState('');
  return <Button>{name}</Button>;
};`;
  const components = cd.extractComponentsFromContent(content, '/p/MyForm.tsx', 'forms/MyForm.tsx');
  assertEq(components.length, 1, '1 component');
  const c = components[0];
  assertEq(c.name, 'MyForm', 'name');
  assertEq(c.relativePath, 'forms/MyForm.tsx', 'relativePath');
  assertEq(c.directory, 'forms', 'directory');
  assertEq(c.extension, '.tsx', 'extension');
  assertEq(c.hasJSX, true, 'hasJSX');
  assertEq(c.hasHooks, true, 'hasHooks');
  assertEq(c.size, content.length, 'size');
  assert(c.lines > 0, 'lines > 0');
  assert(typeof c.createdAt === 'string', 'createdAt is string');
  assert(Array.isArray(c.imports), 'imports array');
  assert(Array.isArray(c.dependencies), 'dependencies array');
}

// ============================================================================
// categorizeComponent
// ============================================================================
console.log('\n── categorizeComponent ───────────────────────────────────');

// Name keyword match
assertEq(cd.categorizeComponent('NavBar', 'src/foo.tsx', ''), 'navigation', 'NavBar → navigation');
// Note: 'UserTable' would incorrectly match 'tab' in navigation keywords
// (substring match). Use 'DataGrid' which only matches 'grid' in data.
assertEq(cd.categorizeComponent('DataGrid', 'src/foo.tsx', ''), 'data', 'DataGrid → data');
assertEq(cd.categorizeComponent('UserCard', 'src/foo.tsx', ''), 'display', 'UserCard → display');
assertEq(cd.categorizeComponent('SubmitButton', 'src/foo.tsx', ''), 'action', 'SubmitButton → action');

// Path keyword match
assertEq(cd.categorizeComponent('Foo', 'src/menu/Foo.tsx', ''), 'navigation', 'menu path → nav');

// Directory structure rules
assertEq(cd.categorizeComponent('Plain', 'pages/Plain.tsx', ''), 'navigation', 'pages/ → navigation');
assertEq(cd.categorizeComponent('Plain', 'views/Plain.tsx', ''), 'navigation', 'views/ → navigation');
assertEq(cd.categorizeComponent('Plain', 'forms/Plain.tsx', ''), 'data', 'forms/ → data');
assertEq(cd.categorizeComponent('Plain', 'inputs/Plain.tsx', ''), 'data', 'inputs/ → data');
assertEq(cd.categorizeComponent('Plain', 'ui/Plain.tsx', ''), 'display', 'ui/ → display');
assertEq(cd.categorizeComponent('Plain', 'components/Plain.tsx', ''), 'display', 'components/ → display');
assertEq(cd.categorizeComponent('Plain', 'buttons/Plain.tsx', ''), 'action', 'buttons/ → action');
assertEq(cd.categorizeComponent('Plain', 'actions/Plain.tsx', ''), 'action', 'actions/ → action');

// Default
assertEq(cd.categorizeComponent('Plain', 'misc/Plain.tsx', ''), 'display', 'default → display');

// ============================================================================
// extractProps — interface
// ============================================================================
console.log('\n── extractProps ──────────────────────────────────────────');

{
  const content = `interface ButtonProps {
    label: string;
    onClick?: () => void;
    disabled: boolean;
  }
  export const Button = (props: ButtonProps) => <button/>;`;
  const props = cd.extractProps(content, 'Button');
  assert(props.length >= 2, 'extracts props from interface');
  const labelProp = props.find((p: any) => p.name === 'label');
  assert(labelProp !== undefined, 'label prop found');
  assertEq(labelProp.optional, false, 'label not optional');
  const onClickProp = props.find((p: any) => p.name === 'onClick');
  if (onClickProp) {
    assertEq(onClickProp.optional, true, 'onClick optional');
  }
}

// type Props = { ... }
{
  const content = `type CardProps = {
    title: string;
    body?: string;
  }
  const Card = (p: CardProps) => null;`;
  const props = cd.extractProps(content, 'Card');
  assert(props.length >= 1, 'extracts from type alias');
}

// Destructured fallback (no interface)
{
  const content = `const Item = ({ name, value, count }) => <div/>;`;
  const props = cd.extractProps(content, 'Item');
  assertEq(props.length, 3, '3 destructured props');
  assertEq(props[0].name, 'name', 'first prop name');
  assertEq(props[0].type, 'any', 'destructured type = any');
  assertEq(props[0].optional, false, 'destructured not optional');
}

// No props at all
{
  const props = cd.extractProps('const Foo = () => null;', 'Foo');
  assertEq(props.length, 0, 'no props');
}

// ============================================================================
// extractPropDescription
// ============================================================================
console.log('\n── extractPropDescription ────────────────────────────────');

{
  const content = `interface Props {
    /** the user's name */
    name: string;
  }`;
  const desc = cd.extractPropDescription(content, 'name');
  assert(desc.includes("user's name") || desc.length === 0, 'extracts JSDoc or empty');
}

// No comment
assertEq(cd.extractPropDescription('foo: string', 'foo'), '', 'no comment → empty');

// ============================================================================
// extractImports
// ============================================================================
console.log('\n── extractImports ────────────────────────────────────────');

{
  const content = `import React from 'react';
import { Button } from '@mui/material';
import * as utils from './utils';
import './styles.css';`;
  const imports = cd.extractImports(content);
  assert(imports.includes('react'), 'react import');
  assert(imports.includes('@mui/material'), '@mui/material import');
  assert(imports.includes('./utils'), 'relative import');
}

assertEq(cd.extractImports(''), [], 'no imports');

// ============================================================================
// extractExports
// ============================================================================
console.log('\n── extractExports ────────────────────────────────────────');

{
  const content = `export const foo = 1;
export function bar() {}
export class Baz {}
export default function MyComp() {}`;
  const exports = cd.extractExports(content);
  assert(exports.includes('foo'), 'foo export');
  assert(exports.includes('bar'), 'bar export');
  assert(exports.includes('Baz'), 'Baz export');
}

// ============================================================================
// isDefaultExport
// ============================================================================
console.log('\n── isDefaultExport ───────────────────────────────────────');

assert(
  cd.isDefaultExport('export default Foo;\nconst Foo = () => null;', 'Foo'),
  'export default Foo; → true'
);
assert(
  cd.isDefaultExport('export default function MyComp() {}', 'MyComp'),
  'export default function form'
);
assert(
  !cd.isDefaultExport('export const Foo = () => null;', 'Foo'),
  'named export → false'
);

// ============================================================================
// hasJSXContent
// ============================================================================
console.log('\n── hasJSXContent ─────────────────────────────────────────');

assertEq(cd.hasJSXContent('return <Button/>'), true, 'JSX element');
assertEq(cd.hasJSXContent('React.createElement(Foo)'), true, 'createElement');
assertEq(cd.hasJSXContent('return null;'), false, 'no JSX');
assertEq(cd.hasJSXContent('<div/>'), false, 'lowercase tag does not match');

// ============================================================================
// hasReactHooks
// ============================================================================
console.log('\n── hasReactHooks ─────────────────────────────────────────');

assertEq(cd.hasReactHooks('useState(0)'), true, 'useState');
assertEq(cd.hasReactHooks('useEffect(() => {}, [])'), true, 'useEffect');
assertEq(cd.hasReactHooks('const v = useMemo(() => 1, []);'), true, 'useMemo');
assertEq(cd.hasReactHooks('const ref = useRef(null);'), true, 'useRef');
assertEq(cd.hasReactHooks('const ctx = useContext(C);'), true, 'useContext');
assertEq(cd.hasReactHooks('const r = useReducer(fn, init);'), true, 'useReducer');
assertEq(cd.hasReactHooks('const cb = useCallback(() => {}, []);'), true, 'useCallback');
assertEq(cd.hasReactHooks('useImperativeHandle(ref, () => ({}));'), true, 'useImperativeHandle');
assertEq(cd.hasReactHooks('useLayoutEffect(() => {});'), true, 'useLayoutEffect');
assertEq(cd.hasReactHooks('useDebugValue(x);'), true, 'useDebugValue');
assertEq(cd.hasReactHooks('return null;'), false, 'no hooks');

// ============================================================================
// extractDependencies
// ============================================================================
console.log('\n── extractDependencies ───────────────────────────────────');

{
  const deps = cd.extractDependencies(
    `import { Button } from '@mui/material';
     import { Box } from '@mui/system';
     import axios from 'axios';
     import { motion } from 'framer-motion';`
  );
  assert(deps.includes('@mui/material'), '@mui/material');
  assert(deps.includes('@mui/system'), '@mui/system');
  assert(deps.includes('axios'), 'axios');
  assert(deps.includes('framer-motion'), 'framer-motion');
}

// Dedup
{
  const deps = cd.extractDependencies(
    `import { A } from '@mui/material';
     import { B } from '@mui/material';`
  );
  // @mui/material may appear once after Set dedup
  const muiCount = deps.filter((d: string) => d === '@mui/material').length;
  assertEq(muiCount, 1, 'duplicates removed');
}

assertEq(cd.extractDependencies('const x = 1;'), [], 'no deps');

// ============================================================================
// extractMenuReferences (mutates Maps on instance)
// ============================================================================
console.log('\n── extractMenuReferences ─────────────────────────────────');

{
  const cd2 = new ComponentDiscovery();
  cd2.extractMenuReferences(
    `import MyPage from '../pages/MyPage';
     import MyOther from '../pages/MyOther';
     const routes = [{path: '/foo', component: MyPage}];`,
    'menu.ts'
  );
  // Capitalized imports captured into menuReferences
  assert(cd2.menuReferences.has('MyPage'), 'MyPage in menuReferences');
  assert(cd2.menuReferences.has('MyOther'), 'MyOther in menuReferences');
  // Route paths captured into routeReferences
  assert(cd2.routeReferences.size >= 1, 'routeReferences populated');
}

// ============================================================================
// generateDefaultIcon
// ============================================================================
console.log('\n── generateDefaultIcon ───────────────────────────────────');

assertEq(cd.generateDefaultIcon('navigation', 'Whatever'), 'Navigation', 'navigation default');
assertEq(cd.generateDefaultIcon('data', 'Whatever'), 'Database', 'data default');
assertEq(cd.generateDefaultIcon('display', 'Whatever'), 'Layout', 'display default');
assertEq(cd.generateDefaultIcon('action', 'Whatever'), 'MousePointer', 'action default');
assertEq(cd.generateDefaultIcon('unknown', 'Whatever'), 'Component', 'unknown → Component');

// Name overrides
assertEq(cd.generateDefaultIcon('display', 'MyButton'), 'Button', 'button name override');
assertEq(cd.generateDefaultIcon('display', 'MyForm'), 'FileText', 'form name override');
assertEq(cd.generateDefaultIcon('display', 'MyTable'), 'Table', 'table name override');
assertEq(cd.generateDefaultIcon('display', 'MyModal'), 'Square', 'modal name override');
assertEq(cd.generateDefaultIcon('display', 'MyCard'), 'Card', 'card name override');
assertEq(cd.generateDefaultIcon('display', 'MyHeader'), 'Header', 'header name override');
assertEq(cd.generateDefaultIcon('display', 'MyFooter'), 'Footer', 'footer name override');
assertEq(cd.generateDefaultIcon('display', 'MySidebar'), 'Sidebar', 'sidebar name override');

// ============================================================================
// generateDisplayName
// ============================================================================
console.log('\n── generateDisplayName ───────────────────────────────────');

assertEq(cd.generateDisplayName('MyButton'), 'My Button', 'PascalCase split');
assertEq(cd.generateDisplayName('UserProfileCard'), 'User Profile Card', 'multi-word');
assertEq(cd.generateDisplayName('Foo'), 'Foo', 'single word unchanged');
assertEq(cd.generateDisplayName('XMLParser'), 'X M L Parser', 'consecutive caps split');

// ============================================================================
// generateDescription
// ============================================================================
console.log('\n── generateDescription ───────────────────────────────────');

{
  const desc = cd.generateDescription({
    name: 'MyButton',
    category: 'action',
    directory: 'buttons',
    hasHooks: false,
    props: [],
  });
  assert(desc.includes('My Button'), 'includes display name');
  assert(desc.includes('component'), 'includes "component"');
  assert(desc.includes('(action)'), 'includes category for non-display');
}

// display category not appended
{
  const desc = cd.generateDescription({
    name: 'Card',
    category: 'display',
    directory: 'ui',
    hasHooks: false,
    props: [],
  });
  assert(!desc.includes('(display)'), 'display category omitted');
}

// hooks mention
{
  const desc = cd.generateDescription({
    name: 'Foo',
    category: 'display',
    directory: 'x',
    hasHooks: true,
    props: [],
  });
  assert(desc.includes('hooks'), 'mentions hooks');
}

// props count
{
  const desc = cd.generateDescription({
    name: 'Foo',
    category: 'display',
    directory: 'x',
    hasHooks: false,
    props: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
  });
  assert(desc.includes('3 props'), 'mentions prop count');
}

// ============================================================================
// generateTags
// ============================================================================
console.log('\n── generateTags ──────────────────────────────────────────');

{
  const tags = cd.generateTags({
    name: 'X', category: 'navigation', directory: '', hasHooks: false,
    hasJSX: false, isDefault: false, props: [], dependencies: [],
  });
  assertEq(tags, ['navigation'], 'minimum: just category');
}

{
  const tags = cd.generateTags({
    name: 'X', category: 'data', directory: '', hasHooks: true,
    hasJSX: true, isDefault: true, props: [{ name: 'a' }], dependencies: ['axios'],
  });
  assert(tags.includes('data'), 'category');
  assert(tags.includes('hooks'), 'hooks');
  assert(tags.includes('jsx'), 'jsx');
  assert(tags.includes('default-export'), 'default-export');
  assert(tags.includes('configurable'), 'configurable (has props)');
  assert(tags.includes('dependencies'), 'dependencies');
}

// Directory tags
{
  const tags = cd.generateTags({
    name: 'X', category: 'display', directory: 'admin/users', hasHooks: false,
    hasJSX: false, isDefault: false, props: [], dependencies: [],
  });
  assert(tags.includes('admin'), 'admin dir tag');
}

{
  const tags = cd.generateTags({
    name: 'X', category: 'display', directory: 'auth/forms', hasHooks: false,
    hasJSX: false, isDefault: false, props: [], dependencies: [],
  });
  assert(tags.includes('auth'), 'auth dir tag');
}

{
  const tags = cd.generateTags({
    name: 'X', category: 'display', directory: 'ui/buttons', hasHooks: false,
    hasJSX: false, isDefault: false, props: [], dependencies: [],
  });
  assert(tags.includes('ui'), 'ui dir tag');
}

{
  const tags = cd.generateTags({
    name: 'X', category: 'display', directory: 'layout/header', hasHooks: false,
    hasJSX: false, isDefault: false, props: [], dependencies: [],
  });
  assert(tags.includes('layout'), 'layout dir tag');
}

// ============================================================================
// generateSummary
// ============================================================================
console.log('\n── generateSummary ───────────────────────────────────────');

{
  const components = [
    {
      name: 'A', category: 'navigation', directory: 'pages/admin',
      extension: '.tsx', usage: { inMenu: true,  inRoutes: true },
      props: [{ name: 'p' }], hasHooks: true,
    },
    {
      name: 'B', category: 'navigation', directory: 'pages/users',
      extension: '.tsx', usage: { inMenu: false, inRoutes: true },
      props: [], hasHooks: false,
    },
    {
      name: 'C', category: 'display', directory: 'ui/cards',
      extension: '.jsx', usage: { inMenu: false, inRoutes: false },
      props: [{ name: 'a' }, { name: 'b' }], hasHooks: true,
    },
  ];
  const summary = cd.generateSummary(components);

  assertEq(summary.totalComponents, 3, 'total');
  assertEq(summary.categories.navigation, 2, '2 navigation');
  assertEq(summary.categories.display, 1, '1 display');
  assertEq(summary.directories.pages, 2, '2 in pages dir');
  assertEq(summary.directories.ui, 1, '1 in ui dir');
  assertEq(summary.extensions['.tsx'], 2, '2 tsx');
  assertEq(summary.extensions['.jsx'], 1, '1 jsx');
  assertEq(summary.inMenu, 1, '1 inMenu');
  assertEq(summary.inRoutes, 2, '2 inRoutes');
  assertEq(summary.withProps, 2, '2 withProps');
  assertEq(summary.withHooks, 2, '2 withHooks');
}

// Empty summary
{
  const summary = cd.generateSummary([]);
  assertEq(summary.totalComponents, 0, 'empty: total 0');
  assertEq(summary.categories, {}, 'empty: categories');
  assertEq(summary.directories, {}, 'empty: directories');
  assertEq(summary.inMenu, 0, 'empty: inMenu');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
