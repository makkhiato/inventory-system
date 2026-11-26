/* ==========================================================================
   Carl's Angels Inventory Management — Site page: Project Goals
   Data comes from window.CAI_GOALS. Prototype only: nothing is saved.

   Rules:
     - Activity Actual       = sum of the weights of its done tasks
     - Activity Expected Now = Weekly Target % x weeks elapsed, if one is typed;
                               otherwise the share of its dates elapsed (max 100)
     - Overall / Expected    = each activity's % weighted by Share of Project
     - Status                = Ahead if Overall is above Expected, Behind if it
                               is more than TOLERANCE points below, else On Track
   ========================================================================== */
(function () {
  'use strict';

  var data = window.CAI_GOALS;
  var list = document.getElementById('goal-list');
  if (!data || !list) return;

  var TOLERANCE = 5;
  var DAY = 86400000;
  var live = [];   // per-activity updaters, rebuilt by render()

  function $(id) { return document.getElementById(id); }

  function el(tag, props, kids) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'className') node.className = props[k];
      else if (k === 'text') node.textContent = props[k];
      else node.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  function number(v) { var n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0; }
  function pct(n) { return Math.round(n) + '%'; }
  function days(from, to) { return Math.round((Date.parse(to) - Date.parse(from)) / DAY); }
  function showDate(iso) { var p = String(iso).split('-'); return p.length === 3 ? p[1] + '/' + p[2] + '/' + p[0] : '—'; }

  function weightTotal(a) { return a.tasks.reduce(function (s, t) { return s + number(t.weight); }, 0); }

  function actual(a) {
    return Math.min(100, a.tasks.reduce(function (s, t) { return s + (t.done ? number(t.weight) : 0); }, 0));
  }

  function expected(a) {
    if (!a.start || !a.end || data.asOf < a.start) return 0;
    if (number(a.weekly)) return Math.min(100, number(a.weekly) * Math.ceil((days(a.start, data.asOf) + 1) / 7));
    if (data.asOf >= a.end) return 100;
    return 100 * days(a.start, data.asOf) / days(a.start, a.end);
  }

  function update() {
    var overall = 0, exp = 0, shares = 0;
    data.activities.forEach(function (a) {
      var s = number(a.share);
      shares += s;
      overall += actual(a) * s / 100;
      exp += expected(a) * s / 100;
    });
    $('goal-overall').textContent = pct(overall);
    $('goal-expected').textContent = pct(exp);

    var diff = Math.round(overall) - Math.round(exp);
    var status = diff > 0 ? ['Ahead', 'positive'] : diff < -TOLERANCE ? ['Behind', 'negative'] : ['On Track', 'positive'];
    $('goal-status').textContent = status[0];
    $('goal-status').className = 'cai-badge cai-badge--' + status[1];

    $('goal-days').textContent = data.finish ? String(Math.max(0, days(data.asOf, data.finish))) : '—';

    var total = $('goal-share-total');
    total.textContent = Math.round(shares * 10) / 10 + '%';
    total.classList.toggle('goal-chip--bad', Math.abs(shares - 100) > 0.1);

    live.forEach(function (fn) { fn(); });
  }

  // A labelled-for-screen-readers input bound to obj[key].
  function field(obj, key, type, label, extra) {
    var props = { type: type, className: 'boq-input', 'aria-label': label };
    Object.keys(extra || {}).forEach(function (k) { props[k] = extra[k]; });
    var input = el('input', props);
    input.value = obj[key] === undefined ? '' : (type === 'number' && obj[key] !== '' ? Math.round(obj[key] * 100) / 100 : obj[key]);
    input.addEventListener('input', function () { obj[key] = input.value; update(); });
    return input;
  }

  function labelled(text, control) {
    return el('label', { className: 'goal-field' }, [el('span', { text: text }), control]);
  }

  function button(text, style, onClick) {
    var b = el('button', { type: 'button', className: 'cai-btn cai-btn--' + style, text: text });
    b.addEventListener('click', onClick);
    return b;
  }

  function select(options, current, label, onChange) {
    var s = el('select', { className: 'boq-input boq-select', 'aria-label': label });
    options.forEach(function (o) {
      var opt = el('option', { value: o[0], text: o[1] });
      if (o[0] === current) opt.selected = true;
      s.appendChild(opt);
    });
    s.addEventListener('change', function () { onChange(s.value); });
    return s;
  }

  function table(className, heads, rows) {
    var head = el('tr', null, heads.map(function (h) { return el('th', { scope: 'col', text: h }); }));
    return el('div', { className: 'goal-scroll' }, [
      el('table', { className: 'goal-table ' + className }, [el('thead', null, [head]), el('tbody', null, rows)])
    ]);
  }

  function cells(controls) {
    return el('tr', null, controls.map(function (c) { return el('td', null, [c]); }));
  }

  function taskRow(a, t) {
    var check = el('input', { type: 'checkbox', className: 'goal-check', 'aria-label': 'Done: ' + (t.name || 'new task') });
    check.checked = t.done;
    var date = field(t, 'completedOn', 'date', 'Completed on');
    date.disabled = !t.done;
    check.addEventListener('change', function () {
      t.done = check.checked;
      t.completedOn = t.done ? data.asOf : '';
      date.value = t.completedOn;
      date.disabled = !t.done;
      update();
    });
    return cells([
      check,
      field(t, 'name', 'text', 'Task', { placeholder: 'Task' }),
      el('div', { className: 'goal-pct' }, [field(t, 'weight', 'number', 'Weight percent', { min: 0, max: 100 }), el('span', { text: '%' })]),
      date,
      button('Remove', 'outline', function () { a.tasks.splice(a.tasks.indexOf(t), 1); render(); })
    ]);
  }

  function materialRow(a, m) {
    var names = [['', 'Material']].concat(data.materials.map(function (x) { return [x.name, x.name]; }));
    var units = [['', 'Unit']];
    data.materials.forEach(function (x) {
      if (!units.some(function (u) { return u[0] === x.unit; })) units.push([x.unit, x.unit]);
    });
    var unit = select(units, m.unit, 'Unit', function (v) { m.unit = v; });
    return cells([
      select(names, m.name, 'Material', function (v) {
        m.name = v;
        var match = data.materials.filter(function (x) { return x.name === v; })[0];
        m.unit = unit.value = match ? match.unit : '';
      }),
      field(m, 'qty', 'number', 'Estimated quantity', { min: 0, placeholder: 'Number' }),
      unit,
      button('Remove', 'outline', function () { a.materials.splice(a.materials.indexOf(m), 1); render(); })
    ]);
  }

  function card(a, i) {
    var title = el('span', { className: 'goal-card__name' });
    var range = el('span', { className: 'goal-chip' });
    var act = el('span', { className: 'goal-chip' });
    var exp = el('span', { className: 'goal-chip' });
    var warn = el('p', { className: 'goal-warning', role: 'status' });
    var head = el('button', { type: 'button', className: 'goal-card__head', 'aria-expanded': String(!!a.open) }, [
      title, range,
      el('span', { className: 'goal-card__metric goal-card__metric--first' }, [el('span', { text: 'Actual:' }), act]),
      el('span', { className: 'goal-card__metric' }, [el('span', { text: 'Expected Now:' }), exp]),
      el('span', { className: 'goal-card__toggle', 'aria-hidden': 'true', text: a.open ? '−' : '+' })
    ]);
    head.addEventListener('click', function () {
      a.open = !a.open;
      render();
      list.querySelectorAll('.goal-card__head')[i].focus();
    });

    live.push(function () {
      title.textContent = a.name || 'Untitled activity';
      range.textContent = showDate(a.start) + ' – ' + showDate(a.end);
      act.textContent = pct(actual(a));
      exp.textContent = pct(expected(a));
      var notes = [];
      if (Math.abs(weightTotal(a) - 100) > 0.1) notes.push('Task weights total ' + Math.round(weightTotal(a) * 10) / 10 + '%, not 100%.');
      if (a.start && a.end && a.end < a.start) notes.push('Target completion is before the start date.');
      warn.textContent = notes.join(' ');
    });

    var section = el('section', { className: 'goal-card' }, [head]);
    if (!a.open) return section;

    section.appendChild(el('div', { className: 'goal-card__fields' }, [
      labelled('Activity', field(a, 'name', 'text', 'Activity name')),
      labelled('Start', field(a, 'start', 'date', 'Activity start')),
      labelled('Target Completion', field(a, 'end', 'date', 'Target completion')),
      labelled('Weekly Target %', field(a, 'weekly', 'number', 'Weekly target percent', { min: 0, max: 100, placeholder: '__%' })),
      labelled('Share of Project %', field(a, 'share', 'number', 'Share of project percent', { min: 0, max: 100, placeholder: '__%' }))
    ]));
    section.appendChild(table('goal-table--tasks', ['Done', 'Task', 'Weight', 'Completed on', ''],
      a.tasks.map(function (t) { return taskRow(a, t); })));
    section.appendChild(warn);
    section.appendChild(el('h2', { className: 'goal-card__subtitle', text: 'Estimated materials ' }, []));
    section.lastChild.appendChild(el('span', { text: '(from the approved BOQ/BOM)' }));
    section.appendChild(table('goal-table--materials', ['Material', 'Estimated Qty', 'Unit', ''],
      a.materials.map(function (m) { return materialRow(a, m); })));
    section.appendChild(el('div', { className: 'goal-card__actions' }, [
      button('+ Add Task', 'primary', function () {
        a.tasks.push({ name: '', weight: 0, done: false, completedOn: '' });
        render();
      }),
      button('+ Add Material', 'primary', function () {
        a.materials.push({ name: '', qty: '', unit: '' });
        render();
      }),
      button('Remove Activity', 'outline goal-danger', function () {
        if (!window.confirm('Remove "' + (a.name || 'Untitled activity') + '"?')) return;
        data.activities.splice(data.activities.indexOf(a), 1);
        render();
      })
    ]));
    return section;
  }

  function render() {
    live = [];
    list.textContent = '';
    data.activities.forEach(function (a, i) { list.appendChild(card(a, i)); });
    update();
  }

  ['start', 'finish'].forEach(function (key) {
    var input = $('goal-' + key);
    input.value = data[key];
    input.addEventListener('input', function () { data[key] = input.value; update(); });
  });

  $('goal-add').addEventListener('click', function () {
    data.activities.push({ name: 'New activity', start: '', end: '', share: 0, open: true, tasks: [], materials: [] });
    render();
    list.lastChild.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  // Splits 100% evenly; the last activity absorbs any rounding remainder.
  $('goal-equal').addEventListener('click', function () {
    var n = data.activities.length;
    var each = Math.floor(10000 / n) / 100;
    data.activities.forEach(function (a, i) {
      a.share = i === n - 1 ? Math.round((100 - each * (n - 1)) * 100) / 100 : each;
    });
    render();
  });

  render();
})();
