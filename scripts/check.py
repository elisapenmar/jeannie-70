#!/usr/bin/env python3
"""Diagnose the export in isolation: can the key read the table, and can it
fetch one file? Prints exactly what the server said.

    export SUPABASE_SERVICE_KEY='...'
    python3 scripts/check.py
"""
import json, os, sys, urllib.error, urllib.parse, urllib.request

URL, BUCKET, TABLE = ("https://fomzgjyfimjijvvkgjns.supabase.co", "party70", "party70_rsvps")

key = os.environ.get("SUPABASE_SERVICE_KEY")
if not key:
    sys.exit("SUPABASE_SERVICE_KEY is not set.")

shape = ("JWT service_role" if key.startswith("eyJ")
         else "sb_secret_..."  if key.startswith("sb_secret")
         else "sb_publishable_... (WRONG - this one cannot read)" if key.startswith("sb_publishable")
         else "unrecognised")
print(f"key looks like: {shape}  (len {len(key)})\n")

def call(path, label):
    req = urllib.request.Request(URL + path,
                                 headers={"apikey": key, "Authorization": "Bearer " + key})
    try:
        with urllib.request.urlopen(req) as r:
            body = r.read()
            print(f"{label}: {r.status} {r.reason}, {len(body)} bytes"
                  f"{'  <- ' + body[:120].decode(errors='replace') if len(body) < 400 else ''}")
            return body
    except urllib.error.HTTPError as e:
        print(f"{label}: HTTP {e.code} {e.reason}\n    {e.read()[:400].decode(errors='replace')}")
    except Exception as e:
        print(f"{label}: {type(e).__name__}: {e}")
    return None

rows = call(f"/rest/v1/{TABLE}?select=id,name,photo_paths,doc_paths&order=created_at", "1. read the table  ")
if not rows:
    sys.exit("\nThe table read failed, so the key is the problem. Use the service_role key.")

rows = json.loads(rows)
targets = [p for r in rows for p in (r["photo_paths"] + r["doc_paths"])]
print(f"\n   {len(rows)} rows, {len(targets)} files referenced")
if not targets:
    sys.exit("\nNo files referenced yet - submit one with a photo, then run this again.")

for p in targets[:3]:
    call("/storage/v1/object/" + urllib.parse.quote(f"{BUCKET}/{p}"), f"2. fetch a file    ")
    print(f"       {p}")
