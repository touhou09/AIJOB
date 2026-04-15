import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/ui/**/*.{ts,tsx}'],
  prefix: 'do',
  theme: {
    extend: {},
  },
};

export default config;
