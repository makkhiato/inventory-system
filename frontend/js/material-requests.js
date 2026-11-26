/* Carl's Angels Inventory Management — Material Requests
   Data comes from window.CAI_REQUESTS. Prototype only: nothing is saved. */
(function () {
  'use strict';

  var requests = window.CAI_REQUESTS;
  var tbody = document.getElementById('mr-rows');
  if (!requests || !tbody) return;

  var BADGE = { Pending: 'neutral', Approved: 'positive', Rejected: 'negative' };
  var current = null;   // the request open in the dialog

  function $(id) { return document.getElementById(id); }

  function el(tag, text, className) {
    var node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function row(values) {
    var tr = el('tr');
    values.forEach(function (v) {
      var td = el('td');
      if (typeof v === 'object') td.appendChild(v);
      else td.textContent = v;
      tr.appendChild(td);
    });
    return tr;
  }

  function badge(status) { return el('span', status, 'cai-badge cai-badge--' + BADGE[status]); }

  function render() {
    tbody.textContent = '';
    requests.forEach(function (r) {
      var view = el('button', 'View request', 'cai-btn cai-btn--outline');
      view.type = 'button';
      view.setAttribute('aria-label', 'View ' + r.id);
      view.addEventListener('click', function () { open(r); });

      tbody.appendChild(row([r.id, r.site, r.date, view]));
    });
  }

  function showStatus(r) {
    var status = $('mr-dialog-status');
    status.textContent = r.status;
    status.className = 'cai-badge cai-badge--' + BADGE[r.status];
    // Only pending requests can still be decided.
    $('mr-actions').hidden = r.status !== 'Pending';
  }

  function open(r) {
    current = r;
    $('mr-dialog-title').textContent = r.id;

    var details = $('mr-details');
    details.textContent = '';
    [['Site', r.site], ['Requested by', r.by], ['Date & Time', r.date], ['Needed by', r.needed], ['Priority', r.priority]]
      .forEach(function (pair) {
        var box = el('div');
        box.appendChild(el('dt', pair[0]));
        box.appendChild(el('dd', pair[1]));
        details.appendChild(box);
      });

    $('mr-items').textContent = '';
    r.items.forEach(function (i) { $('mr-items').appendChild(row([i[0], i[1].toLocaleString('en-US'), i[2]])); });
    $('mr-purpose').textContent = r.purpose;
    showStatus(r);
    $('mr-dialog').showModal();
  }

  $('mr-close').addEventListener('click', function () { $('mr-dialog').close(); });

  $('mr-actions').querySelectorAll('button').forEach(function (button) {
    button.addEventListener('click', function () {
      current.status = button.getAttribute('data-decision');
      showStatus(current);
      render();
      $('mr-close').focus();
    });
  });

  render();
})();
