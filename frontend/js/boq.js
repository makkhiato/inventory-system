/* ==========================================================================
   Carl's Angels Inventory Management — Site page: Bill of Quantity (BOQ)

   Each site page (owner_site-a.html, owner_site-b.html, owner_site-c.html) defines its own
   hardcoded data as window.CAI_SITE before loading this file; this file
   renders the table and keeps every total live. Swap CAI_SITE for a real
   API response later and nothing else here needs to change.

   Editing:
     - Every section is view-only until its "edit" button is clicked.
     - While a section is being edited its cells become inputs and an
       "+ Add item" button appears. "done" leaves edit mode, but only once
       every value in that section is valid.

   Rules:
     - A row whose unit is "days" is a labor row:
         Material Amount = 0,  Labor Cost = Qty x Unit Cost
     - Any other row is a material row:
         Material Amount = Qty x Unit Cost,  Labor Cost = typed in (default 0)
     - Total = Material Amount + Labor Cost
     - Cost Summary: Indirect (OCM) and Profit are % of Total Direct Cost
   ========================================================================== */

(function () {
  'use strict';

  var site = window.CAI_SITE;
  var table = document.getElementById('boq-table');
  if (!site || !table) return;

  var UNITS = ['lot', 'pcs', 'sets', 'bags', 'sheets', 'kg', 'm', 'm2', 'm3', 'gal', 'days'];
  var LABOR_UNIT = 'days';

  // Cells that need rewriting when a number changes; rebuilt by render().
  var refs = { rows: [], subs: [] };

  function $(id) { return document.getElementById(id); }

  /* ---------------------------------------------------------------------- */
  /*  Small helpers                                                          */
  /* ---------------------------------------------------------------------- */

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

  // Accepts "1,200" or 1200; anything else (blank, negative, letters) is NaN.
  function num(v) {
    var s = String(v == null ? '' : v).replace(/,/g, '').trim();
    return /^(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : NaN;
  }

  function isValid(n, max) {
    return isFinite(n) && (max === undefined || n <= max);
  }

  function safe(v) {
    var n = num(v);
    return isValid(n) ? n : 0;
  }

  function fmt(n) { return n.toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function peso(n) { return '₱' + fmt(n); }

  function roman(n) {
    var map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    var out = '';
    map.forEach(function (p) {
      while (n >= p[0]) { out += p[1]; n -= p[0]; }
    });
    return out;
  }

  function letter(i) {
    var s = '';
    i += 1;
    while (i > 0) {
      var r = (i - 1) % 26;
      s = String.fromCharCode(97 + r) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  }

  /* ---------------------------------------------------------------------- */
  /*  Math                                                                   */
  /* ---------------------------------------------------------------------- */

  function isLabor(it) { return it.unit === LABOR_UNIT; }

  function materialAmount(it) {
    return isLabor(it) ? 0 : safe(it.qty) * safe(it.unitCost);
  }

  function laborAmount(it) {
    return isLabor(it) ? safe(it.qty) * safe(it.unitCost) : safe(it.laborCost);
  }

  function itemTotal(it) { return materialAmount(it) + laborAmount(it); }

  function sectionTotal(sec) {
    return sec.items.reduce(function (a, it) { return a + itemTotal(it); }, 0);
  }

  function summary() {
    var direct = site.sections.reduce(function (a, s) { return a + sectionTotal(s); }, 0);
    var ocm = direct * safe(site.ocmPct) / 100;
    var profit = direct * safe(site.profitPct) / 100;
    return { direct: direct, ocm: ocm, profit: profit, total: direct + ocm + profit };
  }

  function blankItem() {
    return { desc: '', qty: 1, unit: 'lot', unitCost: 0, laborCost: 0 };
  }

  /* ---------------------------------------------------------------------- */
  /*  Number inputs: commas when idle, plain digits while typing,            */
  /*  error styling from the design guide when the value isn't valid         */
  /* ---------------------------------------------------------------------- */

  function wireNumber(input, max, onChange) {
    function check() {
      var bad = !isValid(num(input.value), max);
      input.classList.toggle('boq-input--error', bad);
      input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    }

    input.addEventListener('input', function () {
      check();
      onChange(input.value);
    });

    input.addEventListener('focus', function () {
      var n = num(input.value);
      if (isValid(n)) input.value = String(n);
      input.select();
    });

    input.addEventListener('blur', function () {
      var n = num(input.value);
      if (isValid(n, max)) input.value = fmt(n);
    });

    check();
  }

  function numInput(value, label, onChange) {
    var input = el('input', {
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      className: 'boq-input',
      'aria-label': label
    });
    var n = num(value);
    input.value = isValid(n) ? fmt(n) : String(value == null ? '' : value);
    wireNumber(input, undefined, onChange);
    return input;
  }

  /* ---------------------------------------------------------------------- */
  /*  Rendering                                                              */
  /* ---------------------------------------------------------------------- */

  function buildHead() {
    var heads = ['Item no.', 'Description', 'Qty', 'Unit', 'Unit Cost', 'Material Amount', 'Labor Cost', 'Total'];
    var tr = el('tr', null, heads.map(function (h) {
      return el('th', { scope: 'col', text: h });
    }));
    return el('thead', null, [tr]);
  }

  function unitOptions(current) {
    return UNITS.indexOf(current) === -1 ? UNITS.concat(current) : UNITS;
  }

  // Read-only cell used while a section is not being edited.
  function textCell(text, left) {
    return el('td', null, [
      el('span', { className: 'boq-cell-text' + (left ? ' boq-cell-text--left' : ''), text: text })
    ]);
  }

  function sectionBody(si) {
    return table.querySelectorAll('tbody.boq-section')[si];
  }

  // Put focus back on a cell after a full re-render.
  function focusCell(si, ii, selector) {
    var body = sectionBody(si);
    if (!body) return;
    var row = body.querySelectorAll('tr.boq-item')[ii];
    var target = row && row.querySelector(selector);
    if (target) target.focus();
  }

  function focusTitle(si) {
    var body = sectionBody(si);
    var input = body && body.querySelector('.boq-section__input');
    if (input) { input.focus(); input.select(); }
  }

  function buildItem(sec, it, si, ii) {
    var editing = !!sec._editing;
    var labor = isLabor(it);
    var where = 'section ' + roman(si + 1) + ', item ' + letter(ii);
    var tr = el('tr', { className: 'boq-item' });

    // Item no.
    tr.appendChild(el('td', null, [el('span', { className: 'boq-itemno', text: letter(ii) + '.' })]));

    if (editing) {
      // Description
      var desc = el('input', {
        type: 'text',
        className: 'boq-input boq-input--text',
        'aria-label': 'Description, ' + where,
        'data-field': 'desc'
      });
      desc.value = it.desc;
      desc.addEventListener('input', function () { it.desc = desc.value; });
      tr.appendChild(el('td', null, [desc]));

      // Qty
      tr.appendChild(el('td', null, [
        numInput(it.qty, 'Quantity, ' + where, function (v) { it.qty = v; updateTotals(); })
      ]));

      // Unit (switching to/from "days" changes the row between material and labor)
      var unit = el('select', {
        className: 'boq-input boq-select',
        'aria-label': 'Unit, ' + where,
        'data-field': 'unit'
      });
      unitOptions(it.unit).forEach(function (u) {
        var o = el('option', { value: u, text: u });
        if (u === it.unit) o.selected = true;
        unit.appendChild(o);
      });
      unit.addEventListener('change', function () {
        it.unit = unit.value;
        render();
        focusCell(si, ii, '[data-field="unit"]');
      });
      tr.appendChild(el('td', null, [unit]));

      // Unit cost
      tr.appendChild(el('td', null, [
        numInput(it.unitCost, 'Unit cost, ' + where, function (v) { it.unitCost = v; updateTotals(); })
      ]));
    } else {
      tr.appendChild(textCell(it.desc, true));
      tr.appendChild(textCell(fmt(safe(it.qty))));
      tr.appendChild(textCell(it.unit));
      tr.appendChild(textCell(fmt(safe(it.unitCost))));
    }

    // Material amount (computed)
    var matSpan = el('span', { className: 'boq-money' });
    tr.appendChild(el('td', null, [matSpan]));

    // Labor cost: computed on labor rows, typed on material rows while editing
    var laborCell = el('td');
    var laborSpan = null;
    if (labor || !editing) {
      laborSpan = el('span', { className: 'boq-money' });
      laborCell.appendChild(laborSpan);
    } else {
      laborCell.appendChild(
        numInput(it.laborCost, 'Labor cost, ' + where, function (v) { it.laborCost = v; updateTotals(); })
      );
    }
    tr.appendChild(laborCell);

    // Total (computed)
    var totSpan = el('span', { className: 'boq-money boq-total' });
    tr.appendChild(el('td', null, [totSpan]));

    refs.rows.push({ it: it, material: matSpan, labor: laborSpan, total: totSpan });
    return tr;
  }

  function buildSection(sec, si) {
    var editing = !!sec._editing;
    var tbody = el('tbody', { className: 'boq-section' });

    // Header row: numbered title + edit/done button
    var titleInput = el('input', {
      type: 'text',
      className: 'boq-section__input',
      'aria-label': 'Section ' + roman(si + 1) + ' title'
    });
    if (!editing) titleInput.setAttribute('readonly', '');
    titleInput.value = sec.title;

    var editBtn = el('button', {
      type: 'button',
      className: 'cai-btn cai-btn--outline boq-edit',
      text: editing ? 'done' : 'edit'
    });

    function toggleEdit() {
      if (!editing) {
        sec._editing = true;
        render();
        focusTitle(si);
        return;
      }
      // Don't leave edit mode while a value in this section is still invalid.
      var bad = tbody.querySelector('.boq-input--error');
      if (bad) { bad.focus(); return; }
      sec._editing = false;
      render();
    }

    editBtn.addEventListener('click', toggleEdit);
    titleInput.addEventListener('input', function () { sec.title = titleInput.value; });
    titleInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && editing) toggleEdit();
    });

    var titleBox = el('div', { className: 'boq-section__titlebox' }, [
      el('span', { className: 'boq-section__num', text: roman(si + 1) + '.' }),
      titleInput
    ]);
    tbody.appendChild(el('tr', null, [
      el('td', { colspan: '8', className: 'boq-section__head' }, [
        el('div', { className: 'boq-section__bar' }, [titleBox, editBtn])
      ])
    ]));

    // Item rows
    sec.items.forEach(function (it, ii) { tbody.appendChild(buildItem(sec, it, si, ii)); });

    // Footer: sub-total, plus "+ Add item" only while editing
    var subVal = el('span', { className: 'boq-money' });
    var footCells;
    if (editing) {
      var addBtn = el('button', { type: 'button', className: 'cai-btn cai-btn--outline boq-add-item', text: '+ Add item' });
      addBtn.addEventListener('click', function () {
        sec.items.push(blankItem());
        render();
        focusCell(si, sec.items.length - 1, '[data-field="desc"]');
      });
      footCells = [
        el('td', { colspan: '2', className: 'boq-subtotal__add' }, [addBtn]),
        el('td', { colspan: '5', className: 'boq-subtotal__label', text: 'Sub-total:' }),
        el('td', null, [subVal])
      ];
    } else {
      footCells = [
        el('td', { colspan: '7', className: 'boq-subtotal__label', text: 'Sub-total:' }),
        el('td', null, [subVal])
      ];
    }
    tbody.appendChild(el('tr', { className: 'boq-subtotal' }, footCells));
    refs.subs.push({ sec: sec, cell: subVal });

    return tbody;
  }

  function render() {
    refs = { rows: [], subs: [] };
    table.textContent = '';
    table.appendChild(buildHead());
    site.sections.forEach(function (sec, si) { table.appendChild(buildSection(sec, si)); });
    updateTotals();
  }

  /* ---------------------------------------------------------------------- */
  /*  Live totals                                                            */
  /* ---------------------------------------------------------------------- */

  var sumEls = {
    direct: $('sum-direct'),
    ocm: $('sum-ocm'),
    profit: $('sum-profit'),
    total: $('sum-total')
  };

  function updateTotals() {
    refs.rows.forEach(function (r) {
      r.material.textContent = peso(materialAmount(r.it));
      if (r.labor) r.labor.textContent = peso(laborAmount(r.it));
      r.total.textContent = peso(itemTotal(r.it));
    });

    refs.subs.forEach(function (s) { s.cell.textContent = peso(sectionTotal(s.sec)); });

    var s = summary();
    sumEls.direct.textContent = peso(s.direct);
    sumEls.ocm.textContent = peso(s.ocm);
    sumEls.profit.textContent = peso(s.profit);
    sumEls.total.textContent = peso(s.total);
  }

  /* ---------------------------------------------------------------------- */
  /*  Buttons                                                                */
  /* ---------------------------------------------------------------------- */

  $('boq-add-section').addEventListener('click', function () {
    // A new section starts in edit mode so it can be filled in straight away.
    site.sections.push({ title: 'New section', items: [blankItem()], _editing: true });
    render();
    var si = site.sections.length - 1;
    focusTitle(si);
    sectionBody(si).scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  function csvCell(v) {
    if (typeof v === 'number') return String(v);
    var s = String(v == null ? '' : v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;       // keep Excel from running typed text as a formula
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  $('boq-export').addEventListener('click', function () {
    var rows = [['Section', 'Item no.', 'Description', 'Qty', 'Unit', 'Unit Cost', 'Material Amount', 'Labor Cost', 'Total']];

    site.sections.forEach(function (sec, si) {
      sec.items.forEach(function (it, ii) {
        rows.push([
          roman(si + 1) + '. ' + sec.title, letter(ii), it.desc,
          safe(it.qty), it.unit, safe(it.unitCost),
          round2(materialAmount(it)), round2(laborAmount(it)), round2(itemTotal(it))
        ]);
      });
    });

    var s = summary();
    rows.push([]);
    rows.push(['Total Direct Cost', '', '', '', '', '', '', '', round2(s.direct)]);
    rows.push(['Indirect Cost (OCM) ' + safe(site.ocmPct) + '%', '', '', '', '', '', '', '', round2(s.ocm)]);
    rows.push(['Profit at ' + safe(site.profitPct) + '%', '', '', '', '', '', '', '', round2(s.profit)]);
    rows.push(['Sub-total', '', '', '', '', '', '', '', round2(s.total)]);

    var csv = '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    var a = el('a', { href: url, download: 'boq-' + site.slug + '.csv' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  });

  /* ---------------------------------------------------------------------- */
  /*  Start                                                                  */
  /* ---------------------------------------------------------------------- */

  site.sections.forEach(function (sec) {
    sec.items.forEach(function (it) {
      if (it.laborCost === undefined) it.laborCost = 0;
    });
  });

  $('boq-contract-total').textContent = peso(safe(site.contractTotal));

  var ocmInput = $('sum-ocm-pct');
  var profitInput = $('sum-profit-pct');
  ocmInput.value = fmt(safe(site.ocmPct));
  profitInput.value = fmt(safe(site.profitPct));
  wireNumber(ocmInput, 100, function (v) { site.ocmPct = v; updateTotals(); });
  wireNumber(profitInput, 100, function (v) { site.profitPct = v; updateTotals(); });

  render();
})();
