# TalaStudio website (talastudio.net)

Marketing and catalog site for TalaStudio, a furniture brand designing in Jepara, Indonesia and selling by the container to trade buyers.

Built with [Astro](https://astro.build) (static), hosted on Cloudflare Pages. Product data comes from Supabase. The layout follows shopharbour.com (structure only, none of its words or images).

Project docs (brief, data model, voice) live in `../talastudio-stack/`. Read `CLAUDE.md` there first.

## Run it

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # static output in dist/
npm run preview   # serve dist/ locally
```

## Environment

Copy `.env.example` to `.env`. Never commit `.env`.

| Variable | Used by | Notes |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL` | site build | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | site build | Anon key. Row Level Security limits it to published items |
| `PUBLIC_TURNSTILE_SITE_KEY` | catalog form | Cloudflare Turnstile site key |
| `PUBLIC_CF_ANALYTICS_TOKEN` | all pages | Cloudflare Web Analytics token |
| `PUBLIC_USE_SAMPLE_DATA` | local preview only | `true` shows the sample catalog when Supabase is not configured |
| `TURNSTILE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `DAVID_EMAIL` | `functions/api/catalog.ts` | Set as Cloudflare Pages secrets |

### Sample data

Until Supabase is live, set `PUBLIC_USE_SAMPLE_DATA=true` in `.env`. The site then shows a made-up catalog from `src/data/sample-catalog.ts` (4 collections, 19 products, no prices). It only applies when Supabase is not configured. **Never set this on Cloudflare Pages.**

## Preview screenshots

Full-page screenshots of the current build are in `docs/preview/`, for sharing with the team. They use the **sample catalog** (invented collections and placeholder images), so they show the layout, not final content.

| File | Page |
| --- | --- |
| `01-home.png` | Home (desktop) |
| `02-collections.png` | Collections |
| `03-collection-kenari.png` | A collection page |
| `04-product-bench.png` | A product page |
| `05-about.png` | About (brand story) |
| `06-the-studio.png` | The Studio, Jepara |
| `07-request-catalog.png` | Request catalog form |
| `08-home-mobile.png` | Home (phone, 390px) |
| `09-collections-mobile.png` | Collections (phone) |

Captured on 13 October 2026. Retake them after big layout or copy changes: build, run `npm run preview`, and capture each page full-page at 1440px wide (desktop) and 390px wide (phone).

## Structure

```
src/
  pages/        one file per page; collections/[slug] and products/[slug] are generated from Supabase
  components/   Header, Footer, Ph (image placeholder + watermark), CollectionBlock, PageHero, CtaBand
  layouts/      Base.astro (title, description, link preview tags, analytics)
  styles/       global.css (palettes, type), layout.css (Harbour-style sections)
  lib/          supabase.ts (client, queries, image URLs)
  data/         sample-catalog.ts (preview), demo-dashboard.ts (sample buyer dashboard)
  content/      insights/*.md (articles)
functions/api/catalog.ts   catalog form: spam check, save to Supabase, email David
public/                    favicon, robots.txt
```

## Pages

Home, Collections, Collection page, Product page, How we work, The Studio, Buyer dashboard (demo), Partner with us, How a container works, Sourcing from Indonesia, About, Insights, Request catalog, Contact, Privacy and terms. `/palettes` is an internal colour preview and is left out of the sitemap.

## Rules (from the brief)

- Product data comes from Supabase, never typed into pages. Exceptions: the labelled demo dashboard data and the sample catalog.
- No prices, cart or sale pages. Queries never select `product_pricing`.
- No people in images. Renders and studio shots only.
- Every product image is watermarked. The site shows only images with `is_watermarked = true`. The "TALASTUDIO" overlay on placeholders is not a real watermark: bake it into the image files before upload.
- Warm stone or dark colours, no white background. Motion is soft fades only.
- Every page has a title, description and link preview image.
- Show only part of each collection. The full range is in the catalog.

## Data

Collections and products are read from Supabase **at build time**. Add or publish rows, then rebuild (a Supabase webhook can trigger a Cloudflare Pages deploy). Schema: `../talastudio-stack/supabase/001_initial_schema.sql`.

Images load from a public storage bucket named `public-images` (set in `src/lib/supabase.ts`).

## Deploy (Cloudflare Pages)

- Build command: `npm run build`
- Output directory: `dist`
- Add the variables above in Pages settings. The `functions/` folder deploys as Pages Functions.
- Add the Cloudflare Web Analytics token and submit `https://talastudio.net/sitemap-index.xml` to Google Search Console.

## Status

Done: layout, all pages, collection and product templates, catalog form code, privacy and terms draft, sample catalog.

Still needed:

- Supabase project, schema run, `public-images` bucket and published rows
- `/og-default.jpg` link preview image (currently missing)
- Real renders and studio photos, watermarked
- Email to David needs a sender service (Resend is assumed). Ask Evin before signing up
- Turnstile keys
- Evin's review of: privacy and terms, About, Sourcing from Indonesia, the materials copy on Home
- Brand story from Evin (`06-brand-voice.md` is a placeholder)
- GitHub repo connected to Cloudflare Pages
