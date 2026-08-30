const { ipcRenderer } = require('electron');

const overlay = document.getElementById('minimap');

const activeIcons = ['⚡', '⚔️', '🛡️', '🌀', '✨', '🏃'];
let activeIconIdx = 0;

setInterval(() => {
    activeIconIdx = (activeIconIdx + 1) % activeIcons.length;
    if (currentClockTime >= 240) {
        const rtIcon = document.getElementById('rt-icon');
        const rbIcon = document.getElementById('rb-icon');
        if (rtIcon) rtIcon.textContent = activeIcons[activeIconIdx];
        if (rbIcon) rbIcon.textContent = activeIcons[activeIconIdx];
    }
}, 800);

let userOpacity = 0.7;
let altOnlyMode = true;
let isAltPressed = false;
let enabledRunesConfig = {};
let currentClockTime = 0;

ipcRenderer.on('apply-config', (event, cfg) => {
    overlay.style.width = cfg.size + 'px';
    overlay.style.height = cfg.size + 'px';
    document.documentElement.style.setProperty('--node-size', cfg.iconScale + 'px');
    document.documentElement.style.setProperty('--border-color', cfg.borderColor || '#cbd5e1');

    if (cfg.position === 'right') overlay.classList.add('pos-right');
    else overlay.classList.remove('pos-right');
    
    if (cfg.showBorder) overlay.classList.remove('no-border');
    else overlay.classList.add('no-border');

    if (!cfg.showIcons) overlay.classList.add('hide-icons');
    else overlay.classList.remove('hide-icons');

    if (cfg.colors) {
        document.documentElement.style.setProperty('--color-wisdom', cfg.colors.wisdom);
        document.documentElement.style.setProperty('--color-lotus', cfg.colors.lotus);
        document.documentElement.style.setProperty('--color-bounty', cfg.colors.bounty);
        document.documentElement.style.setProperty('--color-water', cfg.colors.water);
        document.documentElement.style.setProperty('--color-active', cfg.colors.active);
    }

    enabledRunesConfig = cfg.enabledRunes || {};
    userOpacity = cfg.opacity;
    altOnlyMode = cfg.altOnly;

    updateVisibility();
    updateRuneStates(currentClockTime);
});

ipcRenderer.on('alt-state', (event, pressed) => {
    isAltPressed = pressed;
    updateVisibility();
});

function updateVisibility() {
    if (!altOnlyMode || isAltPressed) overlay.style.opacity = userOpacity;
    else overlay.style.opacity = 0;
}

ipcRenderer.on('gsi-clock', (event, clockTime) => {
    currentClockTime = clockTime;
    updateRuneStates(clockTime);
});

function updateRuneStates(clockTime) {
    document.querySelectorAll('.wisdom').forEach(el => el.style.display = enabledRunesConfig.wisdom ? 'block' : 'none');
    document.querySelectorAll('.lotus').forEach(el => el.style.display = enabledRunesConfig.lotus ? 'block' : 'none');
    document.querySelectorAll('.bounty').forEach(el => el.style.display = enabledRunesConfig.bounty ? 'block' : 'none');

    const rtNode = document.getElementById('river-top');
    const rbNode = document.getElementById('river-bot');
    const rtIcon = document.getElementById('rt-icon');
    const rbIcon = document.getElementById('rb-icon');

    let isRiverVisible = false;

    if (clockTime <= 0) {
        rtIcon.textContent = '🪙'; 
        rbIcon.textContent = '🪙';
        rtNode.className = 'spawn-node river-node bounty';
        rbNode.className = 'spawn-node river-node bounty';
        isRiverVisible = enabledRunesConfig.bounty;
    } else if (clockTime < 240) {
        rtIcon.textContent = '💧'; 
        rbIcon.textContent = '💧';
        rtNode.className = 'spawn-node river-node water-rune';
        rbNode.className = 'spawn-node river-node water-rune';
        isRiverVisible = enabledRunesConfig.water;
    } else {
        rtIcon.textContent = activeIcons[activeIconIdx];
        rbIcon.textContent = activeIcons[activeIconIdx];
        rtNode.className = 'spawn-node river-node active-rune';
        rbNode.className = 'spawn-node river-node active-rune';
        isRiverVisible = enabledRunesConfig.active;
    }

    rtNode.style.display = isRiverVisible ? 'block' : 'none';
    rbNode.style.display = isRiverVisible ? 'block' : 'none';

    if (clockTime >= 0) {
        const p3 = (clockTime % 180) / 180;
        const p2 = (clockTime % 120) / 120;
        const p7 = (clockTime % 420) / 420;

        ['bt-p','bb-p','lt-p','lb-p'].forEach(id => updateRing(id, p3));
        ['rt-p','rb-p'].forEach(id => updateRing(id, p2));
        ['wtl-p','wbr-p'].forEach(id => updateRing(id, p7));
    }
}

function updateRing(id, progress) {
    const el = document.getElementById(id);
    if (el) el.style.strokeDashoffset = 100 - (progress * 100);
}
