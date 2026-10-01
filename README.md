# Kosibah

Six-page couture bridal site. Astro, static output, hosted on Cloudflare Pages. Every page routes to one booking flow at `/book`. See `CLAUDE.md` for structure and design rules, and `specs/` for the plan and layouts.

## Run locally

Node is installed via nvm. Prefix commands with `export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH` in non-interactive shells.

```sh
npm install
npm run dev        # site only, http://localhost:4321
npm run check      # astro check (type-checks pages and components)
npm run build      # outputs dist/
```

To exercise the booking function locally, build and run the output through wrangler, which serves `functions/` alongside `dist/`:

```sh
cp .dev.vars.example .dev.vars   # fill in what you have; blanks are fine
npm run build && npx wrangler pages dev dist
```

Type-check the function on its own with `npx tsc -p functions/tsconfig.json` (the root `astro check` excludes `functions/`).

## Deploy

Two routes to production; pick one.

1. **Cloudflare Pages connected to GitHub** (recommended). Create a Pages project from this repository with build command `npm run build` and output directory `dist`. Add the environment variable `NODE_VERSION=22` so the build uses a supported Node. Every push to `main` deploys; pull requests get preview URLs.
2. **From a laptop**: `npx wrangler login` once, then `npm run deploy` (builds and pushes `dist/` plus `functions/` to the project named in `wrangler.toml`).

`public/_headers` and `public/_redirects` are copied into `dist/` and read by Pages.

## Environment variables

| Variable | Where used | Notes |
| --- | --- | --- |
| `PUBLIC_CAL_LINK` | `src/pages/book.astro` (build time) | Cal.com link, e.g. `kosibah/consultation`. Defaults to that. |
| `PUBLIC_META_PIXEL_ID` | `src/pages/book.astro` (build time) | Pixel renders on `/book` only, and only when this is set. |
| `RESEND_API_KEY`, `LEAD_TO_EMAIL`, `LEAD_FROM_EMAIL` | `functions/api/lead.ts` | Enquiry email to the atelier via Resend. `LEAD_FROM_EMAIL` must be a sender on a verified domain. |
| `SHEETS_WEBHOOK_URL` | `functions/api/lead.ts` | Google Apps Script web-app URL that appends a row to the leads sheet (see below). |
| `META_PIXEL_ID`, `META_ACCESS_TOKEN` | `functions/api/lead.ts` | Conversions API `Lead` event with hashed email and phone. `META_TEST_EVENT_CODE` is optional while verifying in Events Manager. |

`PUBLIC_*` values are plain build variables (Pages dashboard, or `.env` locally). The rest are secrets: `wrangler pages secret put NAME --project-name=kosibah`, or encrypted variables in the dashboard. Locally they come from `.dev.vars`. Every integration is optional; the function validates and answers even with none set.

**Google Sheet.** In the sheet, Extensions > Apps Script, paste the function below, Deploy > New deployment > Web app, execute as you, access "Anyone", and copy the URL into `SHEETS_WEBHOOK_URL`.

```js
function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  SpreadsheetApp.getActiveSheet().appendRow([d.receivedAt, d.firstName, d.email, d.phone, d.weddingDate, d.meeting, d.notes, d.gown, d.utm_source, d.utm_medium, d.utm_campaign, d.pageUrl]);
  return ContentService.createTextOutput('ok');
}
```

## The booking funnel

1. `/book` (`src/pages/book.astro`, components `Book*.astro`). Step 1 is a one-minute form. Gown pages link here with `?gown=<id>&name=<Name>`, which prefills the note; `utm_*` parameters are carried into hidden fields.
2. Submit posts JSON to `/api/lead` (`functions/api/lead.ts`): validates, drops honeypot hits, then emails the atelier, appends to the sheet and sends the Meta `Lead` event server-side (same `event_id` as the browser pixel, so Meta de-duplicates). If the request fails the page still moves on and shows a quiet note. Without JavaScript the form posts normally and the function redirects to `/book#step-2`.
3. Step 2 reveals in place and loads Cal.com's inline embed on demand, with name, email and notes prefilled. Cal.com creates the event, sends confirmations and adds the Zoom link.
4. Cal's `bookingSuccessful` event sends the bride to `/book/confirmed?date=&location=&uid=`, which shows the time and place and fires the browser `Schedule` event.

**Follow-up:** the reliable `Schedule` event is server-side. Add a Cal.com webhook (Settings > Developer > Webhooks, trigger `BOOKING_CREATED`) pointing at a new function, e.g. `functions/api/cal-webhook.ts`, that verifies Cal's signature and posts a `Schedule` event to the Conversions API the same way `lead.ts` does. The "Add to calendar" button on the confirmed page links to Cal's booking page when a `uid` is present and to `#` otherwise.

**Redirects.** `public/_redirects` maps the old WordPress URLs. It is a best guess from the old menu: export the real URL list from WordPress (or crawl its sitemap) and check every line before DNS moves.

## Adding content

Content is markdown with frontmatter in `src/content/`, images beside it in `src/assets/`. Schemas are in `src/content.config.ts`.

- **A gown:** add `src/content/gowns/<slug>.md` with `name`, `collection` (a slug from `src/content/collections/`), `line`, optional `fabric`, `silhouette`, `styleNumber`, and an `images` list of `{ src, alt, angle }`. Put the photographs in `src/assets/gowns/<slug>/` and reference them with relative paths. Portrait, 4:5 or 2:3.
- **A bride:** add `src/content/brides/<slug>.md` with `name`, `venue`, `place`, `quote`, `photographer`, `year` and `images`. Photographs go in `src/assets/brides/<slug>/`.
- **Press:** `src/content/press/<slug>.md` with `outlet`, `title`, `url`, `date`.

Rebuild (or push) and the pages pick them up. Square-bracketed text such as `[LEAD TIME]` is a placeholder waiting on Yemi; it is meant to stay visible until filled in.
