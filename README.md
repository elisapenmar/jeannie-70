# Mom's 70th

Animated disco birthday invitation. Static site, no build step — open `index.html`.

    index.html         hero, details, RSVP form
    css/style.css      styling and CSS animation
    js/disco.js        mirror ball (canvas), room lights, glitter
    js/config.js       Supabase connection (publishable key — safe in public)
    js/form.js         uploads and submission
    scripts/export.py  pull submissions down for the book
    images/            mom-disco.png — transparent-background cutout

## Tempo

`BPM` at the top of `js/disco.js` drives everything that flashes — the ball's
sparkle, the bloom pulse, the colored spots. JS publishes it as the `--beat`
CSS custom property so the CSS animations stay in step. Set it to the song's
tempo and the whole room pulses on the beat.

## Placeholders

Anything in `[SQUARE BRACKETS]` in `index.html` is copy still to be written.
There is one in `js/form.js` too — the fallback address shown if a submission
fails.

## Where submissions go

Supabase project `writers-cube-v05` (`rjnfvyjghybutgrtbbeu`). Everything is
namespaced `party70` and cannot collide with that project's own tables.

This is the second home. The first was a project called `trip-planner`, which
was deleted in November 2026, taking the party's table and bucket with it: the
name gave no hint that a birthday depended on it, and nothing warned anybody.
Guests met a form that failed silently for an unknown stretch.

Two lessons are built in below. Borrowing a project named for something else
is a trap, so if this ever moves again it should go somewhere whose name says
what it holds. And an export is not a convenience, it is the only backup:
run it often, because the copy in Google Drive is the one that survives
somebody tidying up a dashboard.

- table `public.party70_rsvps` — one row per guest
- bucket `party70` — private, 25 MB a file, photos, documents and recordings

Guests can send a voice message rather than write. Nothing is transcribed in
the browser on purpose: doing it once afterwards with a good tool beats doing
it badly in fifty browsers, and the recording is worth keeping anyway. The
export files them under `<person>/audio/` and memories.md names them as
awaiting transcription, so a person who only recorded is never silently absent
from the book.

The memory is a single free-text field on purpose. A memory and what she means
to someone are the same breath for most people, and splitting them made guests
pick. The document upload sits right beside that box as the other route to the
same thing: type it here, or draft it properly and come back and upload it.

The form says plainly, and again when someone taps "can't make it", that the
memory, photographs and song are wanted whether or not they can be there.

Guests are anonymous and never sign in. The key in `js/config.js` is
publishable and deliberately public: row-level security lets anonymous callers
only INSERT a row and upload into the bucket. They cannot read back, edit or
delete anything, including their own submission. Reading requires the
service_role key, which is not in this repo.

Photos are resized in the browser to 2400px on the long edge before upload —
sharp enough to print at 8 inches, small enough that a hundred-photo book fits
comfortably in the included storage.

**Do not delete or pause the `trip-planner` Supabase project** until everything
has been exported and the book is done.

## Getting the submissions out

    export SUPABASE_SERVICE_KEY='...'     # dashboard: Project Settings -> API keys -> service_role
    python3 scripts/export.py

Writes into the Google Drive folder, next to the other party material:

    submissions/
      rsvps.csv          the guest list and head count
      memories.md        every memory, in one readable document
      song-requests.md   the playlist, with who asked for what
      <Name>/photos/     their photographs
      <Name>/documents/  written memories they uploaded instead of typing

Safe to re-run; it skips files already downloaded. No dependencies to install.

## Local preview

    python3 -m http.server 8777

then open <http://localhost:8777>.

## Source material

Assets live in Google Drive under `Projects/Holidays and Events/Moms 70th`.
The repo is kept outside Drive because Drive's sync engine corrupts `.git`.


## Backups, and keeping the project awake

`scripts/daily-export.sh` runs the export once a day through a launchd agent.
It does two jobs. It keeps a copy of every RSVP, memory and photograph in
Google Drive, which is the only real protection against losing them again. And
it touches the database daily, so a free-tier Supabase project never sits idle
the week it takes to pause itself.

Set it up once. The script asks for the service_role key and stores it in the
Keychain itself, reading it hidden so it never lands in shell history:

    ./scripts/install-daily-export.sh

### Why the agent does not live in this folder

macOS refuses background agents access to Documents, Desktop, Downloads and
CloudStorage. The first attempt sat in this repo and wrote straight to Google
Drive, and failed twice over: launchd could not execute a script inside
Documents at all, exiting 126 before it could even write a log, and once moved
it could not create a file in Drive either.

So the agent lives in `~/Library/Application Support/jeannie70/`, keeps its own
copy of `export.py` refreshed from here whenever it can read it, and writes the
backup to a folder macOS permits. It then tries to mirror that into Drive and
notes in the log when it cannot.

To put the backup in Drive automatically, grant Full Disk Access to `/bin/bash`
in System Settings, Privacy & Security. That is a broad permission, so the
local copy is the default and the mirror is a bonus. Running the export by hand
from a terminal writes to Drive regardless, because a terminal already has the
access an agent does not.

The key lives in the macOS Keychain, never in this repo. Log goes to
`~/Library/Logs/jeannie70-export.log`.

## Email on every submission

Call it `net.http_post`, not `extensions.net.http_post`. pg_net creates its
functions in a schema called `net` whatever you install the extension into,
and the wrong name raised an error the handler below swallowed, so no email
was ever attempted and nothing said so.

Failures now land in `party70_notify_errors`. Swallowing them is still right,
since a mail problem must never cost a guest their letter, but silent should
not mean invisible. To check mail is working:

    select status_code, content, created from net._http_response
    order by created desc limit 5;


Only to Elisa. Guests are told nothing about email and promised no copy:
Resend will not deliver to anyone but the account's own address until a domain
is verified, which costs money, and offering a copy that cannot arrive is
worse than offering none. The daily export covers the loss that copy guarded
against.


A trigger on `party70_rsvps` posts to Resend through `pg_net`. Configure it by
putting the key and the address in `party70_settings`, which has RLS on and no
policies, so anonymous callers cannot read it:

    insert into public.party70_settings (id, resend_key, notify_email)
    values (1, 're_...', 'you@example.com')
    on conflict (id) do update
      set resend_key = excluded.resend_key,
          notify_email = excluded.notify_email;

Until that row exists the trigger returns silently. The whole POST is wrapped
in an exception handler and pg_net is asynchronous, so a missing key, a wrong
key or a dead provider cannot turn into a failed RSVP. Both paths are tested:
a submission succeeds unconfigured, and succeeds with a deliberately invalid
key. The notification is a convenience. The submission is the point.
