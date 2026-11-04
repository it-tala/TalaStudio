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

There is no product page screenshot: V1 shows collections only, and product pages return when products come from Supabase.

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

## Update from the line sheet (tracker CMS)

For now the collection items come from the Google Sheet **TS LINE SHEET**, not Supabase:

- [WEBSITE TRACKER tab](https://docs.google.com/spreadsheets/d/1vvQfDAKrxLSTQlbQf5lxOjKVatwMCAKuMGqARdhVai0/edit?gid=2116328639#gid=2116328639): images, codes, names, sizes, descriptions and specifications.
- [SPEC SHEET DATA tab](https://docs.google.com/spreadsheets/d/1vvQfDAKrxLSTQlbQf5lxOjKVatwMCAKuMGqARdhVai0/edit?gid=917000001#gid=917000001): the spec sheet text (finish, hardware, notes, swatches). Change the sheet, then run the update in one of two ways:

- **Ask Claude:** type `update dari sheet`. Type `cek dulu update dari sheet` to only see what would change. Claude runs the update, checks the build in a scratch copy, and reports what changed. Nothing is pushed until you say `push`.
- **Run it yourself:** double-click `C:\PROJECT\tala-render-studio\Studio_Furniture\UPDATE_SEMUA.cmd`. To only see what would change, run `UPDATE_SEMUA.cmd --coba` from a Command Prompt in that folder. Then push.

The update only touches what changed since the last run. The record of the last run is `06_SPEC_SHEET\catatan_terakhir.json`. The update never writes to the sheet and never commits or pushes. The full guide is `06_SPEC_SHEET\CARA_UPDATE.md`.

| Sheet column | On the site |
|---|---|
| LP 1 LINK (LP HERO 1) | The collection's main image: the landing page hero, the collection card and the collection page (`public/collections/<collection>/<room>/hero.jpg`) |
| LP 2 LINK, LP 3 LINK | `lp-2.jpg`, `lp-3.jpg` in the same folder (kept for later, not shown) |
| IT F LINK, IT P LINK, IT DET LINK | Item photos: front, 3/4, detail (`<item>/01.jpg`, `02.jpg`, …) |
| RM 1 LINK, RM 2 LINK | The item in a room (`<item>/room.jpg`, `room-2.jpg`) |
| STANDARD CODE, NAME, DIMENSION, WEBSITE DESCRIPTION, WEBSITE SPECIFICATION | `src/data/tracker-items.json` (code, name, size, text) |
| SPEC SHEET DATA tab, with WEBSITE TRACKER as fallback | `<item>/spec.jpg`, the last slide in the item viewer, plus PNG files and zips in `06_SPEC_SHEET\hasil` and `export` |

Each link uses the first photo in its Google Photos album.

- **Empty album or broken (404) link:** the current image stays.
- **No product photo link:** the row is skipped.
- **Spec sheets:** every item with a code and photos gets one. Each field comes from SPEC SHEET DATA. Empty fields there are filled from WEBSITE TRACKER: size, and WEBSITE SPECIFICATION as the notes. An item with no SPEC row, or whose SPEC text belongs to another item (reported as `[ISI]`), uses the tracker data only. Empty photo slots and empty rows are left off the image.
- **Clashes:** the run stops without writing anything if two rows would become the same item, or if a code or description names another collection.
- **Item folders no longer in the sheet:** only reported. To delete them, run `python isi_item_website.py --hapus`.

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
