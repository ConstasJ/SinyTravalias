import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
    {
        ignores: ['dist/**', 'node_modules/**', '*.d.ts', '*.map']
    },
    {
        linterOptions: {
            reportUnusedDisableDirectives: 'warn'
        }
    },
    prettier,
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname
            }
        },
        plugins: {
            '@typescript-eslint': tseslint
        },
        rules: {
            'prefer-promise-reject-errors': 'error',
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/no-array-delete': 'error',
            '@typescript-eslint/no-base-to-string': 'error',
            '@typescript-eslint/no-duplicate-type-constituents': 'error',
            '@typescript-eslint/no-redundant-type-constituents': 'error',
            '@typescript-eslint/no-unnecessary-type-assertion': 'error',
            '@typescript-eslint/no-unsafe-argument': 'error',
            '@typescript-eslint/no-unsafe-assignment': 'error',
            '@typescript-eslint/no-unsafe-call': 'error',
            '@typescript-eslint/no-unsafe-enum-comparison': 'error',
            '@typescript-eslint/no-unsafe-member-access': 'error',
            '@typescript-eslint/no-unsafe-return': 'error',
            '@typescript-eslint/no-unsafe-unary-minus': 'error',
            '@typescript-eslint/no-unused-expressions': 'error',
            '@typescript-eslint/prefer-promise-reject-errors': 'error',
            '@typescript-eslint/restrict-template-expressions': 'error',
            '@typescript-eslint/strict-boolean-expressions': 'error',
            '@typescript-eslint/triple-slash-reference': 'error',
            '@typescript-eslint/unbound-method': 'error'
        }
    }
];
