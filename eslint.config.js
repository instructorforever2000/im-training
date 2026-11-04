import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// The coding-patterns checker used while writing this repo reads `ts-patterns/*` directives in comments.
// Registering the names here keeps ESLint from flagging those directives as unknown rules; they do nothing in ESLint.
const PATTERN_RULES = ['no-magic-numbers', 'no-loop-statements', 'no-switch-statement', 'no-nested-ternary', 'no-param-reassign', 'require-regex-example', 'prefer-await-to-then']
const tsPatterns = { rules: Object.fromEntries(PATTERN_RULES.map((r) => [r, { create: () => ({}) }])) }

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'ts-patterns': tsPatterns,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)
