import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // Stage A enforcement: forbid direct `process.env.X` reads in Vercel
  // Functions outside the typed-config layer. The layer is the single
  // source of truth (`api/_lib/serverConfig.ts`); regressing back to
  // scattered reads loses the Zod validation + test mockability.
  {
    files: ['api/**/*.ts'],
    ignores: [
      'api/_lib/serverConfig.ts',
      'api/**/*.test.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.object.name='process'][object.property.name='env']",
          message: "Read env via getServerConfig() in api/_lib/serverConfig.ts; do not read process.env directly.",
        },
      ],
    },
  },
)
