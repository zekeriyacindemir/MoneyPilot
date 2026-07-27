import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/generated/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals.map((configuration) => ({
    ...configuration,
    files: ['apps/web/**/*.{js,jsx,ts,tsx,mjs}'],
  })),
);
