const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveTicket: (content) => ipcRenderer.invoke('save-ticket', content),
  exportSalesCsv: (rows) => ipcRenderer.invoke('export-sales-csv', rows),
  logEscPos: (payload) => ipcRenderer.invoke('log-escpos', payload),
});
