// Same level as the rules Create React App used to run during the build:
// errors fail the CI, warnings are reported
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
    { ignores: ['build/', 'node_modules/'] },
    js.configs.recommended,
    react.configs.flat.recommended,
    react.configs.flat['jsx-runtime'],
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.browser },
            parserOptions: { ecmaFeatures: { jsx: true } }
        },
        settings: { react: { version: 'detect' } },
        plugins: { 'react-hooks': reactHooks },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
            // No PropTypes in this project
            'react/prop-types': 'off'
        }
    },
    {
        files: ['vite.config.js', 'eslint.config.js'],
        languageOptions: { globals: { ...globals.node } }
    }
];
