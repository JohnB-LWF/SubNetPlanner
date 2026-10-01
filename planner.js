(function (root) {
  'use strict';
  const ip = typeof module !== 'undefined' && module.exports ? require('./ipv4.js') : root.IPv4;
  class PlanError extends Error {
    constructor(message, field) { super(message); this.field = field; }
  }
  function blockSize(hosts) {
    if (!/^[1-9]\d*$/.test(String(hosts)) || !Number.isSafeInteger(Number(hosts)) || Number(hosts) > 4294967294) {
      throw new Error('Enter a whole usable-host count from 1 to 4,294,967,294.');
    }
    return 2 ** Math.ceil(Math.log2(Number(hosts) + 2));
  }
  function plan(parentText, rows) {
    let parent;
    try {
      if (typeof parentText !== 'string' || parentText.trim().split('/').length !== 2) throw new Error('Enter a parent network in CIDR notation, such as 192.168.0.0/24.');
      parent = ip.calculate(parentText, '');
    } catch (error) { throw new PlanError(error.message, 'parent'); }
    if (!Array.isArray(rows) || !rows.length) throw new PlanError('Add at least one subnet requirement.', 'rows');
    const requests = rows.map((row, index) => {
      if (!row || typeof row.name !== 'string' || !row.name.trim()) throw new PlanError(`Subnet ${index + 1}: enter a name.`, `name-${index}`);
      let size;
      try { size = blockSize(row.hosts); } catch (error) { throw new PlanError(`Subnet ${index + 1}: ${error.message}`, `hosts-${index}`); }
      return { name: row.name.trim(), hosts: Number(row.hosts), size, index };
    });
    const total = 2 ** (32 - parent.prefix);
    const assigned = requests.reduce((sum, row) => sum + row.size, 0);
    if (assigned > total) throw new PlanError(`Requirements exceed parent capacity: the requested subnets need ${assigned.toLocaleString('en-US')} addresses including network/broadcast reservations and block rounding; ${parent.cidr} contains ${total.toLocaleString('en-US')}. Reduce host counts, remove a subnet, or use a larger parent network.`, 'rows');
    let cursor = ip.parseIP(parent.network);
    const end = cursor + total;
    const allocations = requests.slice().sort((a, b) => b.hosts - a.hosts || a.index - b.index).map((row, order) => {
      cursor = Math.ceil(cursor / row.size) * row.size;
      const details = ip.calculate(`${dotted(cursor)}/${32 - Math.log2(row.size)}`, '');
      const result = { ...row, ...details, order: order + 1, first: dotted(cursor + 1), last: dotted(cursor + row.size - 2), total: row.size, usable: row.size - 2, unused: row.size - 2 - row.hosts };
      cursor += row.size;
      return result;
    }).sort((a, b) => a.index - b.index);
    const free = [];
    while (cursor < end) {
      let size = 1;
      while (size * 2 <= end - cursor && cursor % (size * 2) === 0) size *= 2;
      const prefix = 32 - Math.log2(size);
      free.push({ cidr: `${dotted(cursor)}/${prefix}`, total: size, usable: prefix >= 31 ? size : size - 2 });
      cursor += size;
    }
    return { parent, allocations, free, total, assigned, remaining: total - assigned };
  }
  function dotted(value) { return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.'); }
  const api = { plan, blockSize, PlanError };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SubnetPlanner = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
