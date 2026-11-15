/* ============================================================
   countdown.js — how far out we are, worked out on the day

   The link gets sent more than once, and a number typed into the page goes
   stale the moment it is. This reads the clock instead.
   ============================================================ */
(function () {
  'use strict';

  var el = document.getElementById('countdown');
  if (!el) return;

  /* Local midnight on both sides, so the answer does not change depending on
     what time of day somebody happens to open it. */
  function midnight(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  var party = midnight(new Date(2027, 0, 23));
  var days  = Math.round((party - midnight(new Date())) / 86400000);

  var text;
  if (days < 0)       { el.hidden = true; return; }
  else if (days === 0) text = 'Tonight';
  else if (days === 1) text = 'Tomorrow';
  else if (days <= 13) text = days + ' days to go';
  else                 text = Math.round(days / 7) + ' weeks to go';

  el.textContent = text;
})();
