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
sparkle, the bloom pulse, the coloured spots. JS publishes it as the `--beat`
CSS custom property so the CSS animations stay in step. Set it to the song's
tempo and the whole room pulses on the beat.

## Placeholders

Anything in `[SQUARE BRACKETS]` in `index.html` is copy still to be written.
There is one in `js/form.js` too — the fallback address shown if a submission
fails.

## Where submissions go

Supabase project `trip-planner` (`fomzgjyfimjijvvkgjns`), sharing that project
to avoid the $10/month a third project would cost. Everything is namespaced
`party70` and cannot collide with the trip planner's own tables.

- table `public.party70_rsvps` — one row per guest
- bucket `party70` — private, 25 MB a file, photos and documents

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
      rsvps.csv        the guest list and head count
      memories.md      every memory and message, in one readable document
      <Name>/photos/   their photographs
      <Name>/documents/

Safe to re-run; it skips files already downloaded. No dependencies to install.

## Local preview

    python3 -m http.server 8777

then open <http://localhost:8777>.

## Source material

Assets live in Google Drive under `Projects/Holidays and Events/Moms 70th`.
The repo is kept outside Drive because Drive's sync engine corrupts `.git`.
