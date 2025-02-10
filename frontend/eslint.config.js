import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
    //   'react-refresh/only-export-components': [
    //     'warn',
    //     { allowConstantExport: true },
    //   ],
    },

      // Disable all warnings and rules you want to suppress
      'react/prop-types': 'off',  // Disable prop-types validation
      // 'react/jsx-no-target-blank': 'off',  // Disable target blank warning
      'no-console': 'off',  // Disable console log warning
      'no-unused-vars': 'off',  // Disable unused vars warning
      'react/jsx-uses-react': 'off',  // Optional if using React 17 or JSX runtime
      'react/jsx-uses-vars': 'off',  // Optional for disabling variable warnings in JSX
      'react-hooks/rules-of-hooks': 'off',  // Optional: if you want to disable hook-related warnings
      'react-hooks/exhaustive-deps': 'off',  // Optional: Disable exhaustive-deps warning for hooks

      // Disable other recommended rules (if needed)
      'react/no-unused-prop-types': 'off',  // Disable unused prop-types warning
  },
]