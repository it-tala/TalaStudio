# Visitor tracker

The website logs every visit: pages viewed and for how long, the collection rooms looked at on the home page, the site
the visitor came from, IP address, country and device. People who arrive from an outreach email link (`?r=<code>`) are
linked to their contact record; everyone else is anonymous. Browsers that send Global Privacy Control are not tracked.

- **Dashboard and link generator:** `https://talastudio.net/tracker` (staff login, not linked anywhere, not in Google).
- **Data:** Supabase project **Talastudio** (`sobinutyzhldustwwmmw`), schema **`talastudio_visitor_tracker`**.
- **SQL:** `supabase/visitor-tracker/001_schema.sql`, then `002_dashboard.sql` (both applied 11 Nov 2026).
- **Script on every page:** `src/components/VisitTracker.astro`. The dashboard page itself is not tracked.

## Setup (once)

### 1. Website settings
Cloudflare > Workers & Pages > TalaStudio > Settings > **Build** > Variables and secrets (not "Runtime variables and
secrets": the site has no Worker script, and Astro writes these into the pages while it builds). Type: Text.

    PUBLIC_TRACKER_URL=https://sobinutyzhldustwwmmw.supabase.co
    PUBLIC_TRACKER_KEY=<Supabase > Project Settings > API Keys > Publishable key (sb_publishable_...)>

Then start a new build (Deployments > Retry, or push a commit). Without these two the site does not track and
`/tracker` shows a warning.
They are separate from `PUBLIC_SUPABASE_URL` on purpose: that one switches the site's collections to Supabase.

### 2. A login for each person who may open the dashboard
Supabase (Talastudio project) > Authentication > Users > Add user > **Create new user**: their email, a password
(at least 8 characters; share it with them privately), tick **Auto Confirm User**. No emails are sent, so no SMTP setup
is needed. Change a password later: the user's row > "..." > Reset password, or delete and re-create the user.

### 3. Give someone access
Supabase > SQL Editor:

    insert into talastudio_visitor_tracker.admins (user_id, note)
    select id, 'IT' from auth.users where email = 'it@talaliving.com';

Remove access: `delete from talastudio_visitor_tracker.admins where user_id = (select id from auth.users where email = '...');`

A login that is not on this list can sign in but sees "not on the tracker admin list" and no data.

### 4. Recommended
Authentication > Sign In / Providers: turn off "Allow new users to sign up", so only accounts you create exist.

## Using the dashboard
Sign in at `/tracker` with your work email and password.

**Dashboard tab:** pick the period. Totals (visitors = browsers, visits = tab sessions), visitors per day, time per
collection room, pages, countries, devices and where people came from. The Visitors table has one row per browser: the
contact's name if they came from an email link, otherwise "Anonymous", plus country, device and browser, IP address,
visits, pages, time and favourite collection. Click a row for the full trail. "Download Excel" exports the table.

**Links tab:**
1. Choose where the link opens (the collections section, the top of the home page, or one collection room) and a
   campaign name for rows that have none.
2. Upload an Excel (.xlsx) or CSV file, or copy rows in Excel and paste them, header row included. Recognised headers:
   Company, Name (or Full name / Contact), Email, Campaign, Notes. "Download the Excel template" gives the layout.
3. "Create links". You get a table with a link per person: copy one, "Copy all" (pastes into Excel as columns), or
   "Download Excel" (your columns plus Code and Link).

An email already in the list keeps its code, so running the same sheet again gives the same links. The "All contacts"
table lists everyone, their visits, and their link for the page chosen in step 1. Deleting a contact also deletes their
visit history.

Links look like `https://talastudio.net/?r=1a2b3c4d5e6f#collections`. Keep `?r=` before the `#`. Do not link to
`/collections/<slug>` while `/collections` is switched off in `src/data/sections.ts`: it redirects and loses the code.

## Straight from Supabase (optional)
Table Editor > schema `talastudio_visitor_tracker`: `contacts`, `page_visits`, and the reports `engagement` and
`collection_time`. New contacts can be added here too: `track_code` and `link` fill themselves.

## Limits
- Opening the email is tracked by the email tool, not here. Here we see people who opened the website.
- If someone forwards the email, the colleague is counted as the same contact. A new browser or device is a new visitor
  until they open a link with their code there too.
- Time counts only while the tab is visible, at most 2 hours per row. A collection room counts while its panel fills
  at least a third of the window.
- Country comes from the IP address (Cloudflare). City is not available. Office networks and VPNs can show another
  country.
- Clearing site data or a private window makes a returning person look new.
