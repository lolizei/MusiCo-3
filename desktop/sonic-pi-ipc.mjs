import { ipcMain, dialog } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SonicPiBridge, inspectSonicPi } from './sonic-pi.mjs';
import { isAppAddress } from './paths.mjs';

export function setupSonicPi(getWindow, profile) {
  const config = path.join(profile, 'sonic-pi.json');
  const bridge = new SonicPiBridge(path.join(profile, 'sonic-pi-runtime'), event => {
    const window = getWindow();
    if (window && !window.isDestroyed()) window.webContents.send('sonic-pi:event', event);
  });
  let connecting;
  let authorized = false;
  const guard = event => {
    const window = getWindow();
    if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || !isAppAddress(event.senderFrame.url)) throw new Error('Invalid Sonic Pi caller');
  };
  const connect = async () => {
    if (authorized && bridge.child && bridge.state !== 'error') return { ok: true };
    const testing = !!process.env.BEAT_TEST_USER_DATA && !!process.env.BEAT_SONIC_PI_ROOT;
    let root = testing ? process.env.BEAT_SONIC_PI_ROOT : undefined;
    if (!testing) {
      const choice = await dialog.showMessageBox(getWindow(), {
        type: 'question', title: 'Connect Sonic Pi', buttons: ['Cancel', 'Connect'], defaultId: 0, cancelId: 0,
        message: 'Run trusted Sonic Pi Ruby in a native music runtime?',
        detail: 'Install Sonic Pi 5.0.0 separately. This app starts its own audio session. Ruby can access your files and programs; after connection, code in this app can invoke the Ruby bridge. Only run code you trust. No LAN connection is used.',
      });
      if (choice.response !== 1) return { ok: false, error: { message: 'Sonic Pi connection cancelled' } };
      try {
        const saved = JSON.parse(await readFile(config, 'utf8'));
        if (typeof saved.root === 'string') { await inspectSonicPi(saved.root); root = saved.root; }
      } catch { /* Offer a folder picker if no valid installation is configured. */ }
      if (!root) {
        const selected = await dialog.showOpenDialog(getWindow(), {
          title: 'Choose the Sonic Pi 5.0.0 installation folder',
          defaultPath: path.join(process.env.ProgramFiles ?? 'C:/Program Files', 'Sonic Pi'), properties: ['openDirectory'],
        });
        if (selected.canceled || !selected.filePaths[0]) return { ok: false, error: { message: 'No Sonic Pi installation selected. Install 5.0.0, then RUN again.' } };
        root = selected.filePaths[0];
      }
    }
    try {
      const result = await bridge.connect(root);
      authorized = true;
      if (!testing) await writeFile(config, JSON.stringify({ root }), 'utf8');
      return result;
    } catch (error) { authorized = false; return { ok: false, error: { message: error.message } }; }
  };
  ipcMain.handle('sonic-pi:connect', async event => {
    guard(event);
    connecting ??= connect().finally(() => { connecting = null; });
    return connecting;
  });
  ipcMain.handle('sonic-pi:run', (event, code) => {
    guard(event);
    if (!authorized || typeof code !== 'string') return { ok: false, error: { message: 'Connect Sonic Pi before RUN' } };
    return bridge.run(code);
  });
  ipcMain.handle('sonic-pi:stop', event => { guard(event); bridge.stop(); });
  return bridge;
}
