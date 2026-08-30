const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const http = require('http');
const { uIOhook, UiohookKey } = require('uiohook-napi');

let mainWindow = null;
let settingsWindow = null;
let currentHotkey = 'Alt';
let gsiTimeout = null;
let isGsiConnected = false;

// Встроенный HTTP-сервер для приемки данных GSI от Dota 2
const gsiServer = http.createServer((req, res) => {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (data && data.map && typeof data.map.clock_time !== 'undefined') {
                    resetGsiTimeout();
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('gsi-clock', data.map.clock_time);
                    }
                }
            } catch (e) {
                console.error('GSI Parse Error:', e);
            }
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

gsiServer.listen(3000, '127.0.0.1', () => {
    console.log('GSI Server running on port 3000');
});

function notifyGsiStatus(status) {
    if (isGsiConnected !== status) {
        isGsiConnected = status;
        if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.webContents.send('gsi-status', status);
        }
    }
}

function resetGsiTimeout() {
    notifyGsiStatus(true);
    if (gsiTimeout) clearTimeout(gsiTimeout);
    gsiTimeout = setTimeout(() => {
        notifyGsiStatus(false);
    }, 4000);
}

function createOverlayWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        x: 0,
        y: 0,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hasShadow: false,
        focusable: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setIgnoreMouseEvents(true);
    mainWindow.setBounds({ x: 0, y: 0, width: width, height: height });
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function createSettingsWindow() {
    settingsWindow = new BrowserWindow({
        width: 850,
        height: 600,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    settingsWindow.setAlwaysOnTop(true, 'screen-saver');
    settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

    settingsWindow.webContents.on('did-finish-load', () => {
        settingsWindow.webContents.send('gsi-status', isGsiConnected);
    });

    settingsWindow.on('blur', () => {
        if (settingsWindow && settingsWindow.isVisible()) {
            settingsWindow.hide();
        }
    });
}

function isMatchingKey(keycode, hotkeyType) {
    if (hotkeyType === 'Alt') {
        return keycode === UiohookKey.Alt || keycode === UiohookKey.AltRight;
    }
    if (hotkeyType === 'Control') {
        return keycode === UiohookKey.Ctrl || keycode === UiohookKey.CtrlRight;
    }
    if (hotkeyType === 'Shift') {
        return keycode === UiohookKey.Shift || keycode === UiohookKey.ShiftRight;
    }
    return false;
}

uIOhook.on('keydown', (e) => {
    if (currentHotkey === 'Always') return;
    if (isMatchingKey(e.keycode, currentHotkey)) {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('alt-state', true);
        }
    }
});

uIOhook.on('keyup', (e) => {
    if (currentHotkey === 'Always') return;
    if (isMatchingKey(e.keycode, currentHotkey)) {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('alt-state', false);
        }
    }
});

app.whenReady().then(() => {
    createOverlayWindow();
    createSettingsWindow();

    uIOhook.start();

    globalShortcut.register('Delete', () => {
        if (!settingsWindow) return;

        if (settingsWindow.isVisible()) {
            settingsWindow.hide();
        } else {
            settingsWindow.show();
        }
    });
});

ipcMain.on('update-config', (event, config) => {
    if (config.hotkey) {
        currentHotkey = config.hotkey;
        if (currentHotkey === 'Always' && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('alt-state', true);
        }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
        if (typeof config.streamerMode !== 'undefined') {
            mainWindow.setContentProtection(config.streamerMode);
        }
        mainWindow.webContents.send('apply-config', config);
    }
});

ipcMain.on('close-app', () => {
    app.quit();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    uIOhook.stop();
    gsiServer.close();
});