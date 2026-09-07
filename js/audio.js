/* ============================================================
   audio.js — play/pause for the song
   ============================================================ */
(function () {
  'use strict';

  var SRC = 'audio/party.mp3';

  var btn = document.getElementById('music');
  if (!btn) return;

  var audio = new Audio(SRC);
  audio.preload = 'metadata';

  /* No song in the repo yet, or it failed to load: say nothing, show nothing.
     A dead control is worse than no control. */
  audio.addEventListener('error', function () { btn.remove(); });

  /* It only counts as available once the browser has actually reached it. */
  audio.addEventListener('loadedmetadata', function () { btn.hidden = false; });

  function icon(playing) {
    return playing
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>';
  }

  function paint(playing, firstRun) {
    btn.innerHTML = icon(playing) +
      (firstRun ? '<span class="label">Play the music</span>' : '');
    btn.setAttribute('aria-label', playing ? 'Pause the music' : 'Play the music');
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    btn.classList.toggle('playing', playing);
  }

  var everPlayed = false;
  paint(false, true);

  btn.addEventListener('click', function () {
    if (audio.paused) {
      audio.play().then(function () {
        everPlayed = true;
        paint(true, false);
      }).catch(function () {
        /* blocked or unplayable: leave the control honest rather than lying
           about a state the browser never entered */
        paint(false, !everPlayed);
      });
    } else {
      audio.pause();
      paint(false, false);
    }
  });

  /* Deliberately not looping: it plays through once and resets, so nobody
     writing a long memory gets the track starting over on top of them. */
  audio.addEventListener('ended', function () { paint(false, false); });

  /* Don't sing on into a backgrounded tab. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && !audio.paused) { audio.pause(); paint(false, false); }
  });
})();
