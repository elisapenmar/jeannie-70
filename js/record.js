/* ============================================================
   record.js — send a voice message instead of writing one

   Records in the browser and hands the file to form.js, which uploads it with
   the photographs. Nothing is transcribed here on purpose: doing it once,
   afterwards, with a good tool beats doing it badly in fifty browsers, and the
   recording itself is worth keeping.
   ============================================================ */
(function () {
  'use strict';

  var wrap = document.getElementById('recorder');
  if (!wrap) return;

  var btn    = document.getElementById('recordBtn');
  var status = document.getElementById('recordStatus');
  var list   = document.getElementById('recordings');

  /* form.js reads this on submit. */
  window.PARTY70_AUDIO = [];

  var uploader = document.getElementById('audioFiles');

  /* Set up before the capability check. Somebody whose browser cannot record
     can still upload a voice memo, and that is exactly who needs the list and
     the registry to work. */
  if (uploader) {
    uploader.addEventListener('change', function () {
      [].slice.call(uploader.files).forEach(function (f) {
        window.PARTY70_AUDIO.push(f);
      });
      uploader.value = '';
      render();
      if (status) status.textContent = 'Added. Play it back to check it.';
    });
  }

  var canRecord = !!(navigator.mediaDevices &&
                     navigator.mediaDevices.getUserMedia &&
                     window.MediaRecorder);
  if (!canRecord) {
    /* A dead button helps nobody, but the upload beside it still works.
       The "or" has to go with it, or it reads as a missing option. */
    if (btn) btn.remove();
    var orWord = document.getElementById('duoOr');
    if (orWord) orWord.remove();
    if (status) {
      status.textContent = 'This browser can\u2019t record directly. ' +
                           'Use your phone\u2019s voice memo app and upload the file below.';
    }
    return;
  }

  var MIC  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';
  var STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

  var rec = null, chunks = [], stream = null, started = 0, ticker = null;

  function mmss(ms) {
    var s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function paint(recording) {
    btn.innerHTML = (recording ? STOP : MIC) +
      '<span>' + (recording ? 'Stop' : 'Record now') + '</span>';
    btn.classList.toggle('recording', recording);
    btn.setAttribute('aria-pressed', recording ? 'true' : 'false');
  }

  function render() {
    list.innerHTML = '';
    window.PARTY70_AUDIO.forEach(function (file, i) {
      var row = document.createElement('div');
      var audio = document.createElement('audio');
      audio.controls = true;
      audio.src = URL.createObjectURL(file);
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.setAttribute('aria-label', 'Delete this recording');
      rm.textContent = '×';
      rm.onclick = function () {
        URL.revokeObjectURL(audio.src);
        window.PARTY70_AUDIO.splice(i, 1);
        render();
      };
      row.appendChild(audio); row.appendChild(rm);
      list.appendChild(row);
    });
  }

  function release() {
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    if (ticker) { clearInterval(ticker); ticker = null; }
  }

  function stop() {
    if (rec && rec.state !== 'inactive') { try { rec.stop(); } catch (e) {} }
  }

  btn.addEventListener('click', function () {
    if (rec && rec.state === 'recording') { stop(); return; }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
      stream = s;
      chunks = [];
      /* Let the browser pick a container it actually supports: Safari gives
         mp4, Chrome webm, and forcing either breaks the other. */
      try { rec = new MediaRecorder(s); }
      catch (e) { rec = new MediaRecorder(s, { mimeType: 'audio/webm' }); }

      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };

      rec.onstop = function () {
        release();
        paint(false);
        var type = (rec && rec.mimeType) || 'audio/webm';
        var blob = new Blob(chunks, { type: type });
        if (!blob.size) { status.textContent = 'Nothing was recorded. Try again.'; return; }
        var ext = type.indexOf('mp4') > -1 ? 'm4a' : (type.indexOf('ogg') > -1 ? 'ogg' : 'webm');
        var name = 'voice-message-' + (window.PARTY70_AUDIO.length + 1) + '.' + ext;
        window.PARTY70_AUDIO.push(new File([blob], name, { type: type }));
        status.textContent = 'Saved. Play it back, and record another if you like.';
        render();
      };

      rec.start();
      started = Date.now();
      paint(true);
      status.textContent = 'Recording 0:00';
      ticker = setInterval(function () {
        status.textContent = 'Recording ' + mmss(Date.now() - started);
        /* Five minutes is already a long letter, and the bucket caps files
           at 25 MB. Stop cleanly rather than failing on upload. */
        if (Date.now() - started > 5 * 60 * 1000) stop();
      }, 500);

    }).catch(function (err) {
      paint(false);
      release();
      status.textContent = (err && err.name === 'NotAllowedError')
        ? 'Your browser blocked the microphone. Allow it, or write instead.'
        : 'Couldn’t start recording. You can write instead.';
    });
  });

  paint(false);
})();
