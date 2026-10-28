# Connect Supabase, the website and the catalog email

## 1. Database (once)
Supabase dashboard of the TalaStudio project > SQL Editor > New query.
Paste all of `supabase/setup-all.sql` > Run. (Only in the TalaStudio project.)

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
