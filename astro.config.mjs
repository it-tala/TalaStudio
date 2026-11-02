import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://talastudio.net',
  // Keep the off pages in step with disabledPages in src/data/sections.ts
  integrations: [sitemap({ filter: (p) => !['/palettes', '/about', '/the-studio', '/how-a-container-works', '/partner-with-us'].some((s) => p.includes(s)) })],
});
