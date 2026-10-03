const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sonicPi', {
  connect: () => ipcRenderer.invoke('sonic-pi:connect'),
  run: code => ipcRenderer.invoke('sonic-pi:run', code),
  stop: () => ipcRenderer.invoke('sonic-pi:stop'),
  onEvent: listener => {
    const receive = (_event, payload) => listener(payload);
    ipcRenderer.on('sonic-pi:event', receive);
    return () => ipcRenderer.removeListener('sonic-pi:event', receive);
  },
});
