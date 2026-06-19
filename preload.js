const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveCSV: (fileName, csvContent) => ipcRenderer.invoke('save-csv', { fileName, csvContent }),
    showAlert: (message, title) => ipcRenderer.sendSync('show-alert-sync', { message, title }),
    showConfirm: (message, title) => ipcRenderer.sendSync('show-confirm-sync', { message, title }),
    isElectron: true
});
