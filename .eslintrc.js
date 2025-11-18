module.exports = {
  parser: '@typescript-eslint/parser', // TypeScriptをパースに必要
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  env: {
    browser: true,
    node: true, // Node.js環境のグローバル変数（'module' など）を認識
    es2021: true,
  },
  extends: [
    'eslint:recommended', // ESLintの推奨基本ルール
    'plugin:@typescript-eslint/recommended', // TypeScriptの推奨ルール
    'plugin:prettier/recommended', // Prettierと競合するルールを無効化
  ],
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    'prettier/prettier': 'warn',
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/', '*.config.js'],
};
