#!/usr/bin/env python3
"""Pull every RSVP, memory, song request and uploaded file down to a local folder.

Run this whenever you want a fresh copy of what guests have sent in. It is safe
to run repeatedly — files already downloaded are skipped, so it only fetches
what is new.

    export SUPABASE_SERVICE_KEY='...'          # see below
    python3 scripts/export.py

The service key is the one that can READ the submissions; the key in the web
page deliberately cannot. Get it from the Supabase dashboard under
Project Settings -> API keys -> service_role (also labelled "secret").
Never paste it into a file in this repo.

By default everything lands in the Google Drive folder alongside the other
party material. Pass a different destination as the first argument.
"""

import csv
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

URL    = "https://fomzgjyfimjijvvkgjns.supabase.co"
BUCKET = "party70"
TABLE  = "party70_rsvps"

DEFAULT_DEST = pathlib.Path(
    "/Users/elisapenmar/Library/CloudStorage/GoogleDrive-elisa.penmar@gmail.com"
    "/My Drive/Projects/Holidays and Events/Moms 70th/submissions"
)

ATTENDING = {"yes": "Coming", "no": "Can't come", "maybe": "Not sure"}


def get(path, key, binary=False):
    req = urllib.request.Request(
        URL + path,
        headers={"apikey": key, "Authorization": "Bearer " + key},
    )
    with urllib.request.urlopen(req) as r:
        raw = r.read()
    return raw if binary else json.loads(raw)


def folder_name(subs):
    """One readable folder per person, however many times they sent something."""
    last = subs[-1]
    stem = re.sub(r"[^A-Za-z0-9 ]+", "", last["name"] or "").strip() or "unnamed"
    return f"{stem[:48]} ({last['id'][:8]})"


def main():
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not key:
        sys.exit(
            "SUPABASE_SERVICE_KEY is not set.\n"
            "Supabase dashboard -> Project Settings -> API keys -> service_role, then:\n"
            "  export SUPABASE_SERVICE_KEY='...'"
        )

    dest = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DEST
    dest.mkdir(parents=True, exist_ok=True)

    try:
        rows = get(f"/rest/v1/{TABLE}?select=*&order=created_at.asc", key)
    except urllib.error.HTTPError as e:
        sys.exit(f"Could not read submissions ({e.code}). Is the service key right?\n{e.read().decode()[:300]}")

    if not rows:
        print("No submissions yet.")
        return

    # People are told they can answer now and send photos later, so one guest
    # may appear as several rows and those must merge. But a household shares
    # one address and each person there writes their own memory, so email
    # alone would fold a whole family into one entry and misattribute their
    # words. Key on address AND name, normalised so that "Bob Smith" and
    # "bob  smith" still count as the same person coming back.
    people = {}
    for r in rows:
        who = re.sub(r"[^a-z0-9]+", " ", r["name"].lower()).strip()
        key = ((r.get("email") or "").strip().lower(), who)
        people.setdefault(key, []).append(r)

    def newest(subs):
        return subs[-1]          # rows arrive oldest first

    # --- the guest list, one line per person -----------------------------
    with open(dest / "rsvps.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["Name", "Email", "Attending", "Party size", "Photos",
                    "Documents", "Songs", "Submissions", "First heard", "Last heard"])
        for subs in people.values():
            last = newest(subs)
            w.writerow([
                last["name"], last.get("email") or "",
                ATTENDING.get(last["attending"], last["attending"]),
                last["guests"],
                sum(len(r["photo_paths"]) for r in subs),
                sum(len(r["doc_paths"]) for r in subs),
                "yes" if any(r.get("songs") for r in subs) else "",
                len(subs),
                subs[0]["created_at"][:10],
                last["created_at"][:10],
            ])

    coming = sum(newest(s)["guests"] for s in people.values()
                 if newest(s)["attending"] == "yes")

    # --- everything written, in one readable document --------------------
    with open(dest / "memories.md", "w", encoding="utf-8") as fh:
        fh.write("# Memories\n\n")
        fh.write(f"{len(people)} people, {len(rows)} submissions, "
                 f"{coming} expected on the night\n\n---\n\n")
        for subs in people.values():
            written = [r for r in subs if r.get("memory")]
            if not written:
                continue
            fh.write(f"## {newest(subs)['name']}\n\n")
            for r in written:
                if len(written) > 1:
                    fh.write(f"*sent {r['created_at'][:10]}*\n\n")
                fh.write(f"{r['memory'].strip()}\n\n")
            photos = sum(len(r["photo_paths"]) for r in subs)
            if photos:
                fh.write(f"*{photos} photo(s) in `{folder_name(subs)}/`*\n\n")
            fh.write("---\n\n")

    # --- the playlist ----------------------------------------------------
    asked = [s for s in people.values() if any(r.get("songs") for r in s)]
    if asked:
        with open(dest / "song-requests.md", "w", encoding="utf-8") as fh:
            fh.write("# Songs for the dance floor\n\n")
            fh.write(f"Asked for by {len(asked)} of {len(people)} people.\n\n")
            for subs in asked:
                fh.write(f"**{newest(subs)['name']}**\n\n")
                for r in subs:
                    if r.get("songs"):
                        fh.write(f"{r['songs'].strip()}\n\n")

    # --- the files, one folder per person --------------------------------
    got = skipped = failed = 0
    for subs in people.values():
        person = dest / folder_name(subs)
        for r in subs:
            files = [("photos", p) for p in r["photo_paths"]] + \
                    [("documents", p) for p in r["doc_paths"]]
            for kind, path in files:
                out = person / kind / pathlib.Path(path).name
                if out.exists():
                    skipped += 1
                    continue
                out.parent.mkdir(parents=True, exist_ok=True)
                try:
                    blob = get("/storage/v1/object/" + BUCKET + "/" +
                               urllib.parse.quote(path), key, binary=True)
                except urllib.error.HTTPError as e:
                    print(f"  ! could not fetch {path} ({e.code})")
                    failed += 1
                    continue
                out.write_bytes(blob)
                got += 1

    print(f"{len(people)} people, {len(rows)} submissions, {coming} expected")
    print(f"files: {got} downloaded, {skipped} already had, {failed} failed")
    print(f"\n{dest}")


if __name__ == "__main__":
    main()
