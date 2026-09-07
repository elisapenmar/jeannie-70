/* ============================================================
   form.js — file pickers and previews.
   NOTE: submission is not wired to a backend yet.
   ============================================================ */
(function () {
  'use strict';

  var photos = document.getElementById('photos');
  var thumbs = document.getElementById('thumbs');
  var docs   = document.getElementById('docs');
  var list   = document.getElementById('filelist');
  var form   = document.getElementById('rsvpForm');
  if (!form) return;

  var pickedPhotos = [];
  var pickedDocs   = [];

  function kb(n) {
    return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  }

  function renderThumbs() {
    thumbs.innerHTML = '';
    pickedPhotos.forEach(function (file, i) {
      var fig = document.createElement('figure');
      var img = document.createElement('img');
      img.alt = file.name;
      img.src = URL.createObjectURL(file);
      img.onload = function () { URL.revokeObjectURL(img.src); };
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
    list.innerHTML = '';
    pickedDocs.forEach(function (file, i) {
      var row = document.createElement('div');
      var label = document.createElement('span');
      label.textContent = file.name + ' · ' + kb(file.size);
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.setAttribute('aria-label', 'Remove ' + file.name);
      rm.textContent = '×';
      rm.onclick = function () { pickedDocs.splice(i, 1); renderDocs(); };
      row.appendChild(label); row.appendChild(rm);
      list.appendChild(row);
    });
  }

  photos.addEventListener('change', function () {
    pickedPhotos = pickedPhotos.concat(Array.prototype.slice.call(photos.files));
    photos.value = '';
    renderThumbs();
  });

  docs.addEventListener('change', function () {
    pickedDocs = pickedDocs.concat(Array.prototype.slice.call(docs.files));
    docs.value = '';
    renderDocs();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    document.getElementById('formNote').textContent =
      'Not connected yet — ' + pickedPhotos.length + ' photo(s), ' +
      pickedDocs.length + ' document(s) would be sent.';
  });
})();
