(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fmt = value => value.toLocaleString('en-US');
  let nextId = 0;
  let calculated = false;
  function changed() {
    $('example').hidden = true;
    $('error').hidden = true;
    document.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
    if (calculated) {
      $('status').textContent = 'INPUT CHANGED · RECALCULATE';
      $('results').hidden = true;
      $('empty').hidden = false;
      $('empty').querySelector('p').textContent = 'Requirements have changed. Choose Plan subnets to update your plan.';
      $('announcement').textContent = 'Input changed. Recalculate to see current results.';
    }
  }
  function addRow(name, hosts, focus = false) {
    const id = ++nextId;
    const row = document.createElement('div');
    row.className = 'requirement';
    for (const [key, label, value] of [['name', 'Subnet name', name], ['hosts', 'Usable hosts needed', hosts]]) {
      const wrapper = document.createElement('div');
      const caption = document.createElement('label');
      caption.htmlFor = `${key}-${id}`;
      caption.textContent = label;
      const input = document.createElement('input');
      input.id = caption.htmlFor;
      input.dataset.field = key;
      input.value = value;
      input.autocomplete = 'off';
      input.setAttribute('aria-describedby', 'hosts-help error');
      if (key === 'hosts') input.inputMode = 'numeric';
      wrapper.append(caption, input);
      row.append(wrapper);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary remove';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove subnet row ${id}`);
    remove.addEventListener('click', () => { row.remove(); changed(); $('add').focus(); });
    row.append(remove);
    $('rows').append(row);
    if (focus) row.querySelector('input').focus();
  }
  function show(result) {
    $('cidr').textContent = result.parent.cidr;
    $('normalization').textContent = `Entered: ${$('parent').value.trim()} → network: ${result.parent.cidr}`;
    const percent = result.assigned / result.total * 100;
    $('utilization').textContent = `${Number(percent.toFixed(2))}% assigned`;
    $('usage').value = percent;
    for (const key of ['total', 'assigned', 'remaining']) $(key).textContent = fmt(result[key]);
    $('count').textContent = fmt(result.allocations.length);
    $('allocations').replaceChildren();
    for (const allocation of result.allocations) {
      const row = document.createElement('tr');
      for (const key of ['name', 'order', 'hosts', 'cidr', 'mask', 'network', 'first', 'last', 'broadcast', 'total', 'usable', 'unused']) {
        const cell = document.createElement(key === 'name' ? 'th' : 'td');
        if (key === 'name') cell.scope = 'row';
        cell.textContent = typeof allocation[key] === 'number' ? fmt(allocation[key]) : allocation[key];
        row.append(cell);
      }
      $('allocations').append(row);
    }
    $('free').replaceChildren();
    for (const block of result.free) {
      const row = document.createElement('div');
      row.className = 'free-range';
      const cidr = document.createElement('code');
      cidr.textContent = block.cidr;
      const capacity = document.createElement('span');
      capacity.textContent = `${fmt(block.total)} addresses · ${fmt(block.usable)} usable`;
      row.append(cidr, capacity);
      $('free').append(row);
    }
    if (!result.free.length) $('free').textContent = 'No address space remaining';
    $('empty').hidden = true;
    $('results').hidden = false;
    $('status').textContent = 'CALCULATED';
    $('announcement').textContent = `Plan calculated. ${result.allocations.length} subnets assigned; ${fmt(result.remaining)} addresses remaining.`;
  }
  $('planner').addEventListener('input', changed);
  $('add').addEventListener('click', () => { changed(); addRow(`Subnet ${nextId + 1}`, '', true); });
  $('planner').addEventListener('submit', event => {
    event.preventDefault();
    $('error').hidden = true;
    document.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
    const rows = [...$('rows').children];
    const values = rows.map(row => ({ name: row.querySelector('[data-field="name"]').value, hosts: row.querySelector('[data-field="hosts"]').value }));
    try {
      show(SubnetPlanner.plan($('parent').value, values));
      calculated = true;
    } catch (error) {
      $('results').hidden = true;
      $('empty').hidden = false;
      $('empty').querySelector('p').textContent = 'Adjust your requirements and recalculate. No current plan is available.';
      $('status').textContent = 'CHECK INPUT';
      $('error').textContent = error.message;
      $('error').hidden = false;
      let field;
      if (error.field === 'parent') field = $('parent');
      else if (/^(name|hosts)-\d+$/.test(error.field)) {
        const [key, index] = error.field.split('-');
        field = rows[Number(index)].querySelector(`[data-field="${key}"]`);
      }
      if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
    }
  });
  addRow('Office', 60);
  addRow('Guest Wi-Fi', 25);
  addRow('Infrastructure', 12);
})();
