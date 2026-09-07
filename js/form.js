/* ============================================================
   form.js — RSVP, memories, and uploads to Supabase storage
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.PARTY70;

  var form   = document.getElementById('rsvpForm');
  var photos = document.getElementById('photos');
  var thumbs = document.getElementById('thumbs');
  var docs   = document.getElementById('docs');
  var list   = document.getElementById('filelist');
  var note   = document.getElementById('formNote');
  var button = form && form.querySelector('button[type=submit]');
  if (!form) return;

  var pickedPhotos = [];
  var pickedDocs   = [];
  var busy = false;

  /* ---------------------------------------------------------
     Picked-file lists
     --------------------------------------------------------- */
  function size(n) {
    return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB'
                       : Math.max(1, Math.round(n / 1024)) + ' KB';
  }

  function renderThumbs() {
    thumbs.innerHTML = '';
    pickedPhotos.forEach(function (file, i) {
      var fig = document.createElement('figure');
      var img = document.createElement('img');
      img.alt = file.name;
      img.src = URL.createObjectURL(file);
      img.onload = function () { URL.revokeObjectURL(img.src); };
      /* HEIC often can't be decoded for display even where it uploads fine */
      img.onerror = function () { fig.classList.add('no-preview'); img.remove(); };
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.setAttribute('aria-label', 'Remove ' + file.name);
      rm.textContent = '×';
      rm.onclick = function () { pickedPhotos.splice(i, 1); renderThumbs(); };
      fig.appendChild(img);
      fig.appendChild(rm);
      thumbs.appendChild(fig);
    });
  }

  function renderDocs() {
    list.innerHTML = '';
    pickedDocs.forEach(function (file, i) {
      var row = document.createElement('div');
      var label = document.createElement('span');
      label.textContent = file.name + ' · ' + size(file.size);
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.setAttribute('aria-label', 'Remove ' + file.name);
      rm.textContent = '×';
      rm.onclick = function () { pickedDocs.splice(i, 1); renderDocs(); };
      row.appendChild(label);
      row.appendChild(rm);
      list.appendChild(row);
    });
  }

  photos.addEventListener('change', function () {
    pickedPhotos = pickedPhotos.concat([].slice.call(photos.files));
    photos.value = '';
    renderThumbs();
  });

  docs.addEventListener('change', function () {
    pickedDocs = pickedDocs.concat([].slice.call(docs.files));
    docs.value = '';
    renderDocs();
  });

  /* ---------------------------------------------------------
     Shrink photos in the browser before they go up
     --------------------------------------------------------- */
  function shrink(file) {
    return new Promise(function (resolve) {
      if (!/^image\//.test(file.type) || /heic|heif/i.test(file.type)) {
        return resolve(file);            /* can't decode it here — send as-is */
      }
      var url = URL.createObjectURL(file);
      var img = new Image();

      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, CFG.maxEdge / Math.max(w, h));
        if (scale === 1 && file.size < 1500000) return resolve(file);

        try {
          var c = document.createElement('canvas');
          c.width  = Math.round(w * scale);
          c.height = Math.round(h * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function (blob) {
            /* keep whichever is smaller — re-encoding isn't always a win */
            resolve(blob && blob.size < file.size ? blob : file);
          }, 'image/jpeg', CFG.quality);
        } catch (e) { resolve(file); }
      };
      img.src = url;
    });
  }

  /* ---------------------------------------------------------
     Upload
     --------------------------------------------------------- */
  function safeName(name) {
    var dot = name.lastIndexOf('.');
    var stem = (dot > 0 ? name.slice(0, dot) : name).replace(/[^a-z0-9]+/gi, '-').slice(0, 48);
    var ext  = (dot > 0 ? name.slice(dot + 1) : '').replace(/[^a-z0-9]/gi, '').slice(0, 8);
    return (stem || 'file').replace(/^-|-$/g, '') + (ext ? '.' + ext.toLowerCase() : '');
  }

  function upload(path, body, type) {
    return fetch(CFG.url + '/storage/v1/object/' + CFG.bucket + '/' + path, {
      method: 'POST',
      headers: {
        'apikey':        CFG.key,
        'Authorization': 'Bearer ' + CFG.key,
        'Content-Type':  type || 'application/octet-stream'
        /* deliberately no x-upsert: upsert needs an UPDATE policy too, and
           overwriting is exactly what we don't want — every submission has
           its own UUID folder, so a collision would mean someone else's
           photo being replaced. */
      },
      body: body
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('Upload failed (' + r.status + '): ' + t); });
      return path;
    });
  }

  function say(msg, kind) {
    note.textContent = msg;
    note.className = 'note' + (kind ? ' ' + kind : '');
  }

  /* ---------------------------------------------------------
     Submit
     --------------------------------------------------------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;

    if (!form.checkValidity()) { form.reportValidity(); return; }

    busy = true;
    button.disabled = true;
    button.textContent = 'Sending…';

    var data = new FormData(form);
    var id = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : String(Date.now()) + '-' + Math.random().toString(16).slice(2);

    var photoPaths = [], docPaths = [];
    var total = pickedPhotos.length + pickedDocs.length, done = 0;

    function progress() {
      if (total) say('Uploading — ' + done + ' of ' + total + ' file' + (total === 1 ? '' : 's') + '…');
      else say('Sending…');
    }
    progress();

    /* One at a time: kinder to a phone on a weak signal, and it gives
       an honest running count instead of a spinner that means nothing. */
    var chain = Promise.resolve();

    pickedPhotos.forEach(function (file, i) {
      chain = chain.then(function () {
        return shrink(file).then(function (blob) {
          var base = safeName(file.name);
          /* re-encoded to JPEG: swap the extension, don't stack a second one on */
          if (blob !== file && blob.type === 'image/jpeg') {
            base = base.replace(/\.[a-z0-9]+$/i, '') + '.jpg';
          }
          var path = id + '/photos/' + String(i + 1).padStart(3, '0') + '-' + base;
          return upload(path, blob, blob.type || file.type).then(function (p) {
            photoPaths.push(p); done++; progress();
          });
        });
      });
    });

    pickedDocs.forEach(function (file, i) {
      chain = chain.then(function () {
        var path = id + '/documents/' + String(i + 1).padStart(3, '0') + '-' + safeName(file.name);
        return upload(path, file, file.type).then(function (p) {
          docPaths.push(p); done++; progress();
        });
      });
    });

    chain.then(function () {
      say('Almost there…');
      return fetch(CFG.url + '/rest/v1/' + CFG.table, {
        method: 'POST',
        headers: {
          'apikey':        CFG.key,
          'Authorization': 'Bearer ' + CFG.key,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal'
        },
        body: JSON.stringify({
          id:          id,
          name:        (data.get('name')  || '').trim(),
          email:       (data.get('email') || '').trim() || null,
          attending:   data.get('attending'),
          guests:      parseInt(data.get('guests'), 10) || 0,
          memory:      (data.get('memory') || '').trim() || null,
          photo_paths: photoPaths,
          doc_paths:   docPaths
        })
      });
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('Save failed (' + r.status + '): ' + t); });
      form.innerHTML =
        '<div class="thanks">' +
          '<p class="big">Got it — thank you.</p>' +
          '<p>Your memory is safely in the pile. She is going to love this.</p>' +
        '</div>';
      document.getElementById('rsvp').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function (err) {
      busy = false;
      button.disabled = false;
      button.textContent = 'Send it in';
      say('That didn’t go through — ' + err.message +
          ' Please try again, or send it straight to [YOUR EMAIL].', 'error');
    });
  });

  say('');
})();
