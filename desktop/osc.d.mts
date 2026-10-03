import type { Buffer } from 'node:buffer';
export function encodeOsc(address: string, args?: (string | number)[]): Buffer;
export function decodeOsc(packet: Buffer): { address: string; args: (string | number)[] };
