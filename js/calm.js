/* ============================================================
   calm.js — a quieter way to read the invitation

   Larger type, and nothing that moves or flashes. The class itself is set by
   a small script in the head, before anything paints; this file only builds
   the control and remembers the choice.
   ============================================================ */
(function () {
  'use strict';

  var KEY  = 'party70-calm';
  var root = document.documentElement;

  function on() { return root.classList.contains('calm'); }

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'calmswitch';

  var EYE =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c-5 0-8.5 4.2-9.6 5.7a2 2 0 0 0 0 2.6C3.5 14.8 7 19 12 19s8.5-4.2 9.6-5.7a2 2 0 0 0 0-2.6C20.5 9.2 17 5 12 5zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/></svg>';

  function paint() {
    var calm = on();
    btn.innerHTML = EYE + '<span class="label">' +
      (calm ? 'Full disco' : 'Easier to read') + '</span>';
    btn.setAttribute('aria-pressed', calm ? 'true' : 'false');
    btn.setAttribute('aria-label', calm
      ? 'Switch back to the full animated invitation'
      : 'Switch to larger text with no flashing lights or movement');
    btn.classList.toggle('is-calm', calm);
  }

  btn.addEventListener('click', function () {
    var calm = !on();
    root.classList.toggle('calm', calm);
    try { localStorage.setItem(KEY, calm ? '1' : '0'); } catch (e) { /* private mode */ }
    paint();
    /* the mirror ball is drawn in canvas and cannot be reached by CSS */
    window.dispatchEvent(new CustomEvent('party70:calm', { detail: { calm: calm } }));
  });

  paint();
  document.body.insertBefore(btn, document.body.firstChild);
})();
