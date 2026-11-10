module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', 'backend', 'public', '.eslintrc.cjs', 'teste-automacao-nfs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react/prop-types': 'off', // projeto não usa PropTypes
    'react/no-unescaped-entities': 'off',
    'react/no-unknown-property': ['error', { ignore: ['fetchpriority'] }], // React 18 só aceita minúsculo
    'no-useless-catch': 'off',
    'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    'react-hooks/exhaustive-deps': 'off', // 't' (i18n) é estável; revisar depois
    'react-refresh/only-export-components': 'off',
  },
};
