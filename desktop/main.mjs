import { app, BrowserWindow, dialog, net, protocol, session } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { assetPath, isAppAddress } from './paths.mjs';
import { setupSonicPi } from './sonic-pi-ipc.mjs';

const origin = 'beat://app';
const assets = path.join(import.meta.dirname, '..', 'dist');
// Test runs use isolated temporary data, never the user's music/projects.
const profile = process.env.BEAT_TEST_USER_DATA ?? path.join(app.getPath('appData'), 'MusiCo-3');
mkdirSync(profile, {recursive:true});
app.setPath('userData', profile);
app.setName('MusiCo-3');
app.setAppUserModelId('io.github.lolizei.musico3');
protocol.registerSchemesAsPrivileged([{ scheme: 'beat', privileges: {
  standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true,
} }]);

let window;
let sonicPi;
let quitting = false;
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
else {
  app.on('second-instance', () => { if (window?.isMinimized()) window.restore(); window?.focus(); });
  app.whenReady().then(async () => {
    protocol.handle('beat', async request => {
      const file = assetPath(assets, request.url);
      if (!file || !['GET', 'HEAD'].includes(request.method)) return new Response('Forbidden', {status:403});
      try {
        const response = await net.fetch(pathToFileURL(file).href);
        // Strudel evaluates user code and creates blob audio worklets. These
        // allowances stay in the sandboxed renderer. Native Ruby requires an
        // explicit Sonic Pi connection through the narrow desktop bridge.
        const headers = new Headers(response.headers);
        headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https:; media-src 'self' https: blob:; object-src 'none'; base-uri 'self'; frame-src 'none'");
        headers.set('X-Content-Type-Options', 'nosniff');
        return new Response(response.body, {status:response.status, headers});
      } catch { return new Response('Not found', {status:404}); }
    });
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    window = new BrowserWindow({
      title: 'MusiCo-3 — BEAT.EXE', width:1280, height:850, minWidth:360, minHeight:500,
      backgroundColor:'#090B12', autoHideMenuBar:true, show:false,
      webPreferences:{sandbox:true, contextIsolation:true, nodeIntegration:false, webSecurity:true, preload:path.join(import.meta.dirname, 'preload.cjs')},
    });
    window.removeMenu();
    sonicPi = setupSonicPi(() => window, profile);
    window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
    window.webContents.on('will-navigate', (event, address) => { if (!isAppAddress(address)) event.preventDefault(); });
    window.webContents.on('will-attach-webview', event => event.preventDefault());
    window.once('ready-to-show', () => window.show());
    window.on('closed', () => { window = null; });
    await window.loadURL(`${origin}/index.html`);
  }).catch(error => { dialog.showErrorBox('MusiCo-3 could not start', error.message); app.quit(); });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', event => {
    if (quitting || !sonicPi?.child) return;
    event.preventDefault(); quitting = true;
    sonicPi.close().finally(() => app.quit());
  });
}
