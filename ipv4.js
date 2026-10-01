(function (root) {
  'use strict';
  function parseIP(value) {
    const parts = value.trim().split('.');
    if (parts.length !== 4 || parts.some(p => !/^(0|[1-9]\d{0,2})$/.test(p) || Number(p) > 255)) {
      throw new Error('Enter four decimal octets from 0 to 255, without leading zeros (for example, 192.168.0.10).');
    }
    return parts.reduce((value, part) => value * 256 + Number(part), 0);
  }
  const dotted = value => [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');
  const binary = value => dotted(value).split('.').map(octet => Number(octet).toString(2).padStart(8, '0')).join(' ');
  function parsePrefix(value) {
    const cleaned = value.trim();
    if (/^\/?\d{1,2}$/.test(cleaned) && Number(cleaned.replace('/', '')) <= 32) return Number(cleaned.replace('/', ''));
    if (cleaned.includes('.')) {
      const bits = parseIP(cleaned).toString(2).padStart(32, '0');
      if (/^1*0*$/.test(bits)) return bits.indexOf('0') === -1 ? 32 : bits.indexOf('0');
      throw new Error('Subnet masks must contain consecutive 1 bits followed by 0 bits (for example, 255.255.255.0).');
    }
    throw new Error('Enter a prefix from /0 to /32 or a contiguous dotted-decimal subnet mask.');
  }
  const superscript = value => String(value).replace(/\d/g, digit => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)]);
  function calculate(address, subnet, parent = '') {
    const parts = address.trim().split('/');
    if (parts.length > 2) throw new Error('Use a single slash for CIDR notation, for example 192.168.0.10/24.');
    const ip = parseIP(parts[0]);
    if (parts.length === 2 && !/^\d{1,2}$/.test(parts[1])) throw new Error('The address CIDR suffix must be a prefix from 0 to 32.');
    const prefix = parsePrefix(parts.length === 2 ? parts[1] : subnet);
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const network = (ip & mask) >>> 0;
    const total = 2 ** (32 - prefix);
    const last = network + total - 1;
    const usable = prefix >= 31 ? total : total - 2;
    let parentPrefix = null;
    if (parent.trim()) {
      if (!/^\/?\d{1,2}$/.test(parent.trim())) throw new Error('Enter a parent prefix from /0 to /32.');
      parentPrefix = parsePrefix(parent);
      if (parentPrefix > prefix) throw new Error('The parent prefix must be less than or equal to the subnet prefix. For a /25 subnet, try parent /24.');
    }
    const subnetBits = parentPrefix === null ? null : prefix - parentPrefix;
    const subnetworks = subnetBits === null ? null : 2 ** subnetBits;
    const format = value => value.toLocaleString('en-US');
    return {
      subnetCalculation: subnetBits === null ? 'Enter a parent prefix to calculate' : `${subnetBits} borrowed · 2${superscript(subnetBits)} = ${format(subnetworks)}`,
      hostCalculation: `${32 - prefix} bits · 2${superscript(32 - prefix)} = ${format(total)}${prefix < 31 ? ` − 2 = ${format(usable)} usable` : ` usable (${prefix === 31 ? 'point-to-point' : 'host route'})`}`,
      subnetworks: subnetworks === null ? 'Enter a parent prefix to calculate' : `${format(subnetworks)} (/${prefix} networks within /${parentPrefix})`,
      ip: dotted(ip), prefix, hostBits: 32 - prefix, mask: dotted(mask), network: dotted(network),
      cidr: `${dotted(network)}/${prefix}`, broadcast: prefix >= 31 ? 'Not applicable' : dotted(last),
      ipBinary: binary(ip), maskBinary: binary(mask), networkBinary: binary(network),
      hex: '0x' + ip.toString(16).toUpperCase().padStart(8, '0'), decimal: String(ip), wildcard: dotted((~mask) >>> 0),
      range: prefix === 32 ? dotted(ip) : `${dotted(network + (prefix < 31 ? 1 : 0))} – ${dotted(last - (prefix < 31 ? 1 : 0))}`,
      counts: `${total.toLocaleString('en-US')} / ${usable.toLocaleString('en-US')}`,
      note: prefix === 31 ? '/31 uses point-to-point semantics: both addresses are usable, with no broadcast address.' : prefix === 32 ? '/32 identifies a single host route, with no broadcast address.' : 'Usable addresses exclude the network and broadcast addresses. This calculation does not check whether addresses are assigned or reachable.'
    };
  }
  const api = { parseIP, parsePrefix, calculate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.IPv4 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
