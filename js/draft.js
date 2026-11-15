/* ============================================================
   draft.js — keep what they typed if they wander off

   A long letter written on a phone is one interruption away from being lost:
   a call, a low-memory tab eviction, a stray back swipe. The typed fields are
   saved locally as they write and restored on return.

   Only text. A browser will not let a page re-open a file somebody chose
   earlier, so photographs, notes and recordings still have to be picked again
   — and the page says so rather than implying otherwise.
   ============================================================ */
(function () {
  'use strict';

  var form = document.getElementById('partyForm');
  if (!form || form.getAttribute('data-kind') !== 'memory') return;

  var KEY   = 'party70-draft';
  var NAMES = ['name', 'memory', 'songs'];
  var note  = document.getElementById('draftNote');

  /* Private browsing, blocked storage, a full quota: all survivable. Losing
     the draft is a shame; breaking the form over it would be worse. */
  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function write(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); return true; }
    catch (e) { return false; }
  }
  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    if (note) note.hidden = true;
  }

  /* form.js calls this once a submission is safely stored. Clearing any
     earlier would risk throwing away the only copy. */
  window.PARTY70_DRAFT_CLEAR = clear;

  function field(n) { return form.elements[n]; }

  function say(saved) {
    if (!note) return;
    note.hidden = !saved;
    note.textContent = saved
      ? 'Saved on this device. You can close this and come back to it.'
      : '';
  }

  /* --- restore --- */
  var draft = read();
  var restored = false;
  NAMES.forEach(function (n) {
    var el = field(n);
    if (el && !el.value && draft[n]) { el.value = draft[n]; restored = true; }
  });
  if (restored) {
    say(true);
    /* Text restored into a collapsed card would be invisible, and the person
       would reasonably conclude it had been lost. */
    if (draft.memory) {
      var type = document.getElementById('pick-type');
      var panel = document.getElementById('open-type');
      if (type && panel && panel.hidden) type.click();
    }
  }

  /* --- save --- */
  var timer = null;
  function save() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var obj = {}, any = false;
      NAMES.forEach(function (n) {
        var el = field(n);
        if (el && el.value.trim()) { obj[n] = el.value; any = true; }
      });
      if (!any) { clear(); return; }
      say(write(obj));
    }, 400);
  }

  NAMES.forEach(function (n) {
    var el = field(n);
    if (el) { el.addEventListener('input', save); el.addEventListener('change', save); }
  });
})();
