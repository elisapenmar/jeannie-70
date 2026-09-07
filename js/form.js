/* ============================================================
   form.js — drives both forms: rsvp.html and memories.html

   They share a name, an address, an insert and an error path, so they share
   this file. Everything below is written to cope with a field simply not
   being on the page.
   ============================================================ */
(function () {
  'use strict';

  var CFG  = window.PARTY70;
  var form = document.getElementById('partyForm');
  if (!form) return;

  var KIND   = form.dataset.kind;               /* 'rsvp' | 'memory' */
  var note   = document.getElementById('formNote');
  var button = form.querySelector('button[type=submit]');
  var SEND   = button.textContent;

  var photos = document.getElementById('photos');
  var thumbs = document.getElementById('thumbs');
  var docs   = document.getElementById('docs');
  var list   = document.getElementById('filelist');

  var pickedPhotos = [];
  var pickedDocs   = [];
  var busy = false;

  function say(msg, kind) {
    note.textContent = msg;
    note.className = 'note' + (kind ? ' ' + kind : '');
  }

  /* ---------------------------------------------------------
     Answer-dependent bits, RSVP page only
     --------------------------------------------------------- */
  var awayNote   = document.getElementById('awayNote');
  var comingOnly = document.getElementById('comingOnly');
  var phoneField = document.getElementById('phoneField');
  var emailField = document.getElementById('emailField');

  function need(field, on) {
    if (!field) return;
    var input = field.querySelector('input');
    if (!input) return;
    /* A required field that is hidden blocks submission with a validation
       message nobody can see, so the flag has to come off with the field. */
    if (on) input.setAttribute('required', '');
    else    input.removeAttribute('required');
  }

  function radios(name) {
    return [].slice.call(form.querySelectorAll('input[name=' + name + ']'));
  }

  function showContact() {
    var how = (form.elements.reminder || {}).value || '';
    if (phoneField) { phoneField.hidden = how !== 'text';  need(phoneField, how === 'text'); }
    if (emailField) { emailField.hidden = how !== 'email'; need(emailField, how === 'email'); }
  }

  function answered() {
    var a = (form.elements.attending || {}).value || '';
    var coming = a === 'yes';

    if (awayNote) awayNote.hidden = a !== 'no';

    /* Nothing below is worth asking of someone who has just said they cannot
       come: not a head count, and certainly not how to remind them about an
       evening they will not be at. */
    if (comingOnly) {
      comingOnly.hidden = !coming;
      radios('reminder').forEach(function (r) {
        if (coming) r.setAttribute('required', '');
        else { r.removeAttribute('required'); r.checked = false; }
      });
      if (!coming) {
        if (phoneField) { phoneField.hidden = true; need(phoneField, false); }
        if (emailField) { emailField.hidden = true; need(emailField, false); }
      } else {
        showContact();
      }
    }
  }

  radios('attending').forEach(function (r) { r.addEventListener('change', answered); });
  radios('reminder').forEach(function (r) { r.addEventListener('change', showContact); });
  if (comingOnly) answered();

  /* ---------------------------------------------------------
     Picked files, memories page only
     --------------------------------------------------------- */
  function size(n) {
    return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB'
                       : Math.max(1, Math.round(n / 1024)) + ' KB';
  }

  function renderThumbs() {
    if (!thumbs) return;
    thumbs.innerHTML = '';
    pickedPhotos.forEach(function (file, i) {
      var fig = document.createElement('figure');
      var img = document.createElement('img');
      img.alt = file.name;
      img.src = URL.createObjectURL(file);
      img.onload  = function () { URL.revokeObjectURL(img.src); };
      /* HEIC frequently cannot be decoded for display even where it uploads */
      img.onerror = function () { fig.classList.add('no-preview'); img.remove(); };
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.setAttribute('aria-label', 'Remove ' + file.name);
      rm.textContent = '×';
      rm.onclick = function () { pickedPhotos.splice(i, 1); renderThumbs(); };
      fig.appendChild(img); fig.appendChild(rm);
      thumbs.appendChild(fig);
    });
  }

  function renderDocs() {
    if (!list) return;
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
      row.appendChild(label); row.appendChild(rm);
      list.appendChild(row);
    });
  }

  if (photos) photos.addEventListener('change', function () {
    pickedPhotos = pickedPhotos.concat([].slice.call(photos.files));
    photos.value = '';
    renderThumbs();
  });

  if (docs) docs.addEventListener('change', function () {
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
        return resolve(file);            /* cannot decode it here: send as-is */
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
           overwriting is exactly what we don't want. Every submission has its
           own UUID folder, so a collision would mean replacing someone else's
           photograph. */
      },
      body: body
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) {
        throw new Error('Upload failed (' + r.status + '): ' + t);
      });
      return path;
    });
  }

  /* ---------------------------------------------------------
     Thank you, and the ways back in
     --------------------------------------------------------- */
  function reopen(samePerson) {
    form.hidden = false;
    if (form.memory) form.memory.value = '';
    if (form.songs)  form.songs.value  = '';
    pickedPhotos = []; pickedDocs = [];
    renderThumbs(); renderDocs();

    /* A different person in the same house keeps the household's address, but
       must not inherit the last one's name, or their memory ends up filed
       under somebody else. */
    if (!samePerson) form.name.value = '';

    busy = false;
    button.disabled = false;
    button.textContent = SEND;
    say('');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    ((samePerson && form.memory) ? form.memory : form.name).focus({ preventScroll: true });
  }

  function thankThem() {
    var panel = document.createElement('div');
    panel.className = 'thanks';

    if (KIND === 'rsvp') {
      panel.innerHTML =
        '<p class="big">Got it. Thank you.</p>' +
        '<p>While you&rsquo;re here: we&rsquo;re quietly gathering memories, ' +
        'photographs and songs to bind into a book for her birthday. ' +
        'It would not be the same without yours.</p>';
      var go = document.createElement('a');
      go.className = 'cta';
      go.href = 'memories.html';
      go.textContent = 'Share a memory';
      panel.appendChild(go);

      var later = document.createElement('p');
      later.className = 'note';
      later.textContent = 'Or come back to it any time before December 19.';
      panel.appendChild(later);
    } else {
      panel.innerHTML =
        '<p class="big">Got it. Thank you.</p>' +
        '<p>That is safely in the pile now, and it will reach her.</p>' +
        '<p>Still hunting for a photograph, or is someone else in the house ' +
        'writing their own? Come back to this page any time before ' +
        '<strong>Saturday, December 19</strong>.</p>';

      var rsvp = document.createElement('p');
      rsvp.className = 'note';
      rsvp.innerHTML = 'Not yet said whether you can come? ' +
                       '<a href="rsvp.html">Answer the invitation</a>.';
      panel.appendChild(rsvp);

      [['Send something else', true], ['Add someone else’s memory', false]]
        .forEach(function (pair) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'cta again';
          b.textContent = pair[0];
          b.addEventListener('click', function () { panel.remove(); reopen(pair[1]); });
          panel.appendChild(b);
        });
    }

    form.hidden = true;
    form.parentNode.insertBefore(panel, form.nextSibling);
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------------------------------------------------------
     Submit
     --------------------------------------------------------- */
  function value(name) {
    var el = form.elements[name];
    if (!el) return null;
    var v = (el.value || '').trim();
    return v || null;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    if (!form.checkValidity()) { form.reportValidity(); return; }

    /* An empty memory form is a mis-tap, not a submission. */
    if (KIND === 'memory' && !value('memory') && !value('songs') &&
        !pickedPhotos.length && !pickedDocs.length) {
      say('Add a memory, a photograph or a song first, then send.', 'error');
      return;
    }

    busy = true;
    button.disabled = true;
    button.textContent = 'Sending…';

    var id = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : String(Date.now()) + '-' + Math.random().toString(16).slice(2);

    var photoPaths = [], docPaths = [];
    var total = pickedPhotos.length + pickedDocs.length, done = 0;

    function progress() {
      say(total ? 'Uploading ' + done + ' of ' + total + ' file' +
                  (total === 1 ? '' : 's') + '…'
                : 'Sending…');
    }
    progress();

    /* One at a time: kinder to a phone on a weak signal, and it gives an
       honest running count instead of a spinner that means nothing. */
    var chain = Promise.resolve();

    pickedPhotos.forEach(function (file, i) {
      chain = chain.then(function () {
        return shrink(file).then(function (blob) {
          var base = safeName(file.name);
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
      var row = {
        id:          id,
        name:        value('name'),
        email:       value('email'),
        memory:      value('memory'),
        songs:       value('songs'),
        photo_paths: photoPaths,
        doc_paths:   docPaths
      };
      /* Only the RSVP form knows about attendance. A memory arriving from
         someone who has not answered yet must not overwrite that with a
         guess, so those columns simply stay null. */
      if (KIND === 'rsvp') {
        row.attending = value('attending');
        var coming    = row.attending === 'yes';
        row.guests    = coming ? (parseInt(value('guests'), 10) || 1) : null;
        row.reminder_via = coming ? value('reminder') : null;
        /* Send only the detail matching what they chose, so switching the
           radio back and forth cannot leave a stale number or address behind. */
        row.phone = row.reminder_via === 'text'  ? value('phone') : null;
        row.email = row.reminder_via === 'email' ? value('email') : null;
      }

      return fetch(CFG.url + '/rest/v1/' + CFG.table, {
        method: 'POST',
        headers: {
          'apikey':        CFG.key,
          'Authorization': 'Bearer ' + CFG.key,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal'
        },
        body: JSON.stringify(row)
      });
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) {
        throw new Error('Save failed (' + r.status + '): ' + t);
      });
      thankThem();
    }).catch(function (err) {
      busy = false;
      button.disabled = false;
      button.textContent = SEND;
      say('That didn’t go through. ' + err.message +
          ' Please try again, or text it to Elisa on (818) 648-8023.', 'error');
    });
  });

  say('');
})();
