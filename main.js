const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;
const PORT = 3928;

function startServer() {
    return new Promise((resolve) => {
        // 启动本地后台服务
        serverProcess = spawn('node', [path.join(__dirname, 'server.js')], {
            stdio: 'inherit',
            shell: true
        });
        // 稍等 800ms 确保服务就绪
        setTimeout(resolve, 800);
    });
}

async function createWindow() {
    await startServer();

    mainWindow = new BrowserWindow({
        width: 1320,
        height: 860,
        minWidth: 1080,
        minHeight: 700,
        title: "DiskAegis | AI 智能磁盘空间与运行内存双优化中枢",
        backgroundColor: '#07090e',
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadURL(`http://localhost:${PORT}`);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
