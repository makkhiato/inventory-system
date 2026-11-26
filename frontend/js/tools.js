/* ==========================================================================
   Carl's Angels Inventory Management — Inventory: Tools tab

   Data comes from window.CAI_TOOLS (see owner_inventory-tools.html). Prototype
   only: nothing is saved. Swap CAI_TOOLS for a real API response later
   and the rendering below can stay as-is.

   Status and Assigned To are editable right in the table, same idea as
   the Supplier field on the Supplier Orders page. The In Use / Under
   Repair counts above the table reflect whichever project is currently
   selected in the filter.
   ========================================================================== */
(function () {
  'use strict';

  var data = window.CAI_TOOLS;
  var tbody = document.getElementById('tools-rows');
  if (!data || !tbody) return;

  var STATUS_CLASS = { Available: 'tools-status--available', 'In Use': 'tools-status--inuse', 'Under Repair': 'tools-status--repair' };

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

  /* ---------------------------------------------------------------------- */
  /*  Project filter                                                          */
  /* ---------------------------------------------------------------------- */

  var filterSelect = $('tools-project-filter');

  function buildFilter() {
    filterSelect.textContent = '';
    filterSelect.appendChild(el('option', { value: '', text: 'All projects' }));
    data.projects.forEach(function (p) {
      filterSelect.appendChild(el('option', { value: p, text: p }));
    });
  }

  filterSelect.addEventListener('change', render);

  /* ---------------------------------------------------------------------- */
  /*  Table + stat cards                                                      */
  /* ---------------------------------------------------------------------- */

  function statusSelect(item) {
    var sel = el('select', {
      className: 'boq-input boq-select tools-status ' + (STATUS_CLASS[item.status] || ''),
      'aria-label': 'Status, ' + item.tool
    });
    data.statuses.forEach(function (s) {
      var opt = el('option', { value: s, text: s });
      if (s === item.status) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function () {
      item.status = sel.value;
      sel.className = 'boq-input boq-select tools-status ' + (STATUS_CLASS[item.status] || '');
      updateStats();
    });
    return sel;
  }

  function assignedInput(item) {
    var input = el('input', {
      type: 'text',
      className: 'boq-input boq-input--text',
      'aria-label': 'Assigned to, ' + item.tool,
      placeholder: 'Unassigned'
    });
    input.value = item.assignedTo || '';
    input.addEventListener('input', function () { item.assignedTo = input.value; });
    return input;
  }

  function visibleItems() {
    var activeProject = filterSelect.value;
    return data.items.filter(function (item) { return !activeProject || item.project === activeProject; });
  }

  function updateStats() {
    var visible = visibleItems();
    var inUse = visible.filter(function (item) { return item.status === 'In Use'; }).length;
    var repair = visible.filter(function (item) { return item.status === 'Under Repair'; }).length;

    $('tools-stat-inuse').textContent = String(inUse);
    $('tools-stat-repair').textContent = String(repair);
    $('tools-stat-inuse').parentElement.classList.toggle('tools-stat--flagged', inUse > 0);
    $('tools-stat-repair').parentElement.classList.toggle('tools-stat--flagged', repair > 0);
  }

  function render() {
    var visible = visibleItems();
    tbody.textContent = '';

    visible.forEach(function (item) {
      tbody.appendChild(el('tr', null, [
        el('td', { text: item.tool }),
        el('td', { text: item.project }),
        el('td', { text: item.location }),
        el('td', { text: String(item.quantity) }),
        el('td', null, [statusSelect(item)]),
        el('td', null, [assignedInput(item)])
      ]));
    });

    if (!visible.length) {
      tbody.appendChild(el('tr', null, [
        el('td', { colspan: '6', text: 'No tools or equipment tracked for this project yet.' })
      ]));
    }

    updateStats();
  }

  buildFilter();
  render();
})();
