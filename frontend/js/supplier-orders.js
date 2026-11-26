/* ==========================================================================
   Carl's Angels Inventory Management — Supplier Orders

   Data comes from window.CAI_SUPPLIER_ORDERS (see owner_supplier-orders.html).
   Prototype only: nothing is saved, everything lives in memory and resets
   on reload. Swap CAI_SUPPLIER_ORDERS for a real API response later and
   the rendering below can stay as-is.
   ========================================================================== */
(function () {
  'use strict';

  var data = window.CAI_SUPPLIER_ORDERS;
  if (!data) return;

  var BADGE = { 'Not Received': 'neutral', 'Received': 'positive', 'Delayed': 'negative' };
  var nextOrderId = data.orders.reduce(function (max, o) { return Math.max(max, o.id); }, 0) + 1;
  var currentOrder = null;     // order open in the order-details dialog
  var currentSupplier = null;  // supplier object open in the edit dialog

  function $(id) { return document.getElementById(id); }

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

  function row(values) {
    return el('tr', null, values.map(function (v) {
      return typeof v === 'object' && v !== null && v.nodeType
        ? el('td', null, [v])
        : el('td', { text: v == null ? '' : String(v) });
    }));
  }

  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  function todayStr() {
    var d = new Date();
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
  }

  /* ------------------------------------------------------------------ */
  /*  Project filter                                                      */
  /* ------------------------------------------------------------------ */

  var filterSelect = $('so-project-filter');

  function buildFilter() {
    filterSelect.textContent = '';
    filterSelect.appendChild(el('option', { value: '', text: 'All projects' }));
    data.projects.forEach(function (p) {
      filterSelect.appendChild(el('option', { value: p, text: p }));
    });
  }

  filterSelect.addEventListener('change', renderAvailable);

  /* ------------------------------------------------------------------ */
  /*  Available to Order                                                  */
  /* ------------------------------------------------------------------ */

  var atoBody = $('so-ato-rows');
  var feedback = $('so-feedback');

  function supplierSelect(item) {
    var sel = el('select', { className: 'boq-input boq-select', 'aria-label': 'Supplier for ' + item.material });
    sel.appendChild(el('option', { value: '', text: 'Select supplier' }));
    data.suppliers.forEach(function (s) {
      var opt = el('option', { value: s.name, text: s.name });
      if (s.name === item.supplier) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function () { item.supplier = sel.value; });
    return sel;
  }

  function qtyInput(item) {
    var input = el('input', {
      type: 'number', min: '0', step: '1',
      className: 'boq-input', 'aria-label': 'Quantity to order, ' + item.material
    });
    input.value = item.orderQty;
    input.addEventListener('input', function () { item.orderQty = input.value; });
    return input;
  }

  function includeCheckbox(item) {
    var box = el('input', { type: 'checkbox', 'aria-label': 'Include ' + item.material + ' in this order' });
    box.addEventListener('change', function () { item.included = box.checked; });
    return box;
  }

  function renderAvailable() {
    atoBody.textContent = '';
    var activeProject = filterSelect.value;

    data.availableToOrder.forEach(function (item) {
      if (activeProject && item.project !== activeProject) return;
      var tr = row([
        item.material,
        item.project,
        supplierSelect(item),
        fmt(item.requestedQty) + ' ' + item.unit,
        qtyInput(item),
        includeCheckbox(item)
      ]);
      atoBody.appendChild(tr);
    });

    if (!atoBody.children.length) {
      atoBody.appendChild(el('tr', null, [
        el('td', { colspan: '6', text: 'No materials awaiting order for this project.' })
      ]));
    }
  }

  function setFeedback(message, kind) {
    feedback.textContent = message;
    feedback.className = 'so-feedback' + (kind ? ' so-feedback--' + kind : '');
  }

  $('so-generate').addEventListener('click', function () {
    var selected = data.availableToOrder.filter(function (item) { return item.included; });

    if (!selected.length) {
      setFeedback('Check at least one material to generate an order.', 'error');
      return;
    }
    var missingSupplier = selected.some(function (item) { return !item.supplier; });
    if (missingSupplier) {
      setFeedback('Choose a supplier for every checked material.', 'error');
      return;
    }
    var badQty = selected.some(function (item) { return !(Number(item.orderQty) > 0); });
    if (badQty) {
      setFeedback('Quantity to order must be greater than zero.', 'error');
      return;
    }

    // Group the checked rows by supplier + project: one order per pair.
    var groups = {};
    selected.forEach(function (item) {
      var key = item.supplier + '||' + item.project;
      if (!groups[key]) groups[key] = { supplier: item.supplier, project: item.project, items: [] };
      groups[key].items.push([item.material, Number(item.orderQty), item.unit]);
    });

    Object.keys(groups).forEach(function (key) {
      var g = groups[key];
      data.orders.unshift({
        id: nextOrderId++,
        supplier: g.supplier,
        project: g.project,
        dateOrdered: todayStr(),
        dateArrived: '',
        status: 'Not Received',
        items: g.items
      });
    });

    // Reset the rows that were just ordered.
    selected.forEach(function (item) { item.included = false; });

    renderAvailable();
    renderOrders();
    setFeedback('Supplier order form generated.', 'ok');
  });

  /* ------------------------------------------------------------------ */
  /*  Order Status                                                        */
  /* ------------------------------------------------------------------ */

  var orderBody = $('so-order-rows');

  function badge(status) {
    return el('span', { text: status, className: 'cai-badge cai-badge--' + (BADGE[status] || 'default') });
  }

  function renderOrders() {
    orderBody.textContent = '';
    data.orders.forEach(function (o) {
      var view = el('button', { type: 'button', className: 'cai-btn cai-btn--outline', text: 'View details' });
      view.addEventListener('click', function () { openOrder(o); });

      orderBody.appendChild(row([
        o.id, o.supplier, o.project, o.dateOrdered, o.dateArrived, badge(o.status), view
      ]));
    });
  }

  function openOrder(o) {
    currentOrder = o;
    $('so-order-dialog-title').textContent = 'Order #' + o.id;
    var status = $('so-order-dialog-status');
    status.textContent = o.status;
    status.className = 'cai-badge cai-badge--' + (BADGE[o.status] || 'default');

    var details = $('so-order-details');
    details.textContent = '';
    [['Supplier', o.supplier], ['Project', o.project], ['Date Ordered', o.dateOrdered],
     ['Date Arrived', o.dateArrived || '—']].forEach(function (pair) {
      details.appendChild(el('div', null, [el('dt', { text: pair[0] }), el('dd', { text: pair[1] })]));
    });

    var itemsBody = $('so-order-items');
    itemsBody.textContent = '';
    o.items.forEach(function (i) { itemsBody.appendChild(row([i[0], fmt(i[1]), i[2]])); });

    $('so-order-dialog').showModal();
  }

  $('so-order-close').addEventListener('click', function () { $('so-order-dialog').close(); });

  /* ------------------------------------------------------------------ */
  /*  Supplier Directory                                                  */
  /* ------------------------------------------------------------------ */

  var supplierBody = $('so-supplier-rows');
  var supplierDialog = $('so-supplier-dialog');
  var supplierForm = $('so-supplier-form');

  function renderSuppliers() {
    supplierBody.textContent = '';
    data.suppliers.forEach(function (s) {
      var edit = el('button', { type: 'button', className: 'cai-btn cai-btn--outline', text: 'Edit' });
      edit.addEventListener('click', function () { openSupplier(s); });
      supplierBody.appendChild(row([s.name, s.type, s.address, s.contact, edit]));
    });
  }

  function openSupplier(s) {
    currentSupplier = s || null;
    $('so-supplier-dialog-title').textContent = s ? 'Edit Supplier' : 'Add Supplier';
    $('so-field-name').value = s ? s.name : '';
    $('so-field-type').value = s ? s.type : '';
    $('so-field-address').value = s ? s.address : '';
    $('so-field-contact').value = s ? s.contact : '';
    supplierDialog.showModal();
  }

  $('so-add-supplier').addEventListener('click', function () { openSupplier(null); });
  $('so-supplier-close').addEventListener('click', function () { supplierDialog.close(); });
  $('so-supplier-cancel').addEventListener('click', function () { supplierDialog.close(); });

  supplierForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var values = {
      name: $('so-field-name').value.trim(),
      type: $('so-field-type').value.trim(),
      address: $('so-field-address').value.trim(),
      contact: $('so-field-contact').value.trim()
    };
    if (!values.name || !values.type || !values.address || !values.contact) return;

    if (currentSupplier) {
      Object.assign(currentSupplier, values);
    } else {
      data.suppliers.push(values);
    }

    supplierDialog.close();
    renderSuppliers();
    renderAvailable();   // supplier names feed the "Supplier" dropdown above
  });

  /* ------------------------------------------------------------------ */
  /*  Start                                                                */
  /* ------------------------------------------------------------------ */

  buildFilter();
  renderAvailable();
  renderOrders();
  renderSuppliers();
})();
