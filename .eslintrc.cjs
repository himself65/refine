module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  settings: {
    next: {
      rootDir: "./apps/web"
    },
    react: { version: 'detect' },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true
      },
      node: true
    }
  },
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'import/no-extraneous-dependencies': [
      'error',
      {
        'devDependencies': [
          '**/*.test.tsx',
          '**/*.test.ts',
          '**/*.spec.tsx',
          '**/*.spec.ts',
          '**/vite.config.ts',
          '**/vitest.config.ts',
          '**/*.stories.tsx'
        ]
      }
    ],
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true }
    ]
  }
}
