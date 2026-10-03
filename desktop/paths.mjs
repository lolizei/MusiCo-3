import path from 'node:path';

/** Limit the desktop protocol to packaged web assets. */
export function assetPath(root, address) {
  try {
    const url = new URL(address);
    if (url.protocol !== 'beat:' || url.host !== 'app') return null;
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.includes('\\') || pathname.includes('\0')) return null;
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    const relative = path.relative(root, file);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? file : null;
  } catch { return null; }
}

export function isAppAddress(address) {
  try { const url = new URL(address); return url.protocol === 'beat:' && url.host === 'app'; }
  catch { return false; }
}
