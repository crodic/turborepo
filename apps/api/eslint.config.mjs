import { nestJsConfig } from '@repo/eslint-config/nestjs';

export default [
  ...nestJsConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
