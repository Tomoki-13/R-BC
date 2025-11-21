module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    // ---- 一般的な推奨ルール ----
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn'],
    'no-console': 'off',
    'no-debugger': 'warn',

    // ---- 整形関連ルール（Prettier代替）----
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'comma-dangle': ['error', 'always-multiline'],
    'indent': ['error', 2, { SwitchCase: 1 }],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'space-before-blocks': ['error', 'always'],
    'keyword-spacing': ['error', { before: true, after: true }],
    'arrow-spacing': ['error', { before: true, after: true }],
    'max-len': ['warn', { code: 200, ignoreStrings: true, ignoreTemplateLiterals: true }],
    'operator-linebreak': ['error', 'after'],
    'newline-per-chained-call': ['error', { ignoreChainWithDepth: 2 }],
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/', '*.config.js'],
};
