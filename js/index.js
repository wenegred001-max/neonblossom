const { ipcRenderer } = require('electron');

const overlay = document.getElementById('minimap');
const aegisTracker = document.getElementById('aegisTracker');
const aegisTimerEl = document.getElementById('aegisTimer');
const aegisWarningEl = document.getElementById('aegisWarning');
const notificationsPanel = document.getElementById('notificationsPanel');
const enemyTrackers = document.getElementById('enemyTrackers');
const abilitiesTracker = document.getElementById('abilitiesTracker');
const playerStats = document.getElementById('playerStats');
const gpmValue = document.getElementById('gpmValue');
const netWorthValue = document.getElementById('netWorthValue');
const roshanTimer = document.getElementById('roshanTimer');
const roshanText = document.getElementById('roshanText');

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
let aegisEndTime = null;
let aegisInterval = null;
let roshanRespawnTime = null;
let roshanInterval = null;
let enemyHeroes = new Map();
let activeAbilities = new Map();

// Обработка конфигурации
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

// Получение полных данных GSI
ipcRenderer.on('gsi-data', (event, data) => {
    processGsiData(data);
});

ipcRenderer.on('gsi-clock', (event, clockTime) => {
    currentClockTime = clockTime;
    updateRuneStates(clockTime);
    updateAegisTimer(clockTime);
    updateRoshanTimer(clockTime);
    updateAbilitiesTracker(clockTime);
});

// Смерть Рошана
ipcRenderer.on('roshan-death', (event, data) => {
    showNotification('roshan', '🐉 Рошан убит!', `Время: ${formatTime(data.time)}`);
    startRoshanTimer(data.time);
});

// Aegis события
ipcRenderer.on('aegis-start', (event, data) => {
    aegisEndTime = data.endTime;
    aegisTracker.classList.add('visible');
    aegisWarningEl.classList.remove('show');
    startAegisTimer();
});

ipcRenderer.on('aegis-warning', () => {
    aegisWarningEl.classList.add('show');
    showNotification('aegis', '⚠️ Аегида скоро исчезнет!', 'Осталось 30 секунд');
});

ipcRenderer.on('aegis-expired', () => {
    aegisTracker.classList.remove('visible');
    aegisWarningEl.classList.remove('show');
    showNotification('aegis', '💔 Аегида исчезла', '');
});

// Покупка предмета
ipcRenderer.on('item-purchased', (event, data) => {
    const itemName = formatItemName(data.itemName);
    showNotification('item', `🎒 Куплен предмет`, `${itemName}`);
});

// Вард поставлен
ipcRenderer.on('ward-placed', (event, data) => {
    showNotification('ward', '👁️ Варды поставлены', `Количество: ${data.count}`);
});

// Способность использована
ipcRenderer.on('ability-used', (event, data) => {
    trackAbility(data.abilityName, data.cooldown);
});

function processGsiData(data) {
    // Обновление статистики игрока
    if (data.player) {
        const gpm = data.player.gpm || 0;
        const netWorth = data.player.net_worth || 0;
        
        if (gpmValue) gpmValue.textContent = gpm;
        if (netWorthValue) netWorthValue.textContent = formatNumber(netWorth);
    }
    
    // Отслеживание вражеских героев
    if (data.provider && data.provider.players) {
        updateEnemyHeroes(data.provider.players);
    }
}

function updateEnemyHeroes(players) {
    // Очищаем трекер
    enemyTrackers.innerHTML = '';
    enemyHeroes.clear();
    
    players.forEach(player => {
        if (player.team_name === 'Свет' || player.team_name === 'Radiant') return; // Пропускаем своих
        
        const hero = {
            name: player.hero || 'Unknown',
            lastSeen: player.position || null,
            state: player.state || 'alive'
        };
        
        enemyHeroes.set(player.name, hero);
        
        const heroEl = document.createElement('div');
        heroEl.className = 'enemy-hero';
        heroEl.innerHTML = `
            <span>${hero.name}</span>
            ${hero.lastSeen ? `<span class="last-seen">Последний раз виден</span>` : ''}
        `;
        enemyTrackers.appendChild(heroEl);
    });
}

function startAegisTimer() {
    if (aegisInterval) clearInterval(aegisInterval);
    
    aegisInterval = setInterval(() => {
        if (!aegisEndTime) return;
        
        const now = Date.now() / 1000;
        const remaining = Math.max(0, aegisEndTime - now);
        
        if (remaining <= 0) {
            clearInterval(aegisInterval);
            aegisTracker.classList.remove('visible');
            return;
        }
        
        aegisTimerEl.textContent = formatTimeRemaining(remaining);
    }, 1000);
}

function updateAegisTimer(clockTime) {
    // Дополнительная проверка времени
    if (aegisEndTime && aegisTracker.classList.contains('visible')) {
        const now = Date.now() / 1000;
        const remaining = Math.max(0, aegisEndTime - now);
        if (remaining > 0) {
            aegisTimerEl.textContent = formatTimeRemaining(remaining);
        }
    }
}

function startRoshanTimer(deathTime) {
    roshanRespawnTime = deathTime + 480; // 8 минут
    roshanTimer.classList.add('visible');
    
    if (roshanInterval) clearInterval(roshanInterval);
    
    roshanInterval = setInterval(() => {
        const remaining = Math.max(0, roshanRespawnTime - currentClockTime);
        
        if (remaining <= 0) {
            roshanText.textContent = 'UP!';
            roshanText.style.color = '#22c55e';
            return;
        }
        
        roshanText.textContent = formatTimeShort(remaining);
        roshanText.style.color = '#ef4444';
    }, 1000);
}

function updateRoshanTimer(clockTime) {
    if (roshanRespawnTime && roshanTimer.classList.contains('visible')) {
        const remaining = Math.max(0, roshanRespawnTime - clockTime);
        
        if (remaining <= 0) {
            roshanText.textContent = 'UP!';
            roshanText.style.color = '#22c55e';
        } else {
            roshanText.textContent = formatTimeShort(remaining);
        }
    }
}

function trackAbility(abilityName, cooldown) {
    const key = `${abilityName}_${Date.now()}`;
    activeAbilities.set(key, {
        name: abilityName,
        endTime: currentClockTime + cooldown,
        initialCd: cooldown
    });
    
    renderAbilitiesTracker();
    
    // Удаляем способность после окончания КД
    setTimeout(() => {
        activeAbilities.delete(key);
        renderAbilitiesTracker();
    }, cooldown * 1000);
}

function updateAbilitiesTracker(clockTime) {
    activeAbilities.forEach((ability, key) => {
        const remaining = Math.max(0, ability.endTime - clockTime);
        if (remaining <= 0) {
            activeAbilities.delete(key);
        }
    });
    renderAbilitiesTracker();
}

function renderAbilitiesTracker() {
    abilitiesTracker.innerHTML = '';
    
    activeAbilities.forEach((ability) => {
        const remaining = Math.max(0, ability.endTime - currentClockTime);
        
        const abilEl = document.createElement('div');
        abilEl.className = 'ability-item';
        abilEl.innerHTML = `
            <div class="ability-icon">⚡</div>
            <div class="ability-name">${formatAbilityName(ability.name)}</div>
            <div class="ability-cd">${remaining > 0 ? remaining.toFixed(1) + 's' : 'UP'}</div>
        `;
        abilitiesTracker.appendChild(abilEl);
    });
}

function showNotification(type, title, time) {
    const template = document.getElementById('notifTemplate');
    const notif = template.cloneNode(true);
    notif.id = '';
    notif.style.display = 'flex';
    
    const iconEl = notif.querySelector('.notif-icon');
    iconEl.className = `notif-icon ${type}`;
    
    if (type === 'item') iconEl.textContent = '🎒';
    else if (type === 'ward') iconEl.textContent = '👁️';
    else if (type === 'ability') iconEl.textContent = '⚡';
    else if (type === 'roshan') iconEl.textContent = '🐉';
    else if (type === 'aegis') iconEl.textContent = '🛡️';
    
    notif.querySelector('.notif-title').textContent = title;
    notif.querySelector('.notif-time').textContent = time;
    
    notificationsPanel.appendChild(notif);
    
    // Удаляем уведомление через 5 секунд
    setTimeout(() => {
        notif.classList.add('fade-out');
        setTimeout(() => {
            if (notif.parentNode) notif.parentNode.removeChild(notif);
        }, 500);
    }, 5000);
}

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

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeShort(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
}

function formatTimeRemaining(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatItemName(name) {
    if (!name) return 'Unknown Item';
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatAbilityName(name) {
    if (!name) return 'Unknown';
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
