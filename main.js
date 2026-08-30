const { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { uIOhook, UiohookKey } = require('uiohook-napi');

let mainWindow = null;
let settingsWindow = null;
let currentHotkey = 'Alt';
let gsiTimeout = null;
let isGsiConnected = false;
let tray = null;

// Полные данные GSI
let currentGsiData = null;
let previousGsiData = null;

// Таймеры и состояния
let aegisTimer = null;
let aegisEndTime = null;
let aegisWarningShown = false;
let roshanDeathTime = null;

// Встроенный HTTP-сервер для приемки данных GSI от Dota 2
const gsiServer = http.createServer((req, res) => {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                previousGsiData = currentGsiData;
                currentGsiData = data;
                
                if (data && data.map && typeof data.map.clock_time !== 'undefined') {
                    resetGsiTimeout();
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('gsi-data', data);
                        mainWindow.webContents.send('gsi-clock', data.map.clock_time);
                    }
                    
                    // Обработка событий GSI
                    processGsiEvents(data, previousGsiData);
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

function processGsiEvents(current, previous) {
    if (!current || !previous) return;
    
    const clockTime = current.map?.clock_time || 0;
    
    // Отслеживание смерти Рошана
    if (current.roshan && previous.roshan) {
        if (current.roshan.event && !previous.roshan.event) {
            // Рошан умер
            roshanDeathTime = clockTime;
            startAegisTracker(clockTime);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('roshan-death', { time: clockTime });
            }
        }
    }
    
    // Отслеживание покупок предметов врагами
    if (current.player && previous.player && current.player.observer_value !== previous.player.observer_value) {
        // Изменение золота - возможна покупка
        checkItemPurchases(current, previous);
    }
    
    // Отслеживание вардов
    trackWards(current, previous);
    
    // Отслеживание способностей
    trackAbilities(current, previous);
}

function startAegisTimer(startTime) {
    if (aegisTimer) clearTimeout(aegisTimer);
    
    aegisEndTime = startTime + 300; // 5 минут
    aegisWarningShown = false;
    
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('aegis-start', { endTime: aegisEndTime });
    }
    
    // Предупреждение за 30 секунд
    const warningTime = (aegisEndTime - 30) * 1000;
    const now = Date.now();
    const delay = Math.max(0, warningTime - now);
    
    aegisTimer = setTimeout(() => {
        if (!aegisWarningShown && mainWindow && !mainWindow.isDestroyed()) {
            aegisWarningShown = true;
            mainWindow.webContents.send('aegis-warning', {});
        }
    }, delay);
    
    // Окончание таймера
    const expireTime = aegisEndTime * 1000;
    const expireDelay = Math.max(0, expireTime - now);
    
    setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('aegis-expired', {});
        }
    }, expireDelay);
}

function checkItemPurchases(current, previous) {
    // Анализ изменений в предметах
    const currentPlayer = current.player;
    const prevPlayer = previous.player;
    
    if (!currentPlayer || !prevPlayer) return;
    
    const currentItems = new Set(currentPlayer.items?.map(i => i.name) || []);
    const prevItems = new Set(prevPlayer.items?.map(i => i.name) || []);
    
    // Новые предметы
    for (let item of currentItems) {
        if (!prevItems.has(item) && item) {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('item-purchased', { 
                    itemName: item, 
                    timestamp: current.map?.clock_time 
                });
            }
        }
    }
}

function trackWards(current, previous) {
    const currentPlayer = current.player;
    const prevPlayer = previous.player;
    
    if (!currentPlayer || !prevPlayer) return;
    
    // Подсчет вардов в инвентаре
    const countWards = (items) => {
        if (!items) return 0;
        return items.filter(i => i.name && (i.name.includes('ward') || i.name.includes('observer') || i.name.includes('sentry'))).length;
    };
    
    const currentWards = countWards(currentPlayer.items);
    const prevWards = countWards(prevPlayer.items);
    
    if (currentWards < prevWards && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ward-placed', { 
            count: prevWards - currentWards,
            timestamp: current.map?.clock_time 
        });
    }
}

function trackAbilities(current, previous) {
    const currentPlayer = current.player;
    const prevPlayer = previous.player;
    
    if (!currentPlayer || !prevPlayer) return;
    
    // Отслеживание использования способностей через cooldown
    const currentAbils = currentPlayer.abilities || [];
    const prevAbils = prevPlayer.abilities || [];
    
    for (let i = 0; i < currentAbils.length; i++) {
        const curr = currentAbils[i];
        const prev = prevAbils[i];
        
        if (curr && prev && curr.cooldown !== prev.cooldown && curr.cooldown > 0) {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ability-used', {
                    abilityName: curr.name,
                    cooldown: curr.cooldown,
                    timestamp: current.map?.clock_time
                });
            }
        }
    }
}

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