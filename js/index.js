const { ipcRenderer } = require('electron');

// ============================================================================
// КОНФИГУРАЦИЯ И СОСТОЯНИЕ
// ============================================================================
const overlay = document.getElementById('minimap');
const burstWidget = document.getElementById('burstWidget');
const microWidget = document.getElementById('microWidget');
const tacticalOverlay = document.getElementById('tacticalOverlay');

const activeIcons = ['⚡', '⚔️', '🛡️', '🌀', '✨', '🏃'];
let activeIconIdx = 0;

let userOpacity = 0.7;
let altOnlyMode = true;
let isAltPressed = false;
let enabledRunesConfig = {};
let currentClockTime = 0;
let gsiData = {};

// PRO FEATURES CONFIG
let proFeaturesEnabled = {
    burstCalculator: true,
    tacticalOverlay: true,
    microAssistant: true
};

// HERO ABILITIES DATA (Extensible architecture)
const heroAbilities = {
    'npc_dota_hero_lion': {
        name: 'Lion',
        icon: '🦁',
        abilities: {
            'lion_finger_of_death': {
                name: 'Finger of Death',
                baseDmg: [400, 550, 700],
                cooldown: [160, 100, 40],
                lastCastTime: -999,
                level: 0
            },
            'lion_earth_spike': {
                name: 'Earth Spike',
                baseDmg: [80, 130, 180, 230],
                cooldown: [12, 11, 10, 9],
                lastCastTime: -999,
                level: 0
            }
        }
    }
};

let currentHero = 'npc_dota_hero_lion';
let tacticalTimers = [];

// ============================================================================
// SMART BURST CALCULATOR
// ============================================================================
function updateBurstCalculator() {
    if (!proFeaturesEnabled.burstCalculator) {
        burstWidget.classList.remove('visible');
        return;
    }

    const hero = heroAbilities[currentHero];
    if (!hero) return;

    let totalDamage = 0;
    const now = Date.now() / 1000;

    // Calculate Finger of Death damage
    const finger = hero.abilities['lion_finger_of_death'];
    const fingerLevel = Math.min(finger.level, finger.baseDmg.length - 1);
    const fingerCd = finger.cooldown[fingerLevel] || 40;
    const fingerAvailable = (now - finger.lastCastTime) >= fingerCd;
    
    if (fingerAvailable) {
        totalDamage += finger.baseDmg[fingerLevel] || 400;
    }
    document.getElementById('fingerDmg').textContent = fingerAvailable ? finger.baseDmg[fingerLevel] : 'CD';
    document.getElementById('fingerDmg').style.color = fingerAvailable ? 'var(--neon-gold)' : '#64748b';

    // Calculate Earth Spike damage
    const spike = hero.abilities['lion_earth_spike'];
    const spikeLevel = Math.min(spike.level, spike.baseDmg.length - 1);
    const spikeCd = spike.cooldown[spikeLevel] || 9;
    const spikeAvailable = (now - spike.lastCastTime) >= spikeCd;
    
    if (spikeAvailable) {
        totalDamage += spike.baseDmg[spikeLevel] || 130;
    }
    document.getElementById('spikeDmg').textContent = spikeAvailable ? spike.baseDmg[spikeLevel] : 'CD';
    document.getElementById('spikeDmg').style.color = spikeAvailable ? 'var(--neon-gold)' : '#64748b';

    // Update lethal burst display
    document.getElementById('lethalBurst').textContent = `${totalDamage} HP`;
    
    burstWidget.classList.add('visible');
}

function parseHeroAbilities(abilitiesData) {
    if (!abilitiesData) return;
    
    const hero = heroAbilities[currentHero];
    if (!hero) return;

    for (const [key, value] of Object.entries(abilitiesData)) {
        if (hero.abilities[key]) {
            hero.abilities[key].level = value.level || 0;
            // Track when ability was last used (if it's on cooldown)
            if (value.cooldown > 0) {
                hero.abilities[key].lastCastTime = (Date.now() / 1000) - (hero.abilities[key].cooldown[0] - value.cooldown);
            }
        }
    }
    
    updateBurstCalculator();
}

// ============================================================================
// TACTICAL OVERLAY - TIMERS
// ============================================================================
function createTacticalTimer(timerData) {
    const timerEl = document.createElement('div');
    timerEl.className = 'tactical-timer';
    timerEl.style.borderColor = timerData.color;
    timerEl.innerHTML = `
        <span class="tactical-name">${timerData.name}</span>
        <span class="tactical-time" data-duration="${timerData.duration}">${formatTime(timerData.duration)}</span>
    `;
    tacticalOverlay.appendChild(timerEl);
    
    const startTime = Date.now();
    const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, timerData.duration - elapsed);
        
        const timeEl = timerEl.querySelector('.tactical-time');
        timeEl.textContent = formatTime(remaining);
        
        if (remaining <= 0) {
            clearInterval(interval);
            timerEl.classList.add('fade-out');
            setTimeout(() => {
                if (timerEl.parentNode) {
                    timerEl.parentNode.removeChild(timerEl);
                }
            }, 500);
        }
    }, 100);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function handleTacticalTimers(timers) {
    if (!proFeaturesEnabled.tacticalOverlay) return;
    
    tacticalOverlay.innerHTML = '';
    timers.forEach(timer => {
        createTacticalTimer(timer);
    });
}

// ============================================================================
// MICRO ASSISTANT - ITEM TRACKER
// ============================================================================
function checkMicroEfficiency() {
    if (!proFeaturesEnabled.microAssistant) {
        microWidget.classList.remove('visible');
        return;
    }

    const alertEl = document.getElementById('microAlert');
    const player = gsiData.player;
    
    if (!player) {
        alertEl.classList.remove('active');
        return;
    }

    const hasBottle = player.items && player.items.some(item => item && item.includes('item_bottle'));
    const hasTreads = player.items && player.items.some(item => item && item.includes('item_power_treads'));
    const healthPercent = player.health_percent || 100;
    const primaryAttr = player.primary_attr || 'str';
    
    // Check if treads are NOT on agility while health < 100 and has bottle
    const needsAgiTreads = hasBottle && hasTreads && healthPercent < 100 && primaryAttr !== 'agi';
    
    if (needsAgiTreads) {
        alertEl.classList.add('active');
    } else {
        alertEl.classList.remove('active');
    }
}

// ============================================================================
// RUNE OVERLAY (Existing Functionality)
// ============================================================================
setInterval(() => {
    activeIconIdx = (activeIconIdx + 1) % activeIcons.length;
    if (currentClockTime >= 240) {
        const rtIcon = document.getElementById('rt-icon');
        const rbIcon = document.getElementById('rb-icon');
        if (rtIcon) rtIcon.textContent = activeIcons[activeIconIdx];
        if (rbIcon) rbIcon.textContent = activeIcons[activeIconIdx];
    }
}, 800);

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

ipcRenderer.on('gsi-data', (event, data) => {
    gsiData = data;
    
    // Parse hero abilities for burst calculator
    if (data.hero_id) {
        currentHero = data.hero_id;
        if (!heroAbilities[currentHero]) {
            // Default to lion if hero not in database
            currentHero = 'npc_dota_hero_lion';
        }
    }
    
    if (data.abilities) {
        parseHeroAbilities(data.abilities);
    }
    
    // Check micro efficiency
    checkMicroEfficiency();
});

ipcRenderer.on('tactical-timers', (event, timers) => {
    handleTacticalTimers(timers);
});

ipcRenderer.on('apply-pro-config', (event, config) => {
    proFeaturesEnabled = {
        burstCalculator: config.burstCalculator,
        tacticalOverlay: config.tacticalOverlay,
        microAssistant: config.microAssistant
    };
    
    // Update widget visibility
    if (!proFeaturesEnabled.burstCalculator) {
        burstWidget.classList.remove('visible');
    }
    if (!proFeaturesEnabled.microAssistant) {
        microWidget.classList.remove('visible');
    }
    
    // Re-trigger checks
    if (proFeaturesEnabled.burstCalculator) updateBurstCalculator();
    if (proFeaturesEnabled.microAssistant) checkMicroEfficiency();
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
