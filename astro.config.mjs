// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static site, deployed to Cloudflare Pages from the `dist` folder.
// Form handling will live in /functions as a Cloudflare Pages Function.
export default defineConfig({
  site: 'https://kosibah.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [sitemap()],
  image: {
    // Jpeg sources from the old site; Astro emits AVIF/WebP with responsive sizes.
    responsiveStyles: true,
    layout: 'constrained',
  },
});
