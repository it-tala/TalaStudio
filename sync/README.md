# Tracker -> Supabase sync

`tracker_sync.py` copies the WEBSITE TRACKER tab (Google Sheet, read as CSV, shared by link) into `talastudio.products`.
One way only. Python standard library only.

What it does
- Reads headers from row 2 and data from row 4, by header name. DIMENSION mm needs W / D / H in row 3.
- Key = STANDARD CODE. The CODE column is never read. Prices and other tabs are never read or written.
- Synced columns: collection, collection_slug, room, item_type, name, w/d/h mm, finishes (MAT 1-4), blend_file, and, once the
  columns exist in the sheet, carton W/D/H, cartons per item, CBM calc / override / final, qty per 40HQ.
- Never deletes. A product that is in the database but not in the tracker is reported as "missing in tracker".
- Rows without a name, with a bad code or an unknown room are skipped and listed. Unparsable numbers leave that field unchanged.
- Every run (dry or real) is logged with its diff in `talastudio.sync_runs`.

Column names for the carton / CBM fields (any one alias per field is enough)
- cartons per item: `CARTONS PER ITEM`; qty per 40HQ: `QTY PER 40HQ`
- `CBM CALC`, `CBM OVERRIDE`, `CBM FINAL`
- carton size: either `CARTON W` / `CARTON D` / `CARTON H`, or one `CARTON SIZE mm` header with W / D / H in row 3

Run
    python tracker_sync.py --emit rows.json     parse only
    python tracker_sync.py                      dry run against the database (needs SUPABASE_URL, SUPABASE_SECRET_KEY)
    python tracker_sync.py --write              apply

The database side is `public.ts_sync_products` (service role only), see `supabase/migrations/0005_tracker_sync.sql`.
The secret key is read from the environment; on the server it comes from Secret Manager. Never put it on a laptop.
