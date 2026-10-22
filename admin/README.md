# TalaStudio admin

The back end of talastudio.net: where staff manage collections, covers and gallery images.

It runs on its own: own folder, own `package.json`, own Cloudflare Pages project, own address (suggested: `admin.talastudio.net`). The website has no admin code. Both talk to the same Supabase project, and Row Level Security decides what each login may do.

## Run it

```bash
cd admin
npm install
npm run dev       # http://localhost:4330 (the website's dev server stays on 4321)
npm run build     # static output in admin/dist
```

Copy `.env.example` to `.env` first. Never commit `.env`.

| Variable | Where | Notes |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL` | `.env` and Cloudflare (plain text) | Same as the website |
| `PUBLIC_SUPABASE_ANON_KEY` | `.env` and Cloudflare (plain text) | Same as the website. Row Level Security limits it to staff |
| `PUBLIC_SITE_URL` | `.env` and Cloudflare (plain text) | The website. Default `https://talastudio.net`; locally `http://localhost:4321` |
| `DEPLOY_HOOK_URL` | Cloudflare (secret) | The **website** project's deploy hook, for Publish site |

## Deploy (Cloudflare Pages, second project)

1. Workers & Pages > Create > Pages > Connect to Git > the same repository.
2. Root directory: `admin`. Build command: `npm run build`. Output directory: `dist`.
3. Variables: the four above.
4. Build watch paths: include `admin/*` here. In the website project, exclude `admin/*`. Each app then only rebuilds for its own changes.
5. Custom domain: `admin.talastudio.net`.
6. Optional extra lock: Cloudflare Access in front of the admin domain. Ask Evin first.

`DEPLOY_HOOK_URL`: website project > Settings > Builds > Deploy hooks > Add deploy hook (branch `main`).

Staff logins: `../SETUP-SUPABASE.md`, section 5.

## How it works

| File | Job |
| --- | --- |
| `src/pages/index.astro` | The page: sign in, collection list, editor |
| `src/lib/app.ts` | Sign-in, Publish site, and which module handles each click and form |
| `src/lib/core.ts` | Shared: Supabase data, page state, messages, image storage |
| `src/lib/collections.ts` | A collection: details, items list, cover, gallery, V1 import and move to storage |
| `src/lib/items.ts` | An item (bed, dresser...): details, sizes and shipping, images per angle and finish |
| `src/lib/image.ts` | Every upload: resized, WebP, watermark baked in (Evin to approve the look) |
| `functions/api/rebuild.ts` | Publish site: checks the caller is staff, then calls the website's deploy hook |
| `src/data/v1-collections.json` | The website's V1 list, for the one-time import below |

The website reads Supabase at build time, so changes show there after **Publish site** (2 to 3 minutes).

## Collection > item > images

- A **collection** (Doheny, Beechwood...) has items, a cover and a gallery.
- An **item** (bed, night table, dresser...) has its own page, `/products/<collection>-<item>`, with sizes, materials and carton data. No prices.
- Each item image has an **angle** (3/4 view, front, side, back, top, detail, in a room) and, once the item comes in more than one colour, a **finish**. Fill the item's Finishes field (first = default) and pick the finish before uploading. The website shows one set of angles per finish, with a button per finish.
- A file named `front.jpg`, `side.png` or `3-4.webp` gets its angle by itself. Others show "Angle?" until one is chosen.

## Moving from the V1 list (once)

The website still shows the collections and items written in its code (`src/data/collections.ts`, images in `public/collections/`).

1. If that list changed since 21 Oct 2026: in the website folder, run `node scripts/export-v1-for-admin.mjs`.
2. Sign in to the admin and click **Import V1 collections** (shown only while Supabase has no collections). Items come along.
3. Set the website's Supabase variables (`../SETUP-SUPABASE.md`, section 3). Before the import, the site would show no collections.
4. In each collection, click **Move to storage**. It reads the V1 files from the live website, which allows this in its `public/_headers`, and adds the watermark where it is missing (V1 covers and galleries; item images already have it).
5. Click **Publish site**. When the live site shows the storage images, delete `public/collections/` in the website and the rule in its `public/_headers`.
