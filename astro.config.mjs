import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://talastudio.net',
  // Temescal was renamed Palisades (2 Nov 2026); the old link keeps working
  redirects: { '/collections/temescal': '/collections/palisades', '/collections/beechwood-living': '/collections/beechwood-dining' },
  // Keep the off pages in step with disabledPages in src/data/sections.ts
  integrations: [sitemap({ filter: (p) => !['/palettes', '/about', '/the-studio', '/how-a-container-works', '/partner-with-us', '/request-catalog', '/temescal'].some((s) => p.includes(s)) })],
});
