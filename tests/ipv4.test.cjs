const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculate, parseIP, parsePrefix } = require('../ipv4.js');
test('screenshot example: /25 subnets in a /24 parent', () => {
  const result = calculate('192.168.0.10', '/25', '/24');
  assert.equal(result.subnetCalculation, '1 borrowed · 2¹ = 2');
  assert.equal(result.hostCalculation, '7 bits · 2⁷ = 128 − 2 = 126 usable');
  assert.equal(result.subnetworks, '2 (/25 networks within /24)');
});
test('parent prefix validation, optional parent, and boundary formulas', () => {
  assert.throws(() => calculate('192.0.2.1', '/24', '/25'));
  assert.throws(() => calculate('192.0.2.1', '/24', '/33'));
  assert.throws(() => calculate('192.0.2.1', '/24', '255.255.0.0'));
  assert.equal(calculate('192.0.2.1', '/24').subnetworks, 'Enter a parent prefix to calculate');
  assert.equal(calculate('192.0.2.1', '/24', '/24').subnetCalculation, '0 borrowed · 2⁰ = 1');
  assert.equal(calculate('192.0.2.1', '/31', '/0').hostCalculation, '1 bits · 2¹ = 2 usable (point-to-point)');
  assert.equal(calculate('192.0.2.1', '/32', '/0').subnetworks, '4,294,967,296 (/32 networks within /0)');
  assert.equal(calculate('192.0.2.1', '/32').hostCalculation, '0 bits · 2⁰ = 1 usable (host route)');
});
test('example network and conversions', () => {
  const result = calculate('192.168.0.10', '/24');
  assert.equal(result.cidr, '192.168.0.0/24');
  assert.equal(result.mask, '255.255.255.0');
  assert.equal(result.broadcast, '192.168.0.255');
  assert.equal(result.hex, '0xC0A8000A');
  assert.equal(result.decimal, '3232235530');
  assert.equal(result.ipBinary, '11000000 10101000 00000000 00001010');
  assert.equal(result.networkBinary, '11000000 10101000 00000000 00000000');
});
test('non-octet boundary mask and CIDR override', () => {
  assert.equal(calculate('172.16.31.200', '255.255.240.0').cidr, '172.16.16.0/20');
  assert.equal(calculate('10.5.6.7/8', '/24').cidr, '10.0.0.0/8');
});
test('unsigned limits and /0', () => {
  const result = calculate('255.255.255.255', '/0');
  assert.equal(result.cidr, '0.0.0.0/0');
  assert.equal(result.broadcast, '255.255.255.255');
  assert.equal(result.counts, '4,294,967,296 / 4,294,967,294');
  assert.equal(calculate('255.255.255.255', '/32').decimal, '4294967295');
});
test('point-to-point and single-host prefixes', () => {
  const pair = calculate('192.0.2.11', '/31');
  assert.equal(pair.range, '192.0.2.10 – 192.0.2.11');
  assert.equal(pair.counts, '2 / 2');
  assert.equal(pair.broadcast, 'Not applicable');
  const host = calculate('192.0.2.11', '/32');
  assert.equal(host.range, '192.0.2.11');
  assert.equal(host.counts, '1 / 1');
});
test('reject malformed addresses and masks', () => {
  for (const ip of ['256.1.1.1','1.2.3','1.2.3.4.5','01.2.3.4','-1.2.3.4','1e1.2.3.4','']) assert.throws(() => parseIP(ip));
  for (const mask of ['/33','/-1','','255.0.255.0','255.255.255.1','24junk']) assert.throws(() => parsePrefix(mask));
  for (const ip of ['1.2.3.4/','1.2.3.4/24/2','1.2.3.4/33']) assert.throws(() => calculate(ip, '/24'));
});
test('all prefix lengths round-trip through dotted masks', () => {
  for (let prefix = 0; prefix <= 32; prefix++) {
    const result = calculate('203.0.113.173', String(prefix));
    assert.equal(parsePrefix(result.mask), prefix);
    assert.equal(parseIP(result.network) % 2 ** (32 - prefix), 0);
  }
});
