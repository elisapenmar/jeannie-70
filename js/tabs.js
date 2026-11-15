/* ============================================================
   tabs.js — the two things below the fold

   Built on real tab semantics rather than show/hide divs, so a screen reader
   announces "tab 1 of 2" and arrow keys move between them, which is what
   anyone navigating by keyboard will try.
   ============================================================ */
(function () {
  'use strict';

  var list = document.querySelector('.tablist');
  if (!list) return;

  var tabs = [].slice.call(list.querySelectorAll('[role="tab"]'));
  if (!tabs.length) return;

  function panelFor(tab) {
    return document.getElementById(tab.getAttribute('aria-controls'));
  }

  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      /* Only the selected tab is in the tab order: one Tab press moves past
         the whole set rather than through every tab in it. */
      if (on) t.removeAttribute('tabindex'); else t.setAttribute('tabindex', '-1');
      var p = panelFor(t);
      if (p) p.hidden = !on;
    });
    if (focus) tab.focus();

    /* Shareable without jumping the page, which changing the hash would do. */
    try {
      history.replaceState(null, '',
        location.pathname + (tab.id === 'tab-party' ? '#party' : '') + location.search);
    } catch (e) { /* file:// and the like */ }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { select(tab, false); });
  });

  list.addEventListener('keydown', function (e) {
    var i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    var next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === 'Home') next = tabs[0];
    else if (e.key === 'End')  next = tabs[tabs.length - 1];
    if (next) { e.preventDefault(); select(next, true); }
  });

  /* Deep links: #party, and #details from anything already shared. */
  var hash = (location.hash || '').toLowerCase();
  if (hash === '#party' || hash === '#details') {
    var party = document.getElementById('tab-party');
    if (party) select(party, false);
  }
})();
