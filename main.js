const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Set SQLite DB path to AppData before requiring db.js or server.js
// This ensures that db.js creates database.sqlite in a persistent, user-specific location
// rather than failing inside the read-only packaged resources folder.
const dbPath = path.join(app.getPath('userData'), 'database.sqlite');
process.env.DB_PATH = dbPath;

let mainWindow;
let serverInstance;

function createWindow(port) {
    mainWindow = new BrowserWindow({
        width: 1200,
        minWidth: 400,
        height: 800,
        minHeight: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true
    });

    mainWindow.loadURL(`http://localhost:${port}`);

    // mainWindow.webContents.openDevTools();
}

/**
 * Check if the database file exists and is writable.
 * Returns: 'ok' | 'not_found' | 'not_writable'
 */
function checkDbStatus() {
    if (!fs.existsSync(dbPath)) {
        return 'not_found';
    }

    // Check write permission by attempting to open the file for writing
    try {
        const fd = fs.openSync(dbPath, 'r+');
        fs.closeSync(fd);
        return 'ok';
    } catch (err) {
        return 'not_writable';
    }
}

app.whenReady().then(async () => {
    const status = checkDbStatus();

    if (status === 'not_found') {
        // DB does not exist – ask user to create new or restart
        const result = await dialog.showMessageBox({
            type: 'warning',
            title: 'データベースが見つかりません',
            message: `データベースファイルが見つかりません。\n\n場所: ${dbPath}`,
            detail: '新しいデータベースを作成するか、アプリを再起動してください。',
            buttons: ['新規作成', '再起動', 'キャンセル'],
            defaultId: 0,
            cancelId: 2
        });

        if (result.response === 0) {
            // Create new – proceed normally (db.js will create the file)
            console.log('User chose to create a new database.');
        } else if (result.response === 1) {
            // Restart the app
            app.relaunch();
            app.exit(0);
            return;
        } else {
            // Cancel – quit
            app.quit();
            return;
        }
    } else if (status === 'not_writable') {
        // DB exists but is not writable
        await dialog.showMessageBox({
            type: 'error',
            title: 'データベースエラー',
            message: 'データベースに書き込みできません。',
            detail: `ファイルのアクセス権限を確認してください。\n\n場所: ${dbPath}\n\nアプリケーションを終了します。`,
            buttons: ['OK']
        });
        app.quit();
        return;
    }

    // DB is ok (or newly created) – start Express server
    try {
        const serverInit = require('./server.js');
        const expressApp = await serverInit();

        // Start on dynamic port (0) to strictly avoid port 3000 conflicts
        serverInstance = expressApp.listen(0, '127.0.0.1', () => {
            const port = serverInstance.address().port;
            console.log(`Electron backend running on http://127.0.0.1:${port}`);

            // Open window directed at the dynamic port
            createWindow(port);
        });
    } catch (err) {
        await dialog.showMessageBox({
            type: 'error',
            title: 'サーバー起動エラー',
            message: 'アプリケーションの起動に失敗しました。',
            detail: `エラー: ${err.message}\n\nアプリケーションを終了します。`,
            buttons: ['OK']
        });
        app.quit();
        return;
    }

    // IPC handler: save CSV to file system with save dialog
    ipcMain.handle('save-csv', async (event, { fileName, csvContent }) => {
        try {
            const defaultPath = path.join(app.getPath('downloads'), fileName);
            const result = await dialog.showSaveDialog(mainWindow, {
                title: 'CSVファイルの保存',
                defaultPath: defaultPath,
                filters: [
                    { name: 'CSV Files', extensions: ['csv'] }
                ]
            });

            if (result.canceled || !result.filePath) {
                return { success: false, canceled: true };
            }

            const bom = '\uFEFF';
            fs.writeFileSync(result.filePath, bom + csvContent, 'utf-8');
            return { success: true, filePath: result.filePath };
        } catch (err) {
            return { success: false, error: err.message };
        }
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
