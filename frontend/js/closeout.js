/* ==========================================================================
   Carl's Angels Inventory Management — Site page: Project Closeout
   Data comes from window.CAI_CLOSEOUT. Prototype only: nothing is saved.

   Rules:
     - Remaining         = BOM qty - Used qty (never below 0)
     - Value at BOQ cost = Remaining x Planned unit cost
     - Estimated         = BOM qty x Planned unit cost
     - Actual cost       = Used qty x Unit cost paid
     - Final variance    = Actual cost - Estimated
     - Close Project needs a decision for every leftover material and
       no open punch items
   ========================================================================== */
(function () {
  'use strict';

  var data = window.CAI_CLOSEOUT;
  var punchBody = document.getElementById('cl-punch');
  if (!data || !punchBody) return;

  var DECISIONS = ['Undecided', 'Return to supplier', 'Transfer to another site', 'Keep in warehouse', 'Dispose'];
  var closed = false;

  function $(id) { return document.getElementById(id); }

  function peso(n) {
    return (n < 0 ? '-' : '') + '₱' + Math.abs(Math.round(n)).toLocaleString('en-US');
  }

  function cell(tr, content) {
    var td = document.createElement('td');
    if (typeof content === 'string') td.textContent = content;
    else if (content) td.appendChild(content);
    tr.appendChild(td);
    return td;
  }

  function select(options, current, label, onChange) {
    var s = document.createElement('select');
    s.className = 'cl-control';
    s.setAttribute('aria-label', label);
    options.forEach(function (text) {
      var o = document.createElement('option');
      o.textContent = text;
      o.selected = text === current;
      s.appendChild(o);
    });
    s.addEventListener('change', function () { onChange(s.value); });
    return s;
  }

  function openCount() {
    return data.punch.filter(function (p) { return p.status === 'Open'; }).length;
  }

  function say(text) { $('cl-message').textContent = text; }

  function renderPunch() {
    punchBody.textContent = '';
    data.punch.forEach(function (p) {
      var tr = document.createElement('tr');

      var item = document.createElement('input');
      item.type = 'text';
      item.className = 'cl-control';
      item.placeholder = 'New Item';
      item.setAttribute('list', 'cl-suggestions');
      item.setAttribute('aria-label', 'Punch item');
      item.value = p.name;
      item.addEventListener('input', function () { p.name = item.value; });
      cell(tr, item);

      cell(tr, select(['Open', 'Done'], p.status, 'Punch item status', function (v) {
        p.status = v;
        say('');
        $('cl-open').textContent = openCount();
      }));

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'cai-btn cai-btn--primary';
      remove.textContent = 'Remove';
      remove.addEventListener('click', function () {
        data.punch.splice(data.punch.indexOf(p), 1);
        say('');
        renderPunch();
      });
      cell(tr, remove);
      punchBody.appendChild(tr);
    });

    if (!data.punch.length) {
      var empty = document.createElement('tr');
      cell(empty, 'No punch items yet.').colSpan = 3;
      punchBody.appendChild(empty);
    }
    $('cl-open').textContent = openCount();
  }

  var leftover = 0;
  var estimated = 0;
  var actual = 0;

  data.materials.forEach(function (m) {
    var remaining = Math.max(0, m.qty - m.used);
    leftover += remaining * m.planned;
    estimated += m.qty * m.planned;
    actual += m.used * m.paid;

    var tr = document.createElement('tr');
    cell(tr, m.name);
    cell(tr, remaining.toLocaleString('en-US') + ' ' + m.unit);
    cell(tr, peso(remaining * m.planned));
    m.decision = m.decision || 'Undecided';
    cell(tr, select(DECISIONS, m.decision, 'Decision, ' + m.name, function (v) {
      m.decision = v;
      say('');
    }));
    $('cl-materials').appendChild(tr);
  });

  $('cl-leftover').textContent = peso(leftover);
  $('cl-estimated').textContent = peso(estimated);
  $('cl-actual').textContent = peso(actual);
  $('cl-variance').textContent = $('cl-difference').textContent = peso(actual - estimated);
  $('cl-changes').textContent = peso(data.approvedChanges);

  $('cl-add').addEventListener('click', function () {
    data.punch.push({ name: '', status: 'Open' });
    say('');
    renderPunch();
    var inputs = punchBody.querySelectorAll('input');
    inputs[inputs.length - 1].focus();
  });

  $('cl-close').addEventListener('click', function () {
    if (closed) return;
    var undecided = data.materials.filter(function (m) {
      return m.qty > m.used && m.decision === 'Undecided';
    }).length;
    var open = openCount();
    var reasons = [];
    if (undecided) reasons.push('choose a decision for ' + undecided + ' leftover material(s)');
    if (open) reasons.push('finish or remove ' + open + ' open punch item(s)');
    if (reasons.length) { say('Before closing, ' + reasons.join(' and ') + '.'); return; }
    if (!window.confirm('Close this project?')) return;

    closed = true;
    $('cl-status').textContent = 'Closed';
    $('cl-status').classList.add('cl-status--closed');
    document.querySelectorAll('.cl-table input, .cl-table select, .cl-table button, #cl-add, #cl-close')
      .forEach(function (control) { control.disabled = true; });
    say('Project closed.');
  });

  renderPunch();
})();
