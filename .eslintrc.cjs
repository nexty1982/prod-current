module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'unused-imports'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  settings: { react: { version: 'detect' } },
  rules: {
    'unused-imports/no-unused-imports': 'error',
    'import/order': ['warn', {
      'newlines-between': 'always',
      groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
      alphabetize: { order: 'asc', caseInsensitive: true }
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/react-in-jsx-scope': 'off'
  },
  ignorePatterns: ['dist', 'build', '.next', 'node_modules']
};
