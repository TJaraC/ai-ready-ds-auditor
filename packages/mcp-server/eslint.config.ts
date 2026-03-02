import rootConfig from '../../eslint.config.ts';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...rootConfig,
  {
    rules: {
      'no-console': 'error', // CRITICAL: stdout corrupts stdio transport
    },
  },
);
