# Unsubscribe link in the outreach emails

Every outreach email sent from David's mailbox can carry a personal unsubscribe link. The buyer opens a page on
talastudio.net that shows their address and one button. Pressing it records the opt-out, and within the hour the buyer's
Status on the Email Tracker tab of the DC buyers sheet becomes **Not interested**, which stops any further email.

- **Page:** `https://talastudio.net/unsubscribe/` (`src/pages/unsubscribe.astro`). Not linked anywhere, not in the
  sitemap, not in Google, no visit tracking.
- **Link:** `https://talastudio.net/unsubscribe/?e=<address in base64url>&k=<signature>`.
- **Data:** Supabase project **Talastudio** (`sobinutyzhldustwwmmw`), table `public.outreach_optouts`.
- **SQL:** `supabase/visitor-tracker/006_unsubscribe.sql` (applied 24 Nov 2026).
- **Script:** `Unsubscribe.gs` in the Apps Script project of the DC buyers sheet (copy in the Claude project docs:
  `claude/SMB__SCRIPT__unsubscribe-link.gs`).

## How it works
1. When the script builds an email it works out the buyer's link: the address, plus a signature made from the address
   and the key in the **Unsubscribe key** row of the sheet's Email Setup tab. It swaps the link in for the reply-email
   opt-out button of the Gmail draft (any `mailto:` link whose subject starts with "Unsubscribe") and for `{Unsubscribe}`.
2. The page shows the address and an **Unsubscribe** button. Nothing is recorded when the page opens: mail security
   scanners open every link in an email, and would otherwise unsubscribe buyers who never clicked.
3. The button calls `public.talastudio_unsubscribe(email, signature)`. A signature that does not match changes nothing.
   A valid one writes `opted_out_at` in `public.outreach_optouts`. The buyer may then pick a reason, saved in `reason`.
4. Every hour, with the reply check, the script sends the signatures of the people on the Email Tracker tab to
   `public.talastudio_unsubscribed()` and sets Status to "Not interested" for the ones returned. The Reply column shows
   "Unsubscribed 24 Nov 14:05 WIB" and the reason.

## Switching it on and off
The **Unsubscribe page** row on Email Setup holds the page address. Empty = the emails keep the reply-email button of the
draft. Fill it in only while the page is live on talastudio.net.

The website needs `PUBLIC_TRACKER_URL` and `PUBLIC_TRACKER_KEY` at build time (see `docs/visitor-tracking.md`). Without
them the page tells the visitor to reply to the email instead.

## Reading the opt-outs

    select email, company, opted_out_at, method, reason from public.outreach_optouts
    where opted_out_at is not null order by opted_out_at desc;

## Testing
Make a link for an address of your own in the SQL Editor, open it, press the button, then delete the row:

    select 'https://talastudio.net/unsubscribe/?e='
      || rtrim(translate(encode(convert_to('you@example.com', 'utf8'), 'base64'), '+/', '-_'), '=')
      || '&k=' || talastudio_visitor_tracker.unsubscribe_sig('you@example.com');

    delete from public.outreach_optouts where email = 'you@example.com';

## Changing the key
`update talastudio_visitor_tracker.outreach_settings set unsubscribe_key = encode(extensions.gen_random_bytes(24), 'hex');`
then copy the new value to the Unsubscribe key row on Email Setup. Links in emails already sent stop working (the page
then asks the buyer to reply instead), so only do this if the key has leaked.
