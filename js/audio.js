/* ============================================================
   audio.js — the song, across all three pages
   ============================================================ */
(function () {
  'use strict';

  var SRC = 'audio/party.mp3';
  var KEY = 'party70-audio';

  var btn = document.getElementById('music');
  if (!btn) return;

  /* What the visitor wants, and where they had got to. Carried between pages
     in sessionStorage: the invitation is three pages now, and a song that
     restarted from the top on every navigation would be worse than none. */
  var want = { playing: true, t: 0 };
  try {
    var saved = sessionStorage.getItem(KEY);
    if (saved) want = JSON.parse(saved);
  } catch (e) { /* private browsing: fall back to the defaults */ }

  function remember() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({
        playing: want.playing,
        t: audio.currentTime || 0
      }));
      /* eslint-disable-line no-empty */
    } catch (e) { /* nothing we can do, and nothing worth breaking over */ }
  }

  var audio = new Audio(SRC);
  audio.preload = 'auto';

  /* No song in the repo, or it failed to load: say nothing, show nothing.
     A dead control is worse than no control. */
  audio.addEventListener('error', function () { btn.remove(); });

  audio.addEventListener('loadedmetadata', function () {
    btn.hidden = false;
    if (want.t > 0 && want.t < audio.duration - 1) {
      try { audio.currentTime = want.t; } catch (e) {}
    }
    if (want.playing) attempt();
  });

  function icon(playing) {
    return playing
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>';
  }

  function paint(playing, nudge) {
    btn.innerHTML = icon(playing) + (nudge ? '<span class="label">Play the music</span>' : '');
    btn.setAttribute('aria-label', playing ? 'Pause the music' : 'Play the music');
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    btn.classList.toggle('playing', playing);
  }
  paint(false, false);

  /* Every browser blocks sound that starts on its own before the visitor has
     touched anything, and it is right to. So: ask politely, and if refused,
     wait for the first tap or key anywhere on the page and start then. From
     the second page onwards the gesture has usually already happened, so the
     song simply carries on. */
  var armed = false;

  function arm() {
    if (armed) return;
    armed = true;
    paint(false, true);                     /* show the words, they must tap */
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, first, { once: true, passive: true });
    });
  }

  function first() {
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      document.removeEventListener(ev, first);
    });
    armed = false;
    if (want.playing) attempt();
  }

  function attempt() {
    var p = audio.play();
    if (!p || !p.then) { paint(true, false); return; }
    p.then(function () {
      armed = false;
      paint(true, false);
      remember();
    }).catch(arm);
  }

  btn.addEventListener('click', function () {
    if (audio.paused) {
      want.playing = true;
      attempt();
    } else {
      audio.pause();
      want.playing = false;
      paint(false, false);
    }
    remember();
  });

  /* Plays through once and stops: nobody writing a long memory should get the
     track starting over on top of them. */
  audio.addEventListener('ended', function () {
    want.playing = false;
    want.t = 0;
    paint(false, false);
    remember();
  });

  audio.addEventListener('timeupdate', function () {
    if (!audio.paused) remember();
  });

  /* Deliberately no pausing when the tab is backgrounded. Browsers already
     handle that themselves, and doing it here meant a screen-lock or an
     app-switch could persist "paused" into sessionStorage and suppress the
     song on every page afterwards. Only a deliberate tap on the button means
     "don't play". */

  window.addEventListener('pagehide', remember);
})();
