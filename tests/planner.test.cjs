const { test } = require('node:test');
const assert = require('node:assert/strict');
const { plan, blockSize } = require('../planner.js');
const { parseIP } = require('../ipv4.js');
const rows = hosts => hosts.map((hosts, i) => ({ name: `Subnet ${i + 1}`, hosts }));
test('smallest fitting blocks and impossible counts', () => {
  assert.deepEqual([1, 2, 6, 7].map(blockSize), [4, 4, 8, 16]);
  for (const value of ['', 0, -1, 1.5, '2e3', '01', Infinity, 4294967295]) assert.throws(() => blockSize(value));
  assert.equal(blockSize(4294967294), 4294967296);
});
test('normalized /24, largest first, original display order and stable ties', () => {
  const result = plan('192.168.0.123/24', rows([12, 60, 25, 25]));
  assert.equal(result.parent.cidr, '192.168.0.0/24');
  assert.deepEqual(result.allocations.map(a => a.cidr), ['192.168.0.128/28', '192.168.0.0/26', '192.168.0.64/27', '192.168.0.96/27']);
  assert.deepEqual(result.allocations.map(a => a.order), [4, 1, 2, 3]);
  assert.equal(result.allocations[0].unused, 2);
  assert.deepEqual(result.free.map(b => b.cidr), ['192.168.0.144/28', '192.168.0.160/27', '192.168.0.192/26']);
});
test('full capacity, insufficient parents and input preservation', () => {
  assert.deepEqual(plan('255.255.255.255/30', rows([2])).free, []);
  const input = rows([60, 60]);
  const before = structuredClone(input);
  assert.throws(() => plan('10.0.0.0/26', input), /exceed parent capacity/);
  assert.deepEqual(input, before);
  for (const prefix of [31, 32]) assert.throws(() => plan(`10.0.0.0/${prefix}`, rows([1])), /capacity/);
  const all = plan('255.255.255.255/0', rows([4294967294]));
  assert.equal(all.assigned, 4294967296);
  assert.equal(all.allocations[0].last, '255.255.255.254');
});
test('invalid parent and empty or invalid rows', () => {
  for (const parent of ['1.2.3.4', '01.2.3.4/24', '256.0.0.0/24', '1.2.3.4/33', '1.2.3.4/-1', '1.2.3.4/255.0.255.0']) assert.throws(() => plan(parent, rows([1])));
  for (const input of [[], [{}], [{ name: '', hosts: 2 }], [{ name: 'a', hosts: '' }]]) assert.throws(() => plan('0.0.0.0/0', input));
});
test('alignment, containment, nonoverlap, free accounting and determinism across prefixes', () => {
  for (let prefix = 0; prefix <= 30; prefix++) {
    const input = rows(prefix <= 24 ? [7, 1, 6, 25, 6] : [1]);
    const result = plan(`203.0.113.255/${prefix}`, input);
    assert.deepEqual(plan(`203.0.113.255/${prefix}`, input), result);
    const start = parseIP(result.parent.network);
    const blocks = [...result.allocations, ...result.free].map(block => ({ start: parseIP(block.cidr.split('/')[0]), size: block.total })).sort((a, b) => a.start - b.start);
    let cursor = start;
    for (const block of blocks) {
      assert.equal(block.start, cursor);
      assert.equal(block.start % block.size, 0);
      cursor += block.size;
    }
    assert.equal(cursor, start + result.total);
    assert.equal(result.free.reduce((sum, block) => sum + block.total, 0), result.remaining);
    assert.ok(result.allocations.every(a => a.prefix <= 30 && a.usable >= a.hosts));
  }
});
