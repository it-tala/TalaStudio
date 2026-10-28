import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://talastudio.net',
  integrations: [sitemap({ filter: (p) => !p.includes('/palettes') })],
});
