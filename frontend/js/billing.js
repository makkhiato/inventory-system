/* Carl's Angels Inventory Management — Site page: Billing Support
   Prototype only: figures are hardcoded in the HTML and nothing is saved. */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var sections = document.querySelectorAll('.bill-table tbody');

  function setOpen(tbody, open) {
    tbody.querySelectorAll('.bill-item').forEach(function (row) { row.hidden = !open; });
    var button = tbody.querySelector('button');
    button.setAttribute('aria-expanded', String(open));
    button.querySelector('.bill-toggle').textContent = open ? '−' : '+';
  }

  sections.forEach(function (tbody) {
    var button = tbody.querySelector('button');
    button.addEventListener('click', function () {
      setOpen(tbody, button.getAttribute('aria-expanded') !== 'true');
    });
  });

  // Simulates recording the bill: the 10% not billed moves into retention.
  $('bill-record').addEventListener('click', function () {
    $('bill-retention').textContent = '₱220,623';
    $('bill-ready').textContent = '₱0';
    $('bill-status').textContent = 'All unbilled work has been recorded.';
    this.disabled = true;
  });

  // The browser's print dialog provides "Save as PDF".
  // Every section is expanded first so no items are left out.
  window.addEventListener('beforeprint', function () {
    sections.forEach(function (tbody) { setOpen(tbody, true); });
  });
  $('bill-export').addEventListener('click', function () { window.print(); });
})();
