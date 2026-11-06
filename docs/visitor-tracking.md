# Who opened our email link, and what they looked at

Each contact gets a private code. Outreach emails link to the site with `?r=<code>`.
When that person opens the link, the site logs each page they view, how long the tab was visible, and on the home page
how long each collection room was on screen. Visitors without a code are not tracked. Browsers that send Global
Privacy Control are not tracked.

## Where the data lives
Supabase project **john-lau-v01**, schema **`talastudio_visitor_tracker`** (SQL: `supabase/visitor-tracker/001_schema.sql`).

| Object | What it is |
| --- | --- |
| `contacts` | One row per person we email. `track_code` and `link` fill themselves. |
| `page_visits` | Every page view and every collection room seen. |
| `engagement` | Report: one row per contact who visited. Visits, page views, seconds, first and last seen. Most engaged first. |
| `collection_time` | Report: seconds per contact per collection room (`zuma`, `zuma-living`, ...). |
| `public.talastudio_log_page_visit()` | The website's only way in. It writes visits and cannot read anything. |

The schema is not exposed to the public API. Read it in the Supabase dashboard: Table Editor, pick the schema
`talastudio_visitor_tracker` in the schema menu at the top left.

Website settings (Cloudflare > Workers & Pages > TalaStudio > Settings > Variables, plain text, then redeploy):

    PUBLIC_TRACKER_URL=https://hhphmfqbtwcxpvubmwbq.supabase.co
    PUBLIC_TRACKER_KEY=<Supabase > Project Settings > API Keys > publishable key>

Separate from `PUBLIC_SUPABASE_URL` on purpose: that one switches the site's collections to Supabase.

## Making links

### A. Directly in Supabase
Table Editor > `talastudio_visitor_tracker` > `contacts` > Insert row. Fill company, contact name, email
(and `campaign` if you like, e.g. `2026-11 US retailers`). Leave `track_code` and `link` empty: the link appears on save.

Many at once, in SQL Editor:

    insert into talastudio_visitor_tracker.contacts (company, contact_name, email, campaign) values
      ('Acme Home', 'Pat Lee', 'pat@acmehome.com', '2026-11 US retailers'),
      ('Oak & Co', 'Sam Diaz', 'sam@oakco.com', '2026-11 US retailers')
    returning contact_name, email, link;

Copy the result (or Export > CSV) into the email tool and use its merge tag for the `link` column, e.g. `{{link}}`.

Links to another page, e.g. one collection room:

    select contact_name, email, 'https://talastudio.net/?r=' || track_code || '#coll-zuma' as link
    from talastudio_visitor_tracker.contacts where campaign = '2026-11 US retailers';

Keep `?r=` before the `#`. Do not link to `/collections/<slug>` while `/collections` is switched off in
`src/data/sections.ts`: it redirects to the home page and the code is lost.

### B. From a spreadsheet
1. Keep the list in a sheet with these column headers: `company`, `contact_name`, `email`, `campaign`, and `notes` if
   you want it. No other columns, and no `track_code` or `link` column: Supabase makes those.
2. File > Download > CSV.
3. Supabase > Table Editor > `talastudio_visitor_tracker` > `contacts` > Insert > Import data from CSV.
   Each row gets its code and link. A row with an email already in the table is refused, so re-importing is safe to try.
4. Get the links back into the sheet: SQL Editor >

       select email, link from talastudio_visitor_tracker.contacts where campaign = '<campaign>';

   Export > CSV, paste into a second tab, and in the main tab look the link up by email:

       =XLOOKUP(C2, Links!A:A, Links!B:B, "")

Do not make codes in the sheet with RAND(): it changes every time the sheet recalculates. Let Supabase make them.

## Reading the results
Table Editor > `engagement` or `collection_time`, or in SQL Editor:

    -- Who came in the last 7 days
    select company, contact_name, visits, round(total_seconds / 60.0, 1) as minutes, last_seen
    from talastudio_visitor_tracker.engagement where last_seen > now() - interval '7 days';

    -- The collection each contact spent longest on
    select distinct on (contact_id) company, contact_name, collection_slug, total_seconds
    from talastudio_visitor_tracker.collection_time order by contact_id, total_seconds desc;

## Limits
- Opening the email is tracked by the email tool, not here. Here we see only people who clicked a link.
- If someone forwards the email, the colleague is counted as the same contact.
- Time counts only while the tab is visible, at most 2 hours per row. A room counts while its panel fills at least a
  third of the window.
- Someone who opts out: delete their row in `contacts` (their visits go with it).
