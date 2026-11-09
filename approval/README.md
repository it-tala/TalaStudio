# Image review page

One static page (`index.html`). Team members sign in with their TalaStudio login and see assets saved through the
extension. Users with role `approver` or `admin` can approve for web, social or both, reject, or send back to inbox.
Other team members can look but get no buttons.

- Talks only to the public functions `ts_review_list` and `ts_review_set` and to Storage (signed preview links).
- The publishable key in the page is safe to ship; the database checks the signed-in user and role on every call.
- Local test: `python -m http.server 8787` in this folder, open http://localhost:8787
- Deploy: any static host (Cloudflare Pages: build command none, output directory `approval`). Never put a service key here.
- TIFF files have no browser preview and show a "TIFF" placeholder.
