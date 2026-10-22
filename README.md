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

**If the page looks like plain HTML (no design):**

0. **Most common cause: the folder name's letter case.** The folder is `TalaStudio.net` (capital T and S). If the terminal path shows `talastudio.net` in lowercase, `npm run dev` and `npm run build` produce pages with **no stylesheet** (tested: 0 style tags). Windows treats both as the same folder, but Vite does not. Fix: `cd` into the exact-case folder (use Tab to complete the name), check that the prompt shows `TalaStudio.net`, and open VS Code on that exact folder. Then stop the server, delete `node_modules/.vite`, `node_modules/.astro` and `.astro`, and run `npm run dev` again.
1. Run only **one** dev server. Two servers in the same project share a cache, and one of them loses its styles. If a second `npm run dev` starts on port 4322, stop it.
2. Always open `http://localhost:4321`, not 4322.
3. Fix: stop every `node` dev server, delete `node_modules/.vite` and `node_modules/.astro`, then run `npm run dev` once.
4. Do not run `npm run build` while the dev server is open. Stop it first, or restart it afterwards.
5. Never double-click `dist/index.html`. Its styles load from `/_astro/` and only work from a web server.

**Before every push (Cloudflare deploys what GitHub receives):**

```bash
npm run build
node scripts/verify-build.mjs   # fails if any page would show as plain HTML
```

The local dev server problem above does not affect the deployed site. Cloudflare runs its own clean `npm run build` and serves `dist/`, which the check above verifies.

## Environment

Copy `.env.example` to `.env`. Never commit `.env`.

| Variable | Used by | Notes |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL` | site build | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | site build | Anon key. Row Level Security limits it to published items |
| `PUBLIC_TURNSTILE_SITE_KEY` | catalog form | Cloudflare Turnstile site key |
| `PUBLIC_CF_ANALYTICS_TOKEN` | all pages | Cloudflare Web Analytics token |
| `PUBLIC_USE_SAMPLE_DATA` | local preview only | `true` shows the sample catalog when Supabase is not configured |
| `TURNSTILE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DAVID_EMAIL` (+ Cloudflare `EMAIL` send binding) | `functions/api/catalog.ts` | Set as Cloudflare Pages secrets |

### Sample data

Until Supabase is live, set `PUBLIC_USE_SAMPLE_DATA=true` in `.env`. The site then shows a made-up catalog from `src/data/sample-catalog.ts` (4 collections, 19 products, no prices). It only applies when Supabase is not configured. **Never set this on Cloudflare Pages.**

## Preview screenshots

Full-page screenshots of the current build are in `docs/preview/`, for sharing with the team. They show the real static collections (bedroom and living, with dining marked "coming soon") and the Studio photos. Retaken on 15 October 2026.

**Desktop (1440px wide)**

| File | Page |
| --- | --- |
| `01-home.png` | Home |
| `02-collections.png` | Collections (full-screen intro, a sideways strip per room) |
| `03-collection-doheny.png` | A collection page (gallery photos open in a zoom viewer on click) |
| `04-about.png` | About (brand story) |
| `05-the-studio.png` | The Studio, Jepara |
| `06-request-catalog.png` | Request catalog form |

**Mobile (390px wide, phone view)**

| File | Page |
| --- | --- |
| `07-home-mobile.png` | Home |
| `08-collections-mobile.png` | Collections |
| `09-collection-mobile.png` | A collection page |
| `10-request-catalog-mobile.png` | Request catalog form |
| `11-menu-open-mobile.png` | Menu open (top of screen only) |

There is no product page screenshot yet. The first item page is `/products/beechwood-6-drawer-dresser` (added 21 October 2026): one main view with a thumbnail per angle, and a button per finish once an item has more than one.

### How mobile differs from desktop

- **Header:** the logo and a three-line menu button only. The menu holds all links and the Request catalog button.
- **Proof strip** (the dark band of four points under the hero): hidden on phones.
- **Home collections:** the three featured collections (living, then dining when it exists, then bedroom) swipe sideways instead of stacking. "Materials" and "By space" do the same.
- **Collections page:** each room is a sideways strip. Cards are about 78% of the screen wide, so the next one shows at the edge. The grid is no longer used there.

Retake them after layout or copy changes: build, run `npm run preview`, then capture each page full-page. Use a real 390px phone view with 2x pixel density. A plain headless Chrome window will not go narrower than about 500px and gives a cropped result. Scroll the page to the bottom before capturing, so lazy images load.

## Structure

```
src/
  pages/        one file per page; collections/[slug] and products/[slug] are generated from Supabase
  components/   Header, Footer, Ph (image placeholder + watermark), CollectionBlock, PageHero, CtaBand
  layouts/      Base.astro (title, description, link preview tags, analytics)
  styles/       global.css (palettes, type), layout.css (Harbour-style sections)
  lib/          supabase.ts (client, queries, image URLs)
  data/         collections.ts (V1 collections and items), angles.ts (item angles), demo-dashboard.ts (sample buyer dashboard)
  content/      insights/*.md (articles)
functions/api/catalog.ts   catalog form: spam check, save to Supabase, email David
public/                    favicon, robots.txt, _headers (lets the admin app read the V1 image files)
admin/                     the back end: staff app for collections and images, built and deployed on its own (admin/README.md)
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

Collections and products are read from Supabase **at build time**. Staff manage collections and their images in the admin app (`admin/`, a separate Cloudflare Pages project; see `admin/README.md`). Its **Publish site** button rebuilds this site through a deploy hook. Schema: `supabase/migrations/`.

Images load from a public storage bucket named `public-images` (set in `src/lib/supabase.ts`).

## Deploy (Cloudflare Pages)

- Build command: `npm run build`
- Output directory: `dist`
- Add the variables above in Pages settings. The `functions/` folder deploys as Pages Functions.
- Add the Cloudflare Web Analytics token and submit `https://talastudio.net/sitemap-index.xml` to Google Search Console.

## Privacy and terms

The privacy policy and terms (`src/pages/privacy-and-terms.astro`) are a draft and need a lawyer's review before launch.

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
