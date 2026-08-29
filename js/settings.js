const { ipcRenderer } = require('electron');

const translations = {
    ru: {
        tab_visuals: "ВИЗУАЛЫ",
        tab_config: "КОНФИГУРАЦИЯ",
        tab_settings: "НАСТРОЙКИ",
        tab_pro_features: "PRO FEATURES",
        p_map_title: "Миникарта",
        lbl_map_pos: "Позиция миникарты:",
        opt_left: "Слева (Стандарт)",
        opt_right: "Справа",
        lbl_map_size: "Размер карты",
        lbl_icon_scale: "Размер иконок",
        p_style_title: "Оформление",
        lbl_opacity: "Прозрачность",
        chk_border: "Рамка карты",
        chk_alt_only: "Только по клавише",
        chk_icons: "Иконки внутри таймера",
        p_runes_title: "Фильтр Рун",
        rune_wisdom: "Виздомки",
        rune_lotus: "Лотусы",
        rune_bounty: "Баунти",
        rune_water: "Водные",
        rune_active: "Активные",
        p_profiles_title: "Профили Настроек",
        lbl_select_profile: "Выберите профиль:",
        lbl_profile_name: "Имя нового профиля:",
        btn_save_profile: "Сохранить",
        btn_delete_profile: "Удалить",
        p_import_export: "Импорт / Экспорт",
        desc_config_json: "Вы можете экспортировать свои настройки в JSON строку или импортировать готовый конфиг.",
        btn_export_json: "Экспорт в JSON",
        btn_import_json: "Импорт из JSON",
        p_app_settings: "Настройки Приложения",
        lbl_language: "Язык интерфейса:",
        lbl_hotkey: "Клавиша отображения:",
        chk_autostart: "Автозапуск при старте Windows",
        chk_tray: "Запускать свернутым в трей",
        p_audio_stream: "Звуки и Захват",
        chk_sound_alerts: "Звуковой сигнал за 10 сек",
        lbl_volume: "Громкость оповещений",
        chk_streamer_mode: "Скрыть от OBS / Захвата",
        p_pro_features: "PRO Функции",
        pro_burst_calc: "Smart Burst Calculator",
        pro_tactical_overlay: "Tactical Overlay (Hotkeys)",
        pro_micro_assistant: "Pro-Micro Efficiency",
        p_hotkey_config: "Настройка Хоткеев",
        lbl_blackhole_key: "Black Hole Timer:",
        lbl_ravage_key: "Ravage Timer:",
        lbl_roshan_key: "Roshan Timers:",
        btn_apply_hotkeys: "Применить Хоткеи",
        btn_apply: "Применить",
        btn_reset: "Сброс"
    },
    en: {
        tab_visuals: "VISUALS",
        tab_config: "CONFIG",
        tab_settings: "SETTINGS",
        tab_pro_features: "PRO FEATURES",
        p_map_title: "Minimap",
        lbl_map_pos: "Minimap Position:",
        opt_left: "Left (Default)",
        opt_right: "Right",
        lbl_map_size: "Map Size",
        lbl_icon_scale: "Icon Scale",
        p_style_title: "Appearance",
        lbl_opacity: "Opacity",
        chk_border: "Map Border",
        chk_alt_only: "Show on Hotkey Only",
        chk_icons: "Icons Inside Timer",
        p_runes_title: "Rune Filters",
        rune_wisdom: "Wisdom Runes",
        rune_lotus: "Lotus Runes",
        rune_bounty: "Bounty Runes",
        rune_water: "Water Runes",
        rune_active: "Active Runes",
        p_profiles_title: "Configuration Profiles",
        lbl_select_profile: "Select Profile:",
        lbl_profile_name: "New Profile Name:",
        btn_save_profile: "Save Profile",
        btn_delete_profile: "Delete",
        p_import_export: "Import / Export",
        desc_config_json: "Export your settings to JSON string or import an external configuration file.",
        btn_export_json: "Export to JSON",
        btn_import_json: "Import from JSON",
        p_app_settings: "App Settings",
        lbl_language: "Interface Language:",
        lbl_hotkey: "Overlay Hotkey:",
        chk_autostart: "Launch on Windows Startup",
        chk_tray: "Start Minimized to Tray",
        p_audio_stream: "Audio & Streamer",
        chk_sound_alerts: "Sound Alert 10s Before Spawn",
        lbl_volume: "Alert Volume",
        chk_streamer_mode: "Hide from OBS / Capture",
        p_pro_features: "PRO Features",
        pro_burst_calc: "Smart Burst Calculator",
        pro_tactical_overlay: "Tactical Overlay (Hotkeys)",
        pro_micro_assistant: "Pro-Micro Efficiency",
        p_hotkey_config: "Hotkey Configuration",
        lbl_blackhole_key: "Black Hole Timer:",
        lbl_ravage_key: "Ravage Timer:",
        lbl_roshan_key: "Roshan Timers:",
        btn_apply_hotkeys: "Apply Hotkeys",
        btn_apply: "Apply",
        btn_reset: "Reset"
    }
};

let currentLang = 'ru';

function setLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerText = translations[lang][key];
        }
    });
}

// Tab Switcher
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active-content'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        document.getElementById(`tab-${target}`).classList.add('active-content');
    });
});

// Dynamic GSI Status Handler
ipcRenderer.on('gsi-status', (event, connected) => {
    const dot = document.getElementById('gsiDot');
    const status = document.getElementById('gsiStatus');
    if (connected) {
        dot.classList.add('active');
        status.innerText = 'Connected';
        status.style.color = '#22c55e';
    } else {
        dot.classList.remove('active');
        status.innerText = 'Disconnected';
        status.style.color = '#94a3b8';
    }
});

function getCurrentConfig() {
    return {
        lang: document.getElementById('appLanguage').value,
        position: document.getElementById('mapPosition').value,
        size: document.getElementById('size').value,
        iconScale: document.getElementById('iconScale').value,
        opacity: document.getElementById('opacity').value / 100,
        showBorder: document.getElementById('showBorder').checked,
        borderColor: document.getElementById('borderColor').value,
        altOnly: document.getElementById('altOnly').checked,
        showIcons: document.getElementById('showIcons').checked,
        hotkey: document.getElementById('hotkeySelect').value,
        autoStart: document.getElementById('autoStart').checked,
        startInTray: document.getElementById('startInTray').checked,
        soundAlerts: document.getElementById('soundAlerts').checked,
        soundVolume: document.getElementById('soundVolume').value,
        streamerMode: document.getElementById('streamerMode').checked,
        enabledRunes: {
            wisdom: document.getElementById('enableWisdom').checked,
            lotus: document.getElementById('enableLotus').checked,
            bounty: document.getElementById('enableBounty').checked,
            water: document.getElementById('enableWater').checked,
            active: document.getElementById('enableActive').checked,
        },
        colors: {
            wisdom: document.getElementById('colorWisdom').value,
            lotus: document.getElementById('colorLotus').value,
            bounty: document.getElementById('colorBounty').value,
            water: document.getElementById('colorWater').value,
            active: document.getElementById('colorActive').value,
        }
    };
}

function updateLabels() {
    document.getElementById('valSize').innerText = document.getElementById('size').value + 'px';
    document.getElementById('valScale').innerText = document.getElementById('iconScale').value + 'px';
    document.getElementById('valOp').innerText = document.getElementById('opacity').value + '%';
    document.getElementById('valVol').innerText = document.getElementById('soundVolume').value + '%';
}

function sendConfig() {
    updateLabels();
    const config = getCurrentConfig();
    ipcRenderer.send('update-config', config);
    localStorage.setItem('neonblossom_config', JSON.stringify(config));
}

const allInputs = document.querySelectorAll('input, select');
allInputs.forEach(el => {
    el.addEventListener('input', sendConfig);
    el.addEventListener('change', sendConfig);
});

document.getElementById('appLanguage').addEventListener('change', (e) => {
    setLanguage(e.target.value);
});

document.getElementById('btnSaveProfile').addEventListener('click', () => {
    const name = document.getElementById('newProfileName').value.trim();
    if(!name) return;
    const profiles = JSON.parse(localStorage.getItem('neon_profiles') || '{}');
    profiles[name] = getCurrentConfig();
    localStorage.setItem('neon_profiles', JSON.stringify(profiles));
    
    const opt = document.createElement('option');
    opt.value = name;
    opt.innerText = name;
    document.getElementById('profileSelect').appendChild(opt);
    document.getElementById('profileSelect').value = name;
    document.getElementById('newProfileName').value = '';
});

document.getElementById('btnExportJson').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getCurrentConfig(), null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "neonblossom_config.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
});

// PRO FEATURES HANDLERS
let currentProConfig = {
    burstCalculator: true,
    tacticalOverlay: true,
    microAssistant: true,
    tacticalHotkeys: {
        blackHole: { key: 'Numpad1', duration: 160 },
        ravage: { key: 'Numpad2', duration: 150 },
        roshan: { key: 'Numpad0', durations: { aegis: 300, minSpawn: 480, maxSpawn: 660 } }
    }
};

// Receive PRO config from main process
ipcRenderer.on('pro-config', (event, config) => {
    currentProConfig = config;
    // Update UI with current config
    document.getElementById('enableBurstCalc').checked = config.burstCalculator;
    document.getElementById('enableTacticalOverlay').checked = config.tacticalOverlay;
    document.getElementById('enableMicroAssistant').checked = config.microAssistant;
});

// Send PRO config to main process
function sendProConfig() {
    const proConfig = {
        burstCalculator: document.getElementById('enableBurstCalc').checked,
        tacticalOverlay: document.getElementById('enableTacticalOverlay').checked,
        microAssistant: document.getElementById('enableMicroAssistant').checked,
        tacticalHotkeys: {
            blackHole: { 
                key: document.getElementById('blackHoleKey').value,
                duration: currentProConfig.tacticalHotkeys.blackHole.duration 
            },
            ravage: { 
                key: document.getElementById('ravageKey').value,
                duration: currentProConfig.tacticalHotkeys.ravage.duration 
            },
            roshan: { 
                key: document.getElementById('roshanKey').value,
                durations: currentProConfig.tacticalHotkeys.roshan.durations
            }
        }
    };
    
    ipcRenderer.send('update-pro-config', proConfig);
    localStorage.setItem('neonblossom_pro_config', JSON.stringify(proConfig));
}

// Add event listeners for PRO features toggles
document.getElementById('enableBurstCalc').addEventListener('change', sendProConfig);
document.getElementById('enableTacticalOverlay').addEventListener('change', sendProConfig);
document.getElementById('enableMicroAssistant').addEventListener('change', sendProConfig);

// Apply hotkeys button
document.getElementById('btnApplyHotkeys').addEventListener('click', () => {
    sendProConfig();
    // Visual feedback
    const btn = document.getElementById('btnApplyHotkeys');
    const originalText = btn.textContent;
    btn.textContent = currentLang === 'ru' ? '✓ Применено' : '✓ Applied';
    btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 1500);
});

document.getElementById('btnExit').addEventListener('click', () => ipcRenderer.send('close-app'));
document.getElementById('btnApply').addEventListener('click', sendConfig);

setLanguage('ru');
sendConfig();
