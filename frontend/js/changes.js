/* ==========================================================================
   Carl's Angels Inventory Management — Site page: Change Orders
   Data comes from window.CAI_CHANGES. Prototype only: nothing is saved.

   Rules:
     - Cost Impact   = Qty x Unit Cost
     - Contract now  = original contract + total of Approved change orders
     - A change order is view-only until "Edit" is clicked. "Done" leaves
       edit mode only when every number in it is valid.
   ========================================================================== */
(function () {
  'use strict';

  var data = window.CAI_CHANGES;
  var list = document.getElementById('co-list');
  if (!data || !list) return;

  function $(id) { return document.getElementById(id); }

  function el(tag, className, text, kids) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== '') node.textContent = text;
    (kids || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  // Accepts "1,200" or 1200; blank, negative or non-numeric is NaN.
  function num(v) {
    var s = String(v).replace(/,/g, '').trim();
    return /^(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : NaN;
  }

  function fmt(n) { return n.toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function peso(n) { return '₱' + fmt(n); }
  function impact(item) { return (num(item.qty) || 0) * (num(item.cost) || 0); }
  function total(order) { return order.items.reduce(function (a, it) { return a + impact(it); }, 0); }

  function updateStats() {
    function withDecision(d) { return data.orders.filter(function (o) { return o.decision === d; }); }
    var approved = withDecision('Approved').reduce(function (a, o) { return a + total(o); }, 0);
    $('co-pending').textContent = withDecision('Pending').length;
    $('co-approved').textContent = peso(approved);
    $('co-rejected').textContent = withDecision('Rejected').length;
    $('co-contract').textContent = peso(data.contract + approved);
  }

  function button(text, className, onClick) {
    var b = el('button', 'cai-btn ' + className, text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function input(obj, key, label, isNumber, onChange) {
    var i = el('input', 'boq-input');
    i.type = 'text';
    if (isNumber) i.inputMode = 'decimal';
    i.setAttribute('aria-label', label);
    i.value = obj[key];
    function check() {
      if (isNumber) i.classList.toggle('boq-input--error', isNaN(num(i.value)));
    }
    i.addEventListener('input', function () {
      obj[key] = i.value;
      check();
      onChange();
    });
    check();
    return i;
  }

  function card(order, index) {
    var title = 'Change Order ' + (index + 1);
    var editing = !!order.editing;
    var section = el('section', 'co-card');
    var totalValue = el('span');

    function refresh() {
      totalValue.textContent = peso(total(order));
      updateStats();
    }

    var decision = el('select', 'co-decision__select');
    ['Pending', 'Approved', 'Rejected'].forEach(function (d) {
      var o = el('option', '', d);
      o.selected = d === order.decision;
      decision.appendChild(o);
    });
    decision.addEventListener('change', function () {
      order.decision = decision.value;
      updateStats();
    });

    section.appendChild(el('div', 'co-card__top', '', [
      el('h2', 'co-card__title', title),
      el('label', 'co-decision', 'Decision', [decision])
    ]));

    var description;
    if (editing) {
      description = input(order, 'description', 'Change description', false, function () {});
    } else {
      description = el('p', 'co-description__text', order.description || '—');
    }
    section.appendChild(el('div', 'co-card__mid', '', [
      el('div', 'co-description', '', [el('h3', '', 'Change Description'), description]),
      button(editing ? 'Done' : 'Edit', 'cai-btn--primary co-edit', function () {
        var bad = section.querySelector('.boq-input--error');
        if (editing && bad) { bad.focus(); return; }
        order.editing = !editing;
        render();
        list.children[index].querySelector(order.editing ? 'input' : '.co-edit').focus();
      })
    ]));

    var heads = ['Item', 'Unit', 'Qty', 'Unit Cost', 'Cost Impact'];
    if (editing) heads.push('');
    var head = el('tr', '', '', heads.map(function (h) { return el('th', '', h); }));

    var rows = order.items.map(function (item) {
      var cost = el('td', '', peso(impact(item)));
      var cells = [['name', 'Item'], ['unit', 'Unit'], ['qty', 'Qty', true], ['cost', 'Unit cost', true]].map(function (c) {
        if (!editing) return el('td', '', c[2] ? fmt(num(item[c[0]]) || 0) : item[c[0]] || '—');
        return el('td', '', '', [input(item, c[0], c[1], c[2], function () {
          cost.textContent = peso(impact(item));
          refresh();
        })]);
      });
      cells.push(cost);
      if (editing) {
        cells.push(el('td', '', '', [button('Remove', 'cai-btn--outline', function () {
          order.items.splice(order.items.indexOf(item), 1);
          render();
        })]));
      }
      return el('tr', '', '', cells);
    });

    section.appendChild(el('div', 'co-scroll', '', [
      el('table', 'co-table', '', [el('thead', '', '', [head]), el('tbody', '', '', rows)])
    ]));

    var bottom = el('div', 'co-card__bottom', '', []);
    if (editing) {
      bottom.appendChild(button('+ Add Item', 'cai-btn--primary', function () {
        order.items.push({ name: '', unit: '', qty: 1, cost: 0 });
        render();
        var names = list.children[index].querySelectorAll('input[aria-label="Item"]');
        names[names.length - 1].focus();
      }));
    }
    bottom.appendChild(el('p', 'co-total', '', [el('span', '', 'Total Cost Impact:'), totalValue]));
    section.appendChild(bottom);

    section.appendChild(button('Remove Change Order', 'cai-btn--outline co-danger', function () {
      if (!window.confirm('Remove ' + title + '?')) return;
      data.orders.splice(data.orders.indexOf(order), 1);
      render();
    }));

    totalValue.textContent = peso(total(order));
    return section;
  }

  function render() {
    list.textContent = '';
    data.orders.forEach(function (o, i) { list.appendChild(card(o, i)); });
    updateStats();
  }

  $('co-new').addEventListener('click', function () {
    data.orders.push({ description: '', decision: 'Pending', editing: true, items: [{ name: '', unit: '', qty: 1, cost: 0 }] });
    render();
    list.lastChild.scrollIntoView({ block: 'start', behavior: 'smooth' });
    list.lastChild.querySelector('input').focus({ preventScroll: true });
  });

  render();
})();
