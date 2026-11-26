/* ==========================================================================
   Carl's Angels Inventory Management — Foreman Inventory: Tools tab

   Data comes from window.CAI_TOOLS (see foreman_inventory-tools.html).
   Prototype only: nothing is saved or sent.

   Per-row action:
     - tool is checked out to this foreman (heldByMe)  -> "Return"
         Returning makes it Available again and the button becomes "Request".
     - tool is Available                                -> "Request"
         Requesting just changes the button to a disabled "Requested".
     - tool is In Use by someone else or Under Repair   -> no action
   ========================================================================== */
(function () {
  'use strict';

  var data = window.CAI_TOOLS;
  var tbody = document.getElementById('tools-rows');
  if (!data || !tbody) return;

  var STATUS_CLASS = { Available: 'tools-status--available', 'In Use': 'tools-status--inuse', 'Under Repair': 'tools-status--repair' };

  function el(tag, props, kids) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k === 'className') node.className = props[k];
        else if (k === 'text') node.textContent = props[k];
        else node.setAttribute(k, props[k]);
      });
    }
    (kids || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  function actionCell(item) {
    var td = el('td');
    if (item.heldByMe) {
      var ret = el('button', { type: 'button', className: 'cai-btn', text: 'Return' });
      ret.addEventListener('click', function () {
        item.heldByMe = false;
        item.requested = false;
        item.status = 'Available';
        render();
      });
      td.appendChild(ret);
    } else if (item.status === 'Available') {
      var req = el('button', { type: 'button', className: 'cai-btn', text: item.requested ? 'Requested' : 'Request' });
      req.disabled = !!item.requested;
      req.addEventListener('click', function () {
        item.requested = true;
        render();
      });
      td.appendChild(req);
    }
    return td;
  }

  function render() {
    var visible = data.items.filter(function (item) {
      return !data.fixedProject || item.project === data.fixedProject;
    });

    tbody.textContent = '';
    visible.forEach(function (item) {
      var status = el('span', { className: 'foreman-tool-status ' + (STATUS_CLASS[item.status] || ''), text: item.status });
      tbody.appendChild(el('tr', null, [
        el('td', { text: item.tool }),
        el('td', { text: item.location }),
        el('td', null, [status]),
        actionCell(item)
      ]));
    });

    if (!visible.length) {
      tbody.appendChild(el('tr', null, [
        el('td', { colspan: '4', text: 'No tools or equipment assigned to your project yet.' })
      ]));
    }
  }

  render();
})();
