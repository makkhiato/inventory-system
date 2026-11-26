/* ==========================================================================
   Carl's Angels Inventory Management — Site page: Cost Variance
   Data comes from window.CAI_VARIANCE. Prototype only: nothing is saved.

   Rules:
     - Expected qty  = BOM qty x Progress
     - Actual cost   = Used qty x Unit cost paid
     - Expected cost = Expected qty x Planned unit cost
     - Difference    = Actual cost - Expected cost
     - Result        = OK if within OK_PCT % of Expected cost,
                       otherwise Over or Under
   ========================================================================== */
(function () {
  'use strict';

  var data = window.CAI_VARIANCE;
  var tbody = document.getElementById('var-rows');
  if (!data || !tbody) return;

  var OK_PCT = 2;
  var rows = [];

  function $(id) { return document.getElementById(id); }

  function fmt(n, opts) { return n.toLocaleString('en-US', opts || { maximumFractionDigits: 2 }); }

  // Money is shown in whole pesos.
  function peso(n) { return (Math.round(n) < 0 ? '-' : '') + '₱' + fmt(Math.abs(Math.round(n))); }
  function signed(n) { return (Math.round(n) > 0 ? '+' : '') + peso(n); }

  // Blank, negative or non-numeric entries are invalid.
  function num(v) {
    var s = String(v).replace(/,/g, '').trim();
    return /^(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : NaN;
  }

  function showResult(cell, diff, expected) {
    var within = Math.abs(diff) <= expected * OK_PCT / 100;
    var text = within ? 'OK' : diff > 0 ? 'Over' : 'Under';
    cell.textContent = text;
    cell.className = 'var-result var-result--' + (text === 'Over' ? 'over' : 'good');
  }

  function update() {
    var totalActual = 0;
    var totalExpected = 0;

    rows.forEach(function (r) {
      var actual = r.m.used * (num(r.m.paid) || 0);
      var expected = r.m.qty * data.progress / 100 * r.m.planned;
      totalActual += actual;
      totalExpected += expected;
      r.actual.textContent = peso(actual);
      r.expected.textContent = peso(expected);
      r.diff.textContent = signed(actual - expected);
      showResult(r.result, actual - expected, expected);
    });

    var net = totalActual - totalExpected;
    $('var-expected').textContent = $('var-total-expected').textContent = peso(totalExpected);
    $('var-actual').textContent = $('var-total-actual').textContent = peso(totalActual);
    $('var-net').textContent = $('var-total-diff').textContent = signed(net);
    showResult($('var-total-result'), net, totalExpected);
  }

  function cell(tr, text) {
    var td = document.createElement('td');
    td.textContent = text || '';
    tr.appendChild(td);
    return td;
  }

  data.materials.forEach(function (m) {
    var tr = document.createElement('tr');
    cell(tr, m.name);
    cell(tr, fmt(m.used) + ' ' + m.unit);
    cell(tr, fmt(m.qty * data.progress / 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' ' + m.unit);

    var input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.className = 'boq-input';
    input.setAttribute('aria-label', 'Unit cost paid, ' + m.name);
    input.value = m.paid;
    input.addEventListener('input', function () {
      var bad = isNaN(num(input.value));
      input.classList.toggle('boq-input--error', bad);
      input.setAttribute('aria-invalid', String(bad));
      m.paid = input.value;
      update();
    });
    cell(tr).appendChild(input);

    rows.push({ m: m, actual: cell(tr), expected: cell(tr), diff: cell(tr), result: cell(tr) });
    tbody.appendChild(tr);
  });

  $('var-progress').textContent = data.progress + '%';
  update();
})();
