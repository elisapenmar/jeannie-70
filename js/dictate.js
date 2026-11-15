/* ============================================================
   dictate.js — speak the letter instead of typing it

   Uses the browser's own speech recognition, the same engine behind the
   microphone key on a phone keyboard. Where it isn't available the button
   removes itself and points at that keyboard key, which works everywhere.
   ============================================================ */
(function () {
  'use strict';

  var box = document.querySelector('textarea[name="memory"]');
  var btn = document.getElementById('dictate');
  var note = document.getElementById('dictateNote');
  if (!box || !btn) return;

  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    /* Firefox and some others. Say the useful thing instead of nothing: every
       phone keyboard has a microphone key that does the same job. */
    btn.remove();
    if (note) {
      note.textContent = 'On a phone you can tap the microphone on your ' +
                         'keyboard and talk instead of typing.';
      note.hidden = false;
    }
    return;
  }

  var MIC =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';
  var STOP =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

  var rec = new Recognition();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = document.documentElement.lang || 'en-US';

  var listening = false;
  var settled   = '';      /* what the textarea held before this run       */
  var committed = '';      /* finalised speech from this run               */
  var restarts  = 0;       /* consecutive auto-restarts with nothing heard */

  function paint() {
    btn.innerHTML = (listening ? STOP : MIC) +
      '<span>' + (listening ? 'Stop' : 'Speak it') + '</span>';
    btn.setAttribute('aria-pressed', listening ? 'true' : 'false');
    btn.classList.toggle('listening', listening);
    if (note) {
      note.hidden = !listening;
      if (listening) note.textContent = 'Listening. Just talk, and stop when you’re done.';
    }
  }

  rec.onresult = function (e) {
    restarts = 0;          /* it is hearing us, so the restart budget resets */
    var interim = '';
    for (var i = e.resultIndex; i < e.results.length; i++) {
      var chunk = e.results[i][0].transcript;
      if (e.results[i].isFinal) committed += chunk + ' ';
      else interim += chunk;
    }
    /* Rebuilt from the pieces each time rather than appended, so a revised
       interim result replaces itself instead of stuttering into the box. */
    box.value = (settled + committed + interim).replace(/\s+/g, ' ').trimStart();
  };

  rec.onerror = function (e) {
    listening = false;
    paint();
    if (note && e && e.error !== 'aborted') {
      note.hidden = false;
      note.textContent = e.error === 'not-allowed'
        ? 'Your browser blocked the microphone. Allow it, or type instead.'
        : 'The microphone stopped. You can tap it again, or type instead.';
    }
  };

  rec.onend = function () {
    /* Browsers stop on their own after a pause, so a long silence while
       somebody thinks should not end the recording. But if it ends again and
       again having heard nothing, something is wrong (a blocked or missing
       microphone) and restarting forever would hammer the device. Give up
       after a few and say so. */
    if (listening && restarts < 3) {
      restarts++;
      try { rec.start(); return; } catch (e) { /* fall through to stopped */ }
    }
    var gaveUp = listening && restarts >= 3;
    listening = false;
    paint();
    if (gaveUp && note) {
      note.hidden = false;
      note.textContent = 'The microphone didn\u2019t pick anything up. ' +
                         'Check it is allowed, or type instead.';
    }
  };

  btn.addEventListener('click', function () {
    if (listening) {
      listening = false;         /* set first, so onend does not restart it */
      try { rec.stop(); } catch (e) {}
      paint();
      return;
    }
    settled = box.value ? box.value.replace(/\s*$/, ' ') : '';
    committed = '';
    try {
      rec.start();
      listening = true;
      paint();
    } catch (e) {
      /* already running, or blocked */
    }
  });

  paint();
})();
