# Connect Supabase, the website and the catalog email

## 1. Database (once)
Supabase dashboard of the TalaStudio project > SQL Editor > New query.
Paste all of `supabase/setup-all.sql` > Run. (Only in the TalaStudio project.)
Already ran an older setup-all.sql (migrations 001 to 004)? Then run only
`supabase/migrations/20261021000005_item_angles_finishes.sql` (item angles and finishes).

## 2. Where to find the values
Supabase > Project Settings > API:
- Project URL            -> SUPABASE_URL and PUBLIC_SUPABASE_URL
- anon / publishable key -> PUBLIC_SUPABASE_ANON_KEY
- service_role key       -> SUPABASE_SERVICE_ROLE_KEY (secret, server only)

## 3. Where to put them
Local site build: `.env`
    PUBLIC_SUPABASE_URL=...
    PUBLIC_SUPABASE_ANON_KEY=...
    (remove PUBLIC_USE_SAMPLE_DATA when Supabase has published rows)

Local form test: `.dev.vars` (copy `.dev.vars.example`)
    SUPABASE_URL=...   SUPABASE_SERVICE_ROLE_KEY=...   DAVID_EMAIL=...

Live site: Cloudflare dashboard > Workers & Pages > TalaStudio > Settings
  > Variables and Secrets (Production)
    PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, PUBLIC_TURNSTILE_SITE_KEY   (plain text, needed at build)
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TURNSTILE_SECRET_KEY, DAVID_EMAIL  (Secret)
  > Bindings > Send email, name: EMAIL
Then redeploy.

## 4. How "Send request" reaches David
form (/request-catalog) -> POST /api/catalog (functions/api/catalog.ts)
  -> Turnstile check -> saved in table catalog_requests (Supabase)
  -> email to DAVID_EMAIL via the EMAIL binding (Cloudflare Email Service).
Test: submit the form once, check the row in Supabase and David's inbox/spam.

## 5. Staff logins (for the admin app)
The admin app (`admin/`, its own Cloudflare Pages project) is where staff manage collections,
covers and gallery images. Setup, deploy and the move from the V1 list: `admin/README.md`.

Turn off public sign-ups first:
  Supabase > Authentication > Sign In / Providers > "Allow new users to sign up" = off.

Add a staff member (Evin, David, Rian, Azkia):
  1. Supabase > Authentication > Users > Add user > Create new user
     (their talastudio.net email, a password from the password manager, Auto Confirm on).
  2. SQL Editor (role: 'owner' for Evin and David, 'approver' for Rian and Azkia):
       insert into staff (user_id, full_name, role)
       select id, 'Azkia', 'approver' from auth.users where email = 'azkia@talastudio.net';
  Signed in but not in `staff` = no access. Row Level Security enforces this, not the app.
