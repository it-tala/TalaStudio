# Save to TalaStudio (Chrome extension) — v0.2 (talastudio-prod)

Saves any image you can see in Chrome (Google Photos, Drive, Canva, talastudio.net, any site)
into the TalaStudio photo library in Supabase, tagged by item, view and finish.

## Install (each person, once)

1. Unzip this folder somewhere permanent (e.g. `Documents/talastudio-save`).
2. Chrome → `chrome://extensions` → turn on **Developer mode** (top right).
3. **Load unpacked** → pick the unzipped folder.
4. Pin the extension, click its icon, sign in with your **TalaStudio** email and password.

## Use

- Hover over any image → **Save** button top-left. Or right-click the image → **Save image to TalaStudio**.
- Pick the item (search by code, collection or name; codes in the file name or alt text are matched automatically),
  the view (front, perspective, detail, spec, finish swatch, room hero, landing hero, social, process, other),
  and the finish if the image shows one.
- For room scenes and landing heroes that show several items, pick **"<Collection> — whole collection"**.
- Google Photos / Drive: the extension downloads the **original** file, not the preview.
- The same file saved twice for the same item and view is refused, with the existing path shown.

## Where files go

Private bucket `talastudio-masters`, named automatically:

    doheny/DH-102/DH-102_front_pacific-sand_01.png
    zuma-dining/_collection/zuma-dining_room_hero_01.jpg

Each file gets a row in `talastudio.assets` with status `inbox`, size, dimensions, SHA-256,
source URL and who uploaded it. Approval for web/social is a separate step (`approved_for_web`,
`approved_for_social`).

## Who can use it

Only emails in `talastudio.team_members`. To add someone (they also need a Supabase login):

    insert into talastudio.team_members (email, name, role) values ('name@talastudio.net', 'Name', 'editor');

## Limits

- JPG, PNG, WebP, TIFF, AVIF only (HEIC and GIF are refused). Max 50 MB per file.
- Images drawn on a canvas (some Canva views) have no image element to hover; export them first.
- Item list = the 53 products seeded from the WEBSITE TRACKER on 7 Nov 2026. New items in the tracker
  need the tracker sync (next step) or a manual insert into `talastudio.products`.

## Build the zip

Zip the contents of this folder as `talastudio-save/` (folder name inside the zip) and share the zip. After a new version,
each person clicks the reload icon on `chrome://extensions`.

To point the extension at another Supabase project, change `url` and `key` in `config.js` (publishable key only, never the service key).
