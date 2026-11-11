# TalaStudio website: notes for Claude

Astro static site for talastudio.net. README.md covers running, content pipeline and pages. Pushing `main` rebuilds the
live site (Cloudflare Workers Builds, about a minute). Work on a branch and merge to `main` only when asked.

# Visitor tracker: making links

The site logs visits to Supabase. Two kinds of tracked link:

| Link | For | Looks like | Made with |
|---|---|---|---|
| Person link | one person we email | `https://talastudio.net/?r=<track_code><target>` | `add_contacts` |
| Post link | a LinkedIn / Instagram / WhatsApp post or channel | `https://talastudio.net/?s=<code><target>` | `add_source` |

Staff can do the same by hand at talastudio.net/tracker. Full guide: `docs/visitor-tracking.md`.
SQL history: `supabase/visitor-tracker/00*.sql`.

## Where the data is
- Supabase project **Talastudio**, id `sobinutyzhldustwwmmw`, schema `talastudio_visitor_tracker`. Use the Supabase MCP
  `execute_sql` with that project id. Never the `john-lau-v01` project: it is another company system.
- Tables: `contacts`, `sources` (post links), `page_visits`, `admins`. Functions below run as the table owner, so call
  them directly in SQL (`talastudio_visitor_tracker.<fn>`), not the `public.talastudio_tracker_*` wrappers, which need
  a signed-in admin.
- Schema changes: a new numbered file in `supabase/visitor-tracker/`, applied with `apply_migration`
  (name `talastudio_visitor_tracker_00N`). Do not expose the schema in the Data API.

## Targets: where a link opens
Append one of these to the link (the part after the code). The list matches the dashboard's "Opens on" menu:
`#collections` (default), empty (top of home page), or a collection room `#coll-<slug>`, e.g. `#coll-zuma-living`.
Check the current rooms rather than guessing:

    curl -s https://talastudio.net/tracker/ | grep -o '<option value="#coll-[^"]*">[^<]*' | sort -u

Never link to `/collections/<slug>`: those pages redirect to the home page and the code is lost. Keep `?r=` / `?s=`
before the `#`.

## A post link
1. Look for an existing one first, so a post gets one link:
   `select code, title, owner, target from talastudio_visitor_tracker.sources where title ilike '%<words>%' and not archived;`
2. Create:

       select talastudio_visitor_tracker.add_source('{
         "channel": "linkedin", "owner": "Evin", "title": "Zuma living launch post",
         "target": "#coll-zuma-living", "post_url": null
       }'::jsonb);

   - `channel`: `linkedin`, `instagram`, `facebook`, `whatsapp`, `newsletter`, `other`.
   - `owner`: who posts it, as staff write it: `Evin`, `David`, `TalaStudio page`.
   - `title`: short and recognisable in a list. `target`: from the list above. `post_url`: if the post is already live.
3. Link = `https://talastudio.net/?s=` + returned `code` + `target`. Give the user the link and the title.
4. Once the post is live, add its address:
   `select talastudio_visitor_tracker.update_source('<id>', '{"post_url": "https://..."}'::jsonb);`
   (`title`, `owner`, `archived` can be changed the same way. The code and target never change: the link is out there.)

Instagram captions are not clickable: make separate links for a story sticker, the bio and a Reel, and say so.
When a post is scheduled with Buffer or Metricool, create the post link first, put it in the post text, then add
`post_url` after it is published.

## Person links from an Excel or CSV list
1. Read the file (openpyxl / csv; `python -I`). Map headers loosely: Company (Company name, Organisation), Name (Full name,
   Contact), Email (E-mail), Campaign, Notes. Skip empty rows. Ask the user for the campaign name and target if the file
   does not say.
2. Send rows in chunks of at most 1000:

       select talastudio_visitor_tracker.add_contacts('[
         {"company": "Acme Home", "contact_name": "Pat Lee", "email": "pat@acmehome.com", "campaign": "2026-11 US retailers"}
       ]'::jsonb);

   It returns each row with `track_code` and `existing`. An email already in the list keeps its code (blanks are filled
   in, nothing is overwritten), so re-running a sheet gives the same links. Rows without email always get a new code.
3. Write `<input name>-links.xlsx` next to the input: the original columns plus `Code` and `Link`
   (`https://talastudio.net/?r=<track_code><target>`). Tell the user how many were new and how many already existed.

Escape single quotes in names inside SQL strings (`O''Brien`), or build the JSON with `jsonb_build_object` / pass it as
one literal produced by `json.dumps`.

## Reading results
- Every post link with all-time numbers: `select talastudio_visitor_tracker.source_list();`
- One period, everything the dashboard shows:
  `select talastudio_visitor_tracker.dashboard(now() - interval '7 days', now());`
  (keys: totals, by_day, visitors, pages, collections, countries, devices, referrers, sources)
- Contacts with visits: `select talastudio_visitor_tracker.contact_list();`
- Bots are already left out of these. Times are in seconds.

## Rules
- Results contain IP addresses and names: keep them in the conversation or files the user asked for, nowhere else.
- Test rows: title or company `TEST - delete me`, and delete them (and their `page_visits`) when done.
- Ask before deleting real contacts or post links. Prefer `archived` for posts.
- Dashboard access: `insert into talastudio_visitor_tracker.admins (user_id, note) select id, email from auth.users where email = '...';`
  Never set or read passwords; the user resets them in the SQL Editor or the Supabase dashboard.
- Website keys: only the publishable key (`sb_publishable_...`) goes in the site. Never a secret or service_role key.
