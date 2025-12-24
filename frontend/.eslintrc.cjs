module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
  ],
  settings: { react: { version: 'detect' } },
  ignorePatterns: ['dist/', 'node_modules/'],
  rules: {
    // React 17+ doesn't require React in scope
    'react/react-in-jsx-scope': 'off',
    // Allow any for now until types are refactored
    '@typescript-eslint/no-explicit-any': 'off',
    // Prefer warnings for empty blocks during WIP
    'no-empty': 'warn',
    // Using TS types instead of prop-types
    'react/prop-types': 'off',
    // Soften unused vars, allow underscore prefix to ignore
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
};
