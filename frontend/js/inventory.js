/* ==========================================================================
   Carl's Angels Inventory Management — Inventory

   Data comes from window.CAI_INVENTORY (see owner_inventory.html and procurement_inventory.html). Prototype
   only: nothing is saved. Swap CAI_INVENTORY for a real API response
   later and the rendering below can stay as-is.

   Rules:
     Remaining  = Quantity - Quantity Used
     Used       = Quantity Used / Quantity   (bar + percentage)
     Unavailable = Remaining is 0 (or less)
     Low-stock   = Remaining is more than 0 but at or below the
                   reorder threshold (CAI_INVENTORY.reorderThreshold,
                   a fraction of Quantity)
   The Low-stock / Unavailable counts above the table reflect whichever
   project is currently selected in the filter.
   ========================================================================== */
(function () {
  'use strict';

  var data = window.CAI_INVENTORY;
  var tbody = document.getElementById('inv-rows');
  if (!data || !tbody) return;

  var THRESHOLD = data.reorderThreshold || 0.15;

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

  function fmt(n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); }

  // Returns 'unavailable', 'low' or null for a given item.
  function status(item) {
    var remaining = item.quantity - item.used;
    if (remaining <= 0) return 'unavailable';
    if (remaining <= item.quantity * THRESHOLD) return 'low';
    return null;
  }

  /* ---------------------------------------------------------------------- */
  /*  Project filter                                                          */
  /* ---------------------------------------------------------------------- */

  var filterSelect = $('inv-project-filter');

  function buildFilter() {
    filterSelect.textContent = '';
    filterSelect.appendChild(el('option', { value: '', text: 'All projects' }));
    data.projects.forEach(function (p) {
      filterSelect.appendChild(el('option', { value: p, text: p }));
    });
    // Optional: a page can open on one project instead of "All projects".
    if (data.defaultProject && data.projects.indexOf(data.defaultProject) !== -1) {
      filterSelect.value = data.defaultProject;
    }
  }

  filterSelect.addEventListener('change', render);

  /* ---------------------------------------------------------------------- */
  /*  Table + stat cards                                                      */
  /* ---------------------------------------------------------------------- */

  function usedCell(item) {
    var pct = item.quantity > 0 ? item.used / item.quantity * 100 : 0;
    var fill = el('div', { className: 'cai-progress__fill' });
    fill.style.width = Math.min(pct, 100) + '%';
    var bar = el('div', { className: 'cai-progress' }, [fill]);
    if (item.used >= item.quantity) bar.classList.add('inv-progress--full');
    var label = el('span', { className: 'inv-used__pct', text: Math.round(pct) + '%' });
    return el('div', { className: 'inv-used' }, [bar, label]);
  }

  function render() {
    var activeProject = filterSelect.value;
    var visible = data.items.filter(function (item) {
      return !activeProject || item.project === activeProject;
    });

    tbody.textContent = '';
    var low = 0;
    var unavailable = 0;

    visible.forEach(function (item) {
      var s = status(item);
      if (s === 'low') low += 1;
      if (s === 'unavailable') unavailable += 1;

      var tr = el('tr', { className: s ? 'inv-row--' + s : '' }, [
        el('td', { text: item.material }),
        el('td', { text: item.location }),
        el('td', { text: fmt(item.quantity) }),
        el('td', { text: item.unit }),
        el('td', { text: fmt(item.used) }),
        el('td', null, [usedCell(item)])
      ]);
      tbody.appendChild(tr);
    });

    if (!visible.length) {
      tbody.appendChild(el('tr', null, [
        el('td', { colspan: '6', text: 'No materials tracked for this project yet.' })
      ]));
    }

    $('inv-stat-low').textContent = String(low);
    $('inv-stat-unavailable').textContent = String(unavailable);
    $('inv-stat-low').parentElement.classList.toggle('inv-stat--flagged', low > 0);
    $('inv-stat-unavailable').parentElement.classList.toggle('inv-stat--flagged', unavailable > 0);
  }

  buildFilter();
  render();
})();
