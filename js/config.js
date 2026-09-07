/* Supabase connection for the RSVP form.

   This key is a PUBLISHABLE key and is meant to be visible in the page.
   It is safe here because of the row-level security set up in the
   party70_rsvp_and_memory_collection migration: anonymous callers may only
   INSERT a row and upload into the party70 bucket. They cannot read, edit or
   delete anything — not their own submission, and not anyone else's.

   The service_role key is what bypasses that. It must never appear in this
   repo; scripts/export.py reads it from the environment instead. */
window.PARTY70 = {
  url:    'https://fomzgjyfimjijvvkgjns.supabase.co',
  key:    'sb_publishable_kY7cRkbT9TZoCuzkHc9zlw_NZk4Vxsy',
  bucket: 'party70',
  table:  'party70_rsvps',

  /* Phone photos run 3-5 MB each. Long edge 2400px at ~85% quality still
     prints sharp at 8 inches, and keeps a hundred-photo book well inside
     the storage that comes with the plan. */
  maxEdge: 2400,
  quality: 0.85
};
