/* ==========================================================================
   Carl's Angels Inventory Management — Site page: Bill of Materials (BOM)

   Each BOM page (owner_site-a-bom.html, owner_site-b-bom.html, owner_site-c-bom.html) defines
   its own hardcoded data as window.CAI_BOM before loading this file. Swap
   CAI_BOM for a real API response later and nothing else here needs to change.

   Rules:
     - Remaining = Qty - Used Qty   (shown red with a minus when over plan)
     - Used      = Used Qty / Qty   (bar caps at 100% and turns red when over)
     - Fully Used card = items where Used Qty equals Qty
     - Over Planned Quantity card = items where Used Qty is more than Qty
   Used Qty is the only editable column, as in the mockup.
   ========================================================================== */

(function () {
  'use strict';

  var bom = window.CAI_BOM;
  var table = document.getElementById('bom-table');
  if (!bom || !table) return;

  var rows = [];   // one entry per item, holding the cells that change live

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

  function isValid(n) { return isFinite(n); }

  function safe(v) {
    var n = num(v);
    return isValid(n) ? n : 0;
  }

  function fmt(n) { return n.toLocaleString('en-US', { maximumFractionDigits: 2 }); }

  function sectionLetter(i) { return String.fromCharCode(65 + (i % 26)); }

  /* ---------------------------------------------------------------------- */
  /*  Used Qty input: commas when idle, plain digits while typing,           */
  /*  error styling from the design guide when the value isn't valid         */
  /* ---------------------------------------------------------------------- */

  function usedInput(item, label, onChange) {
    var input = el('input', {
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      className: 'boq-input',
      'aria-label': label
    });
    var n = num(item.used);
    input.value = isValid(n) ? fmt(n) : String(item.used == null ? '' : item.used);

    function check() {
      var bad = !isValid(num(input.value));
      input.classList.toggle('boq-input--error', bad);
      input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    }

    input.addEventListener('input', function () {
      check();
      item.used = input.value;
      onChange();
    });

    input.addEventListener('focus', function () {
      var v = num(input.value);
      if (isValid(v)) input.value = String(v);
      input.select();
    });

    input.addEventListener('blur', function () {
      var v = num(input.value);
      if (isValid(v)) input.value = fmt(v);
    });

    check();
    return input;
  }

  /* ---------------------------------------------------------------------- */
  /*  Rendering                                                              */
  /* ---------------------------------------------------------------------- */

  function buildHead() {
    var heads = ['Item no.', 'Description', 'Qty', 'Unit', 'Used Qty', 'Remaining', 'Used'];
    var tr = el('tr', null, heads.map(function (h) {
      return el('th', { scope: 'col', text: h });
    }));
    return el('thead', null, [tr]);
  }

  function buildSection(sec, si, startNo) {
    var tbody = el('tbody');

    tbody.appendChild(el('tr', null, [
      el('th', {
        colspan: '7',
        scope: 'colgroup',
        className: 'bom-section__title',
        text: sectionLetter(si) + '. ' + sec.title
      })
    ]));

    sec.items.forEach(function (item, ii) {
      var no = startNo + ii;
      var tr = el('tr');

      tr.appendChild(el('td', { text: String(no) }));
      tr.appendChild(el('td', { text: item.desc }));
      tr.appendChild(el('td', { text: fmt(safe(item.qty)) }));
      tr.appendChild(el('td', { text: item.unit }));

      tr.appendChild(el('td', null, [
        usedInput(item, 'Used quantity, item ' + no, update)
      ]));

      var remaining = el('span');
      tr.appendChild(el('td', null, [remaining]));

      var fill = el('div', { className: 'cai-progress__fill' });
      var pct = el('span', { className: 'bom-used__pct' });
      var progress = el('div', { className: 'cai-progress' }, [fill]);
      var used = el('div', { className: 'bom-used' }, [progress, pct]);
      tr.appendChild(el('td', null, [used]));

      tbody.appendChild(tr);
      rows.push({ item: item, remaining: remaining, fill: fill, pct: pct, bar: used });
    });

    return tbody;
  }

  /* ---------------------------------------------------------------------- */
  /*  Live numbers                                                           */
  /* ---------------------------------------------------------------------- */

  function update() {
    var full = 0;
    var over = 0;

    rows.forEach(function (r) {
      var qty = safe(r.item.qty);
      var used = safe(r.item.used);
      var left = qty - used;
      var pct = qty > 0 ? used / qty * 100 : 0;

      r.remaining.textContent = (left < 0 ? '-' : '') + fmt(Math.abs(left));
      r.remaining.classList.toggle('bom-negative', left < 0);

      r.fill.style.width = Math.min(pct, 100) + '%';
      r.pct.textContent = Math.round(pct) + '%';
      r.bar.classList.toggle('bom-progress--over', used > qty);

      if (used > qty) over += 1;
      else if (qty > 0 && used === qty) full += 1;
    });

    $('stat-items').textContent = String(rows.length);
    $('stat-full').textContent = String(full);
    $('stat-over').textContent = String(over);
  }

  /* ---------------------------------------------------------------------- */
  /*  Start                                                                  */
  /* ---------------------------------------------------------------------- */

  table.appendChild(buildHead());

  var nextNo = 1;   // item numbers run straight through every section
  bom.sections.forEach(function (sec, si) {
    table.appendChild(buildSection(sec, si, nextNo));
    nextNo += sec.items.length;
  });

  update();
})();
