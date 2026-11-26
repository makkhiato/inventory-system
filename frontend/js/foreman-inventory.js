/* ==========================================================================
   Carl's Angels Inventory Management — Foreman Inventory
   Adds the pieces specific to the foreman page on top of inventory.js:
     - Location Status card: "Full" when the storage location's capacity
       used (data.locationCapacityUsed, a percentage) reaches 100, else
       "Not Full".
     - "Request" button on each row: opens a small dialog for the quantity
       needed and a note. Prototype only: nothing is sent or saved; the
       button just changes to "Requested". Hook the submit handler up to
       the Material Requests API later.
   ========================================================================== */
(function () {
  'use strict';

  var data = window.CAI_INVENTORY;
  if (!data) return;

  // ---- location status ----
  var pill = document.getElementById('inv-location-status');
  if (pill) {
    var full = (data.locationCapacityUsed || 0) >= 100;
    pill.textContent = full ? 'Full' : 'Not Full';
    pill.classList.toggle('inv-stat__pill--full', full);
  }

  // ---- request dialog ----
  var dialog = document.getElementById('inv-request-dialog');
  var form = document.getElementById('inv-request-form');
  var title = document.getElementById('inv-request-title');
  var qty = document.getElementById('inv-request-qty');
  var unit = document.getElementById('inv-request-unit');
  var current = null;   // the row button that opened the dialog

  document.getElementById('inv-rows').addEventListener('click', function (e) {
    var btn = e.target.closest('.inv-request-btn');
    if (!btn || btn.disabled) return;
    var item = data.items.filter(function (i) { return i.material === btn.getAttribute('data-material'); })[0];
    if (!item) return;
    current = btn;
    title.textContent = 'Request ' + item.material;
    unit.textContent = item.unit;
    form.reset();
    dialog.showModal();
    qty.focus();
  });

  document.getElementById('inv-request-cancel').addEventListener('click', function () { dialog.close(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (current) {
      current.textContent = 'Requested';
      current.disabled = true;
    }
    dialog.close();
  });
})();
