const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ponte', {
  stato: () => ipcRenderer.invoke('stato'),
  aggiungi: (v) => ipcRenderer.invoke('aggiungi', v),
  rimuovi: (id) => ipcRenderer.invoke('rimuovi', id),
  accendi: (id, on) => ipcRenderer.invoke('accendi', id, on),
  avvioAuto: (on) => ipcRenderer.invoke('avvio-auto', on),
  accediClaude: () => ipcRenderer.invoke('accedi-claude'),
  ricontrolla: () => ipcRenderer.invoke('ricontrolla'),
  traffico: () => ipcRenderer.invoke('traffico'),
  svuotaTraffico: () => ipcRenderer.invoke('traffico-svuota'),
  onTraffico: (cb) => ipcRenderer.on('traffico', (_e, v) => cb(v)),
  onStato: (cb) => ipcRenderer.on('stato', (_e, s) => cb(s)),
});
