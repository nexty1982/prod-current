  #!/usr/bin/env bash
  set -euo pipefail

  REPO="/var/www/orthodoxmetrics/prod"

  echo "==> Bootstrapping Cursor autonomy config in $REPO"

  mkdir -p "$REPO/.vscode" "$REPO/.github/workflows"

  # Write VSCode settings and tasks
  cat > "$REPO/.vscode/settings.json" <<'JSON'
{
  "window.commandCenter": true,
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 600,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true,
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": [
    "typescript",
    "typescriptreact",
    "javascript",
    "javascriptreact"
  ],
  "eslint.alwaysShowStatus": true,
  "typescript.tsserver.maxTsServerMemory": 4096,
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "terminal.integrated.defaultProfile.windows": "WSL",
  "terminal.integrated.profiles.windows": {
    "WSL": {
      "path": "C:\\\\WINDOWS\\\\System32\\\\wsl.exe"
    },
    "PowerShell": {
      "source": "PowerShell"
    }
  },
  "terminal.integrated.shellIntegration.enabled": false,
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true,
    "**/build": true
  },
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/.next/**": true,
    "**/build/**": true
  }
}
JSON

  cat > "$REPO/.vscode/tasks.json" <<'JSON'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Audit: Typecheck",
      "type": "shell",
      "command": "npm run typecheck",
      "problemMatcher": "$tsc"
    },
    {
      "label": "Audit: ESLint Fix",
      "type": "shell",
      "command": "npm run lint"
    },
    {
      "label": "Audit: Unused Exports (ts-prune)",
      "type": "shell",
      "command": "npm run prune"
    },
    {
      "label": "Audit: Unused Deps (depcheck)",
      "type": "shell",
      "command": "npm run depcheck"
    }
  ]
}
JSON

  # Write lint/format configs
  cat > "$REPO/.eslintrc.cjs" <<'JS'
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

JS

  cat > "$REPO/.prettierrc" <<'JSON'
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
JSON

  cat > "$REPO/.editorconfig" <<'EC'
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

EC

  # GitHub Actions workflow
  cat > "$REPO/.github/workflows/check.yml" <<'YML'
name: Check
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run check

YML

  # Optional: lint-staged config file
  cat > "$REPO/lintstaged.config.mjs" <<'JS'
// lintstaged.config.mjs
export default {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,css,scss,html}': ['prettier --write']
};

JS

  # Install dev dependencies
  cd "$REPO"
  echo "==> Installing dev dependencies"
  npm i -D @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint eslint-plugin-import     eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-unused-imports prettier rimraf ts-prune depcheck typescript husky lint-staged

  # Initialize husky and pre-commit hook
  echo "==> Initializing Husky"
  npx husky init
  cat > ".husky/pre-commit" <<'SH'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Running lint-staged..."
npx lint-staged -c lintstaged.config.mjs

SH
  chmod +x .husky/pre-commit

  # Show scripts to add to package.json
  echo "==> Add these scripts to your package.json:"
  cat <<'JSON'
{
  "dev": "vite dev",
  "build": "vite build",
  "lint": "eslint . --ext .ts,.tsx --fix",
  "format": "prettier --write .",
  "typecheck": "tsc --noEmit",
  "prune": "ts-prune",
  "depcheck": "depcheck",
  "check": "npm run lint && npm run typecheck",
  "clean": "rimraf dist build .next"
}

JSON

  echo "==> Done. Open the workspace in Cursor and run: npm run check"
