const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveCSV: (fileName, csvContent) => ipcRenderer.invoke('save-csv', { fileName, csvContent }),
    isElectron: true
});
