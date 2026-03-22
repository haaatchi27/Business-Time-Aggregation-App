const { app, BrowserWindow } = require('electron');
const path = require('path');

// Set SQLite DB path to AppData before requiring db.js or server.js
// This ensures that db.js creates database.sqlite in a persistent, user-specific location
// rather than failing inside the read-only packaged resources folder.
process.env.DB_PATH = path.join(app.getPath('userData'), 'database.sqlite');

// Require the Express application *after* setting DB_PATH
const serverInit = require('./server.js');

let mainWindow;
let serverInstance;

function createWindow(port) {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true
    });

    mainWindow.loadURL(`http://localhost:${port}`);

    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
    // Start Express server after DB finishes async initialization via sql.js wrapper
    const expressApp = await serverInit();

    // Start on dynamic port (0) to strictly avoid port 3000 conflicts
    serverInstance = expressApp.listen(0, '127.0.0.1', () => {
        const port = serverInstance.address().port;
        console.log(`Electron backend running on http://127.0.0.1:${port}`);

        // Open window directed at the dynamic port
        createWindow(port);
    });

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow(serverInstance.address().port);
        }
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
