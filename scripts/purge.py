#!/usr/bin/env python3
"""Delete every submission and every uploaded file. For clearing test data.

    export SUPABASE_SERVICE_KEY='...'
    python3 scripts/purge.py          # shows what it would delete
    python3 scripts/purge.py --yes    # actually deletes it

This is not reversible. It lists first and requires --yes precisely because
the day will come when there are real memories in here.
"""
import json, os, sys, urllib.error, urllib.parse, urllib.request

URL, BUCKET, TABLE = ("https://fomzgjyfimjijvvkgjns.supabase.co", "party70", "party70_rsvps")

key = os.environ.get("SUPABASE_SERVICE_KEY")
if not key:
    sys.exit("SUPABASE_SERVICE_KEY is not set.")
if not isinstance(key, str):
    sys.exit("the API key is not a string")

H = {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"}


def call(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(URL + path, data=data, headers=H, method=method)
    with urllib.request.urlopen(req) as r:
        body = r.read()
    return json.loads(body) if body else None


def every_file(prefix=""):
    """The bucket is nested one folder per submission, so walk it."""
    found, offset = [], 0
    while True:
        items = call("POST", f"/storage/v1/object/list/{BUCKET}",
                     {"prefix": prefix, "limit": 100, "offset": offset,
                      "sortBy": {"column": "name", "order": "asc"}}) or []
        for it in items:
            name = f"{prefix}/{it['name']}" if prefix else it["name"]
            # a folder comes back with no id of its own
            found += every_file(name) if it.get("id") is None else [name]
        if len(items) < 100:
            return found
        offset += 100


rows = call("GET", f"/rest/v1/{TABLE}?select=id,name") or []
files = every_file()

print(f"{len(rows)} submission(s) and {len(files)} file(s):\n")
for r in rows:
    print(f"    row   {r['name']}")
for f in files:
    print(f"    file  {f}")

if "--yes" not in sys.argv:
    print("\nNothing deleted. Re-run with --yes to delete all of the above.")
    sys.exit(0)

if files:
    # the delete endpoint takes a batch of paths
    for i in range(0, len(files), 50):
        call("DELETE", f"/storage/v1/object/{BUCKET}", {"prefixes": files[i:i + 50]})
    print(f"\ndeleted {len(files)} file(s)")

if rows:
    call("DELETE", f"/rest/v1/{TABLE}?id=not.is.null")
    print(f"deleted {len(rows)} submission(s)")

left = every_file()
print(f"\n{len(left)} file(s) remaining" + ("" if not left else ": " + ", ".join(left)))
