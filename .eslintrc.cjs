module.exports = {
  root: true,
  env: { node: true, browser: true, es2022: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["@typescript-eslint","react","react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "eslint-config-prettier"
  ],
  settings: { react: { version: "detect" } },
  overrides: [{ files: ["**/*.ts","**/*.tsx"], rules: { "no-undef": "off" } }],
  ignorePatterns: [
    "**/node_modules/**","**/dist/**","**/build/**","**/.next/**","**/public/**",
    "prod/build/**","prod/front-end/public/**","prod/front-end/build/**","prod/server/public/**",
    "logs/**","*.min.js"
  ]
};
