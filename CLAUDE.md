# Kosibah 2026 site

Six-page, mobile-first editorial site for Kosibah, a couture bridal atelier. Every page routes to one booking flow at `/book`. Built with Astro (static output), hosted on Cloudflare Pages.

## Specs
- `specs/Kosibah 2026 Rebuild Plan.html` is the plan. Read it before changing structure.
- `specs/design-pages/*.png` are the page layouts (phone at 390px, one desktop home). Follow them.
- `specs/old-site-images/` are the only photos we have until the atelier shoot. Copies live in `src/assets/`.

## Toolchain
Node is installed via nvm, not system-wide. In non-interactive shells prefix commands with:
`export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH`

- `npm run build` builds to `dist/`. `npm run check` type-checks.
- `npm run dev` starts the dev server (use `npx astro dev --background` from an agent).
- `npm run deploy` builds and pushes to Cloudflare Pages with wrangler (needs `wrangler login` once).

## Structure
- `src/layouts/BaseLayout.astro`: head, header, footer, JSON-LD. Props: `title`, `description`, `minimal` (booking page), `image`, `jsonLd`.
- `src/components/Header.astro`, `Footer.astro`, `BookCta.astro` (closing dark "Consultations" block on every content page).
- `src/styles/global.css`: design tokens and base classes. Use them; do not invent new colours or fonts.
- `src/lib/site.ts`: address, phone, email, socials, nav, placeholders.
- `src/content.config.ts`: collections `gowns`, `brides`, `collections`, `press`. Content is markdown in `src/content/`.
- `src/assets/`: photography, organised by gown and bride slug. Use Astro's `<Image>`/`<Picture>` from `astro:assets`.
- `public/_headers`, `public/_redirects`: Cloudflare Pages config.

## Design rules
- Phone first. One column, portrait images (4:5 or 2:3), 44px tap targets, 4.5:1 contrast, reduced-motion respected.
- Chalk ground, near-black type, oxblood only on the booking action (`.btn--book`). Bodoni Moda for headings, Jost 300/400/500 for the rest.
- Eyebrow labels (`.eyebrow`) above headings. Small, spaced, quiet type. Photography does the talking.
- No third-party scripts except the scheduler and Meta pixel on `/book`.
- Square-bracketed text like `[LEAD TIME]` is a placeholder awaiting Yemi. Leave it visible so it gets filled in.

## Conventions
- Page-level styles go in the page's `<style>` block, scoped. Shared patterns go in `global.css` or a component.
- Each page ends with `<BookCta />` unless the design shows otherwise.
- Keep pages under 1MB. Use `widths`/`sizes` on images.
