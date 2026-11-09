# Logging a render run (for the render workstation)

Every render run leaves one row in `talastudio.render_runs`. The script signs in with the person's own TalaStudio
login (the same email and password as the Save to TalaStudio extension) and calls the function
`ts_log_render_run`. **No service key is needed and none should be put on the workstation.**

Set these environment variables once on the workstation (the key is the *publishable* key; the password is the
person's own login):

    TALASTUDIO_URL   https://rxgtoezweunfrcafqofp.supabase.co
    TALASTUDIO_KEY   <publishable key>
    TS_EMAIL         name@talaliving.com
    TS_PASSWORD      <own password>

## Python (no extra packages)

```python
import json, os, urllib.request as u
URL, KEY = os.environ["TALASTUDIO_URL"], os.environ["TALASTUDIO_KEY"]
def post(path, body, token=None):
    h = {"apikey": KEY, "Content-Type": "application/json"}
    if token: h["Authorization"] = "Bearer " + token
    return json.load(u.urlopen(u.Request(URL + path, json.dumps(body).encode(), h)))
token = post("/auth/v1/token?grant_type=password", {"email": os.environ["TS_EMAIL"], "password": os.environ["TS_PASSWORD"]})["access_token"]
run = post("/rest/v1/rpc/ts_log_render_run", {"p_product_code": "ZA-104", "p_iteration": 1, "p_exposure": -0.3, "p_white_balance": 5600,
           "p_blender_preset": {"rig": "casegoods", "finish": "pacific-sand", "angle": "front"}, "p_verdict": "revise", "p_tags": ["tone"], "p_notes": "first probe"}, token)
print(run)   # {"id": "<uuid of the new render_runs row>"}
```

## Parameters of `ts_log_render_run`

| Parameter | Meaning |
|---|---|
| `p_product_code` | STANDARD CODE, required (e.g. `ZA-104`) |
| `p_iteration` | round number, default 1 |
| `p_blender_preset` | JSON: rig, finish, angle and any values used |
| `p_exposure`, `p_white_balance` | probe values (white balance in kelvin) |
| `p_prompt_text` | Nano Banana prompt used |
| `p_anchor_asset_id`, `p_output_asset_id` | rows in `talastudio.assets` (the anchor image and the saved final) |
| `p_verdict` | `approved` or `revise` |
| `p_tags` | for example `["tone","exposure"]` |
| `p_notes`, `p_job_id` | free text, optional job |

A manual lighting tweak is logged the same way with `ts_log_lighting_tweak`
(`p_product_code`, `p_change_text`, optional `p_finish`, `p_angle`, `p_run_id`).

## SQL (Supabase dashboard, SQL editor)

```sql
select public.ts_log_render_run('ZA-104', 1, '{"rig":"casegoods"}'::jsonb, -0.3, 5600, null, null, null, 'revise', array['tone'], 'first probe');
```
