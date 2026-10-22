import { defineConfig } from 'astro/config';

// The TalaStudio admin: the back end of talastudio.net, built and deployed on its own (see README.md).
// Port 4330 so it can run next to the website's dev server (4321).
export default defineConfig({
  server: { port: 4330 },
});
