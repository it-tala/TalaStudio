#!/usr/bin/env python3
"""One-way sync: WEBSITE TRACKER tab (Google Sheet, read as CSV) -> talastudio.products.

Rules (from the week-46 brief):
  * reads ONLY the WEBSITE TRACKER tab, by header name (row 2 = headers, row 3 = W/D/H sub-labels, data from row 4)
  * the key is STANDARD CODE; the CODE column is never read
  * never reads or writes prices, and never touches any other tab
  * never deletes: products missing from the tracker are only reported
  * writes only through the database function public.ts_sync_products (service role), which returns the diff

Usage
  python tracker_sync.py --emit rows.json          parse only, write the rows that would be sent
  python tracker_sync.py                            dry run against the database (prints the diff, writes nothing)
  python tracker_sync.py --write                    apply the changes and log the run in talastudio.sync_runs

Environment (job): SUPABASE_URL, SUPABASE_SECRET_KEY (injected from Secret Manager), optional TRACKER_CSV_URL.
"""
import csv, io, json, os, re, sys, urllib.request, urllib.error

SHEET_ID = "1vvQfDAKrxLSTQlbQf5lxOjKVatwMCAKuMGqARdhVai0"
GID = "2116328639"  # WEBSITE TRACKER
DEFAULT_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}"

CODE_RE = re.compile(r"^[A-Z]{2}-[0-9]{3}$")
ROOMS = [("DINING", "dining"), ("LIVING", "living"), ("BEDROOM", "bedroom")]
FINISH_HEADERS = ["MAT 1", "MAT 2", "MAT 3", "MAT 4"]  # MAT 5 holds hardware, not a finish

# Optional planned columns. Any header alias found in the sheet is used; missing ones are skipped and reported.
INT_ALIASES = {
    "cartons_per_item": ["CARTONS PER ITEM", "CARTON PER ITEM", "CARTONS/ITEM"],
    "qty_per_40hq": ["QTY PER 40HQ", "QUANTITY PER 40HQ", "QTY/40HQ", "QTY 40HQ"],
}
NUM_ALIASES = {
    "cbm_calc": ["CBM CALC", "CBM CALCULATED"],
    "cbm_override": ["CBM OVERRIDE"],
    "cbm_final": ["CBM FINAL"],
}
CARTON_SINGLE = {
    "carton_w_mm": ["CARTON W", "CARTON W MM", "CARTON WIDTH"],
    "carton_d_mm": ["CARTON D", "CARTON D MM", "CARTON DEPTH"],
    "carton_h_mm": ["CARTON H", "CARTON H MM", "CARTON HEIGHT"],
}
CARTON_GROUP = ["CARTON SIZE MM", "CARTON SIZE", "CARTON MM", "CARTON DIMENSION MM"]  # with W / D / H in row 3


def norm(s):
    return re.sub(r"\s+", " ", (s or "").strip()).upper()


def fetch_csv(url):
    req = urllib.request.Request(url, headers={"User-Agent": "talastudio-tracker-sync/1"})
    return urllib.request.urlopen(req, timeout=60).read().decode("utf-8")


def to_int(v):
    v = (v or "").strip().replace(",", "")
    if v == "":
        return "empty"
    m = re.fullmatch(r"(\d+)(?:\.0+)?", v)
    return int(m.group(1)) if m else "bad"


def to_num(v):
    v = (v or "").strip().replace(",", ".") if (v or "").count(",") == 1 and "." not in (v or "") else (v or "").strip().replace(",", "")
    if v == "":
        return "empty"
    try:
        return round(float(v), 3)
    except ValueError:
        return "bad"


def title_name(s):
    words = []
    for w in s.strip().split():
        words.append(w.upper() if w.upper() in {"TV"} else w.capitalize())
    return " ".join(words)


def parse(text):
    rows = list(csv.reader(io.StringIO(text)))
    if len(rows) < 4:
        raise SystemExit("tracker has fewer than 4 rows; wrong tab?")
    header, sub, data = rows[1], rows[2], rows[3:]
    ix = {}
    dup = []
    for i, c in enumerate(header):
        k = norm(c)
        if not k:
            continue
        if k in ix:
            dup.append(k)
        else:
            ix[k] = i
    warnings = []
    for need in ["COLLECTION", "STANDARD CODE", "ROOM / ITEM", "NAME", "DIMENSION MM"]:
        if need not in ix:
            raise SystemExit(f"required header missing: {need}")
    dim = ix["DIMENSION MM"]
    if [norm(x) for x in sub[dim:dim + 3]] != ["W", "D", "H"]:
        raise SystemExit("DIMENSION mm is not followed by W / D / H in row 3")
    if "BLEND" not in ix:
        warnings.append("header BLEND not found: blend_file not synced")
    for h in ["STANDARD CODE", "NAME", "ROOM / ITEM", "COLLECTION", "BLEND"] + FINISH_HEADERS:
        if h in dup:
            warnings.append(f"duplicate header {h}: first one used")
    fin_idx = [ix[h] for h in FINISH_HEADERS if h in ix]

    def find(aliases):
        for a in aliases:
            if norm(a) in ix:
                return ix[norm(a)]
        return None

    optional = {}      # field -> ("int"|"num", column index)
    for f, al in INT_ALIASES.items():
        i = find(al)
        if i is not None:
            optional[f] = ("int", i)
    for f, al in NUM_ALIASES.items():
        i = find(al)
        if i is not None:
            optional[f] = ("num", i)
    gi = find(CARTON_GROUP)
    if gi is not None and [norm(x) for x in sub[gi:gi + 3]] == ["W", "D", "H"]:
        for off, f in enumerate(["carton_w_mm", "carton_d_mm", "carton_h_mm"]):
            optional[f] = ("int", gi + off)
    else:
        for f, al in CARTON_SINGLE.items():
            i = find(al)
            if i is not None:
                optional[f] = ("int", i)
    missing_optional = [f for f in list(INT_ALIASES) + list(NUM_ALIASES) + list(CARTON_SINGLE) if f not in optional]

    def cell(r, i):
        return r[i].strip() if i is not None and i < len(r) else ""

    out, skipped, seen = [], [], set()
    for n, r in enumerate(data, start=4):
        code = cell(r, ix["STANDARD CODE"])
        if not code:
            continue
        if not CODE_RE.match(code):
            skipped.append({"row": n, "code": code, "reason": "STANDARD CODE not like AA-999"})
            continue
        if code in seen:
            skipped.append({"row": n, "code": code, "reason": "duplicate STANDARD CODE; first row used"})
            continue
        coll = cell(r, ix["COLLECTION"])
        name = cell(r, ix["NAME"])
        ri = norm(cell(r, ix["ROOM / ITEM"]))
        room = next((v for k, v in ROOMS if ri.startswith(k)), None)
        if not coll or not name or not room:
            why = [w for w, bad in (("COLLECTION", not coll), ("NAME", not name), ("ROOM / ITEM", not room)) if bad]
            skipped.append({"row": n, "code": code, "reason": "missing " + ", ".join(why)})
            continue
        seen.add(code)
        item = ri.split(" - ", 1)[1].lower() if " - " in ri else None
        rec = {
            "code": code,
            "collection": coll.capitalize(),
            "collection_slug": coll.lower() + ("" if room == "bedroom" else "-" + room),
            "room": room,
            "item_type": item,
            "name": title_name(name),
            "finishes": [cell(r, i) for i in fin_idx if cell(r, i)],
            "blend_file": cell(r, ix["BLEND"]) or None if "BLEND" in ix else None,
        }
        if "BLEND" not in ix:
            del rec["blend_file"]
        for off, f in enumerate(["w_mm", "d_mm", "h_mm"]):
            v = to_int(cell(r, dim + off))
            if v == "bad":
                warnings.append(f"row {n} {code}: {f} '{cell(r, dim + off)}' is not a number; left unchanged")
            else:
                rec[f] = None if v == "empty" else v
        for f, (kind, i) in optional.items():
            v = (to_int if kind == "int" else to_num)(cell(r, i))
            if v == "bad":
                warnings.append(f"row {n} {code}: {f} '{cell(r, i)}' is not a number; left unchanged")
            else:
                rec[f] = None if v == "empty" else v
        out.append(rec)
    info = {"optional_columns_found": sorted(optional), "optional_columns_not_found": missing_optional,
            "skipped": skipped, "warnings": warnings}
    return out, info


def rpc(rows, dry):
    url, key = os.environ["SUPABASE_URL"].rstrip("/"), os.environ["SUPABASE_SECRET_KEY"]
    body = json.dumps({"p_rows": rows, "p_dry": dry, "p_source": "cloud-run:tracker_sync"}).encode()
    req = urllib.request.Request(url + "/rest/v1/rpc/ts_sync_products", body,
                                 {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"})
    try:
        return json.load(urllib.request.urlopen(req, timeout=120))
    except urllib.error.HTTPError as e:
        raise SystemExit(f"database refused the sync: {e.code} {e.read().decode()[:300]}")


def show(res, info):
    print(f"rows sent {res['rows_read']} | added {len(res['added'])} | changed {len(res['changed'])} | "
          f"missing in tracker {len(res['missing_in_tracker'])} | skipped by database {len(res['skipped'])} | dry_run={res['dry_run']}")
    for a in res["added"]:
        print("  + ", a["code"], a.get("name"))
    for c in res["changed"]:
        print("  ~ ", c["code"], {k: [v["old"], v["new"]] for k, v in c["changes"].items()})
    for m in res["missing_in_tracker"]:
        print("  ? in database, not in tracker (not deleted):", m)
    for s in info["skipped"] + res["skipped"]:
        print("  ! skipped:", s)
    for w in info["warnings"]:
        print("  ! warning:", w)
    if info["optional_columns_not_found"]:
        print("  . columns not in tracker yet (not synced):", ", ".join(info["optional_columns_not_found"]))


def main(argv):
    text = fetch_csv(os.environ.get("TRACKER_CSV_URL", DEFAULT_URL))
    rows, info = parse(text)
    if "--emit" in argv:
        path = argv[argv.index("--emit") + 1]
        json.dump({"rows": rows, "info": info}, open(path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
        print(f"parsed {len(rows)} rows, skipped {len(info['skipped'])}, wrote {path}")
        return 0
    res = rpc(rows, dry="--write" not in argv)
    show(res, info)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
