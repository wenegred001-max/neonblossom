const { ipcRenderer } = require('electron');

// ============================================================================
// i18n LOCALIZATION DICTIONARY
// ============================================================================
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
        pro_burst_desc: "Lion combo damage",
        pro_tactical_overlay: "Tactical Overlay (Hotkeys)",
        pro_tactical_desc: "Ctrl+Numpad 1/2/0",
        pro_micro_assistant: "Pro-Micro Efficiency",
        pro_micro_desc: "AGI Treads alert",
        p_edit_interface: "Редактор Интерфейса",
        btn_edit_interface: "✏️ Редактировать интерфейс",
        edit_mode_desc: "Перетаскивайте виджеты мышкой. Нажмите ещё раз для выхода.",
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
        tab_config: "CONFIGURATION",
        tab_settings: "SETTINGS",
        tab_pro_features: "PRO FEATURES",
        p_map_title: "Minimap",
        lbl_map_pos: "Minimap Position:",
        opt_left: "Left (Standard)",
        opt_right: "Right",
        lbl_map_size: "Map Size",
        lbl_icon_scale: "Icon Scale",
        p_style_title: "Appearance",
        lbl_opacity: "Opacity",
        chk_border: "Map Border",
        chk_alt_only: "Only by Hotkey",
        chk_icons: "Icons inside timer",
        p_runes_title: "Rune Filter",
        rune_wisdom: "Wisdom Runes",
        rune_lotus: "Lotus Runes",
        rune_bounty: "Bounty Runes",
        rune_water: "Water Runes",
        rune_active: "Active Runes",
        p_profiles_title: "Settings Profiles",
        lbl_select_profile: "Select Profile:",
        lbl_profile_name: "New Profile Name:",
        btn_save_profile: "Save",
        btn_delete_profile: "Delete",
        p_import_export: "Import / Export",
        desc_config_json: "Export your settings to JSON string or import a ready config.",
        btn_export_json: "Export to JSON",
        btn_import_json: "Import from JSON",
        p_app_settings: "Application Settings",
        lbl_language: "Interface Language:",
        lbl_hotkey: "Display Hotkey:",
        chk_autostart: "Autostart on Windows boot",
        chk_tray: "Start minimized to tray",
        p_audio_stream: "Sounds & Capture",
        chk_sound_alerts: "Sound alert at 10 sec",
        lbl_volume: "Alert Volume",
        chk_streamer_mode: "Hide from OBS / Capture",
        p_pro_features: "PRO Features",
        pro_burst_calc: "Smart Burst Calculator",
        pro_burst_desc: "Lion combo damage",
        pro_tactical_overlay: "Tactical Overlay (Hotkeys)",
        pro_tactical_desc: "Ctrl+Numpad 1/2/0",
        pro_micro_assistant: "Pro-Micro Efficiency",
        pro_micro_desc: "AGI Treads alert",
        p_edit_interface: "Interface Editor",
        btn_edit_interface: "✏️ Edit Interface",
        edit_mode_desc: "Drag widgets with mouse. Click again to exit.",
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
let isEditMode = false;

// ============================================================================
// i18n FUNCTION - Apply translations to all elements with data-i18n attribute
// ============================================================================
function setLanguage(lang) {
    currentLang = lang || 'ru';
    localStorage.setItem('neonblossom_language', currentLang);
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang] && translations[currentLang][key]) {
            // Handle different element types
            if (el.tagName === 'OPTION') {
                el.textContent = translations[currentLang][key];
            } else if (el.tagName === 'INPUT' && el.type !== 'checkbox') {
                el.placeholder = translations[currentLang][key];
            } else {
                el.innerText = translations[currentLang][key];
            }
        }
    });
}

// ============================================================================
// TAB SWITCHING
// ============================================================================
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active-content'));
        
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(`tab-${tabId}`).classList.add('active-content');
    });
});

// ============================================================================
// EDIT MODE TOGGLE - DRAGGABLE WIDGETS
// ============================================================================
document.getElementById('btnEditMode').addEventListener('click', () => {
    isEditMode = !isEditMode;
    const btn = document.getElementById('btnEditMode');
    
    if (isEditMode) {
        btn.innerHTML = currentLang === 'ru' ? '✅ Выйти из режима' : '✅ Exit Edit Mode';
        btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
    } else {
        btn.innerHTML = currentLang === 'ru' ? '✏️ Редактировать интерфейс' : '✏️ Edit Interface';
        btn.style.background = '';
    }
    
    // Send IPC to main process to toggle mouse events
    ipcRenderer.send('toggle-edit-mode', isEditMode);
});

// Listen for edit mode confirmation from main process
ipcRenderer.on('edit-mode-toggled', (event, enabled) => {
    console.log('Edit mode toggled:', enabled);
});

// ============================================================================
// GSI STATUS LISTENER
// ============================================================================
ipcRenderer.on('gsi-status', (event, status) => {
    const dot = document.getElementById('gsiDot');
    const txt = document.getElementById('gsiStatus');
    
    if (status) {
        dot.classList.add('active');
        txt.textContent = currentLang === 'ru' ? 'Подключено' : 'Connected';
        txt.style.color = '#22c55e';
    } else {
        dot.classList.remove('active');
        txt.textContent = currentLang === 'ru' ? 'Отключено' : 'Disconnected';
        txt.style.color = '#64748b';
    }
});

// ============================================================================
// PRO CONFIG HANDLING
// ============================================================================
ipcRenderer.on('pro-config', (event, config) => {
    currentProConfig = config;
    document.getElementById('enableBurstCalc').checked = config.burstCalculator;
    document.getElementById('enableTacticalOverlay').checked = config.tacticalOverlay;
    document.getElementById('enableMicroAssistant').checked = config.microAssistant;
    
    // Set hotkey selects
    document.getElementById('blackHoleKey').value = config.tacticalHotkeys.blackHole.key;
    document.getElementById('ravageKey').value = config.tacticalHotkeys.ravage.key;
    document.getElementById('roshanKey').value = config.tacticalHotkeys.roshan.key;
});

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

// Event listeners for PRO features
document.getElementById('enableBurstCalc').addEventListener('change', sendProConfig);
document.getElementById('enableTacticalOverlay').addEventListener('change', sendProConfig);
document.getElementById('enableMicroAssistant').addEventListener('change', sendProConfig);

// Apply hotkeys button
document.getElementById('btnApplyHotkeys').addEventListener('click', () => {
    sendProConfig();
    const btn = document.getElementById('btnApplyHotkeys');
    const originalText = btn.textContent;
    btn.textContent = currentLang === 'ru' ? '✓ Применено' : '✓ Applied';
    btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 1500);
});

// ============================================================================
// CONFIG SENDING
// ============================================================================
function sendConfig() {
    const config = {
        size: parseInt(document.getElementById('size').value),
        iconScale: parseInt(document.getElementById('iconScale').value),
        opacity: parseInt(document.getElementById('opacity').value) / 100,
        position: document.getElementById('mapPosition').value,
        showBorder: document.getElementById('showBorder').checked,
        borderColor: document.getElementById('borderColor').value,
        altOnly: document.getElementById('altOnly').checked,
        showIcons: document.getElementById('showIcons').checked,
        enabledRunes: {
            wisdom: document.getElementById('enableWisdom').checked,
            lotus: document.getElementById('enableLotus').checked,
            bounty: document.getElementById('enableBounty').checked,
            water: document.getElementById('enableWater').checked,
            active: document.getElementById('enableActive').checked
        },
        colors: {
            wisdom: document.getElementById('colorWisdom').value,
            lotus: document.getElementById('colorLotus').value,
            bounty: document.getElementById('colorBounty').value,
            water: document.getElementById('colorWater').value,
            active: document.getElementById('colorActive').value
        },
        hotkey: document.getElementById('hotkeySelect').value,
        streamerMode: document.getElementById('streamerMode').checked,
        soundAlerts: document.getElementById('soundAlerts').checked,
        soundVolume: parseInt(document.getElementById('soundVolume').value) / 100
    };
    
    ipcRenderer.send('update-config', config);
    localStorage.setItem('neonblossom_config', JSON.stringify(config));
}

// Value displays
['size', 'iconScale', 'opacity', 'soundVolume'].forEach(id => {
    const el = document.getElementById(id);
    const valEl = document.getElementById(id === 'size' ? 'valSize' : 
                                          id === 'iconScale' ? 'valScale' : 
                                          id === 'opacity' ? 'valOp' : 'valVol');
    el.addEventListener('input', () => {
        valEl.textContent = id === 'opacity' || id === 'soundVolume' 
            ? el.value + '%' 
            : el.value + 'px';
    });
});

// Apply button
document.getElementById('btnApply').addEventListener('click', () => {
    sendConfig();
    sendProConfig();
    
    const btn = document.getElementById('btnApply');
    const originalText = btn.textContent;
    btn.textContent = currentLang === 'ru' ? '✓ Применено' : '✓ Applied';
    btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 1500);
});

// Exit button
document.getElementById('btnExit').addEventListener('click', () => {
    ipcRenderer.send('close-app');
});

// Language selector
document.getElementById('appLanguage').addEventListener('change', (e) => {
    setLanguage(e.target.value);
});

// Initialize
setLanguage('ru');
sendConfig();
