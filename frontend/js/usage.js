/* ==========================================================================
   Carl's Angels Inventory Management — Site page: Usage vs Progress
   View-only. Data comes from window.CAI_USAGE.

   Rules (same as Project Goals):
     - Each sub-goal is an equal part of its goal
     - Percentage done  = total of the done sub-goals' parts
     - Overall Progress = each goal's % weighted by its share of the project
     - Consumption      = Actual / Expected (bar turns red above 100%)
   ========================================================================== */
(function () {
  'use strict';

  var data = window.CAI_USAGE;
  var list = document.getElementById('use-list');
  if (!data || !list) return;

  var TOLERANCE = 5;

  function el(tag, className, text, kids) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    (kids || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  function done(goal) {
    return 100 * goal.subgoals.filter(function (s) { return s[1]; }).length / goal.subgoals.length;
  }

  function pill(label, value) {
    return el('span', 'use-pill', '', [el('span', '', label), el('strong', '', Math.round(value) + '%')]);
  }

  function materialTable(materials) {
    if (!materials.length) return el('p', 'use-empty', 'No materials assigned to this sub-goal.');

    var head = el('tr', '', '', ['Material Name', 'Expected Total Consumption', 'Actual Total Consumption', 'Consumption'].map(function (h) {
      var th = el('th', '', h);
      th.scope = 'col';
      return th;
    }));

    var rows = materials.map(function (m) {
      var pct = m[2] > 0 ? m[3] / m[2] * 100 : 0;
      var fill = el('div', 'cai-progress__fill');
      fill.style.width = Math.min(pct, 100) + '%';
      var bar = el('div', 'use-usage' + (pct > 100 ? ' use-usage--over' : ''), '', [
        el('div', 'cai-progress', '', [fill]),
        el('span', '', Math.round(pct) + '%')
      ]);
      return el('tr', '', '', [
        el('td', '', m[0]),
        el('td', '', m[2].toLocaleString('en-US') + ' ' + m[1]),
        el('td', '', m[3].toLocaleString('en-US') + ' ' + m[1]),
        el('td', '', '', [bar])
      ]);
    });

    return el('div', 'goal-scroll', '', [
      el('table', 'use-table', '', [el('thead', '', '', [head]), el('tbody', '', '', rows)])
    ]);
  }

  function card(goal) {
    var toggle = el('span', 'goal-card__toggle');
    var head = el('button', 'goal-card__head', '', [
      el('span', 'goal-card__name', goal.name),
      el('span', 'goal-card__metric goal-card__metric--first', '', [pill('Percentage done', done(goal))]),
      toggle
    ]);
    head.type = 'button';

    var part = 100 / goal.subgoals.length;
    var body = el('div', 'use-body', '', goal.subgoals.map(function (s) {
      return el('div', 'use-sub', '', [
        el('div', 'use-sub__head', '', [
          el('h2', 'use-sub__name', s[0]),
          pill('Overall percentage for goal', part),
          pill('Current percentage', s[1] ? part : 0)
        ]),
        materialTable(s[2])
      ]);
    }));

    function show() {
      body.hidden = !goal.open;
      toggle.textContent = goal.open ? '−' : '+';
      head.setAttribute('aria-expanded', String(!!goal.open));
    }
    head.addEventListener('click', function () { goal.open = !goal.open; show(); });
    show();

    return el('section', 'goal-card', '', [head, body]);
  }

  var overall = Math.round(data.goals.reduce(function (sum, g) { return sum + done(g) * g.share / 100; }, 0));
  var diff = overall - data.expected;
  var status = diff > 0 ? ['Ahead', 'positive'] : diff < -TOLERANCE ? ['Behind', 'negative'] : ['On Track', 'positive'];

  document.getElementById('use-overall').textContent = overall + '%';
  var badge = document.getElementById('use-status');
  badge.textContent = status[0];
  badge.className = 'cai-badge cai-badge--' + status[1];

  data.goals.forEach(function (g) { list.appendChild(card(g)); });
})();
