import { Buffer } from 'node:buffer';

function text(value) {
  if (value.includes('\0')) throw new Error('OSC strings cannot contain NUL');
  const bytes = Buffer.from(value, 'utf8');
  const result = Buffer.alloc(Math.ceil((bytes.length + 1) / 4) * 4);
  bytes.copy(result); return result;
}

export function encodeOsc(address, args = []) {
  if (!address.startsWith('/')) throw new Error('Invalid OSC address');
  const tags = args.map(arg => typeof arg === 'string' ? 's' : Number.isInteger(arg) ? 'i' : 'f');
  const values = args.map((arg, index) => {
    if (tags[index] === 's') return text(arg);
    if (!Number.isFinite(arg)) throw new Error('Invalid OSC number');
    const bytes = Buffer.alloc(4);
    if (tags[index] === 'i') bytes.writeInt32BE(arg); else bytes.writeFloatBE(arg);
    return bytes;
  });
  const packet = Buffer.concat([text(address), text(',' + tags.join('')), ...values]);
  if (packet.length > 60000) throw new Error('Code is too large for Sonic Pi OSC (maximum 60 KB)');
  return packet;
}

export function decodeOsc(packet) {
  let offset = 0;
  const string = () => {
    const end = packet.indexOf(0, offset);
    if (end < 0) throw new Error('Truncated OSC string');
    const value = packet.toString('utf8', offset, end);
    offset = Math.ceil((end + 1) / 4) * 4;
    if (offset > packet.length) throw new Error('Truncated OSC padding');
    return value;
  };
  const address = string();
  if (!address.startsWith('/')) throw new Error('Unsupported OSC packet');
  const tags = string();
  if (!tags.startsWith(',')) throw new Error('Missing OSC type tags');
  const args = [];
  for (const type of tags.slice(1)) {
    if (type === 's') args.push(string());
    else if (type === 'i' || type === 'f') {
      if (offset + 4 > packet.length) throw new Error('Truncated OSC argument');
      args.push(type === 'i' ? packet.readInt32BE(offset) : packet.readFloatBE(offset)); offset += 4;
    } else throw new Error(`Unsupported OSC argument: ${type}`);
  }
  if (offset !== packet.length) throw new Error('Unexpected OSC trailing data');
  return { address, args };
}
