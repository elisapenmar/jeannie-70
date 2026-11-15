/* ============================================================
   picker.js — choosing how to write the letter

   Handwrite and Type sit side by side as a choice. Speak sits below because
   it is an addition rather than an alternative. All three can be open at once:
   somebody who handwrites a note and then reads it aloud is sending the best
   version of this, and the page should not argue with them.
   ============================================================ */
(function () {
  'use strict';

  var picks = [
    { btn: 'pick-write', panel: 'open-write', hash: 'handwrite' },
    { btn: 'pick-type',  panel: 'open-type',  hash: 'type' },
    { btn: 'pick-speak', panel: 'open-speak', hash: 'speak' }
  ];

  function open(p, on, focus) {
    var btn = document.getElementById(p.btn);
    var panel = document.getElementById(p.panel);
    if (!btn || !panel) return;
    panel.hidden = !on;
    btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    btn.classList.toggle('on', on);
    if (on && focus) {
      var first = panel.querySelector('textarea, button, label.drop');
      if (first && first.focus) first.focus();
    }
  }

  picks.forEach(function (p) {
    var btn = document.getElementById(p.btn);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var nowOn = btn.getAttribute('aria-expanded') !== 'true';
      open(p, nowOn, nowOn);
    });
  });

  /* Arriving from the invitation with a choice already made. */
  function fromHash(focus) {
    var want = (location.hash || '').replace('#', '').toLowerCase();
    var matched = false;
    picks.forEach(function (p) {
      if (p.hash === want) { open(p, true, focus); matched = true; }
    });
    return matched;
  }

  /* Nothing chosen: open Type, so the page is never a row of buttons that
     all have to be pressed before anything can be written. */
  if (!fromHash(false)) open(picks[1], true, false);

  /* Changing only the hash does not reload the page, so without this a link
     tapped while already here would silently do nothing. */
  window.addEventListener('hashchange', function () { fromHash(true); });

  /* ---------------------------------------------------------
     The copy-to-me checkbox
     --------------------------------------------------------- */
  var want_copy = document.getElementById('wantCopy');
  var wrap      = document.getElementById('emailWrap');
  if (!want_copy || !wrap) return;
  var input = wrap.querySelector('input');

  function sync() {
    wrap.hidden = !want_copy.checked;
    /* Required only while it is showing: a required field inside a hidden
       block blocks submission with a message nobody can see. */
    if (want_copy.checked) input.setAttribute('required', '');
    else { input.removeAttribute('required'); input.value = ''; }
  }
  want_copy.addEventListener('change', sync);
  sync();
})();
