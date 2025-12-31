/* --- НАСТРОЙКИ --- */
const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    defaultImage: "logo.jpg", 
    refreshTime: 8000 
};

// Проверка: мы в приложении или в браузере?
const isApp = (typeof window.Android !== "undefined");

// Создаем плеер ПУСТЫМ (чтобы не банило за двойное подключение)
let audio = new Audio(); 
let isPlaying = false; 

/* --- ЗАПУСК ПРИЛОЖЕНИЯ --- */
window.onload = function() {
    console.log("App started. Mode: " + (isApp ? "Android" : "Browser"));

    // Если это Браузер - подготавливаем ссылку (но не запускаем, пока не нажмут Play)
    if (!isApp) {
        audio.src = CONFIG.streamUrl;
    } else {
        // Если Android - считаем, что Java сама разберется, но ставим флаг
        // (Хотя по умолчанию Java-плеер тоже ждет нажатия)
        isPlaying = false; 
    }

    // Инициализация всех модулей (с защитой от ошибок)
    safeExecute(initPlayer, "Player Init");
    safeExecute(initVolume, "Volume Init");
    safeExecute(loadAlarms, "Alarms Load");
    safeExecute(startAlarmClock, "Alarm Clock");
    
    // Загрузка данных (Инфо и История)
    updateMetadata();
    setInterval(updateMetadata, CONFIG.refreshTime);
    
    // Аналитика (если нужно)
    // safeExecute(initPulse, "Analytics");
};

// Функция для безопасного запуска (чтобы одна ошибка не ломала всё)
function safeExecute(func, name) {
    try {
        func();
    } catch (e) {
        console.error("Error in " + name + ":", e);
    }
}

/* ================== ЛОГИКА ВКЛАДОК ================== */
window.openTab = function(tabName, btnElement) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(tabName);
    if (target) target.classList.add('active');
    
    if (btnElement) btnElement.classList.add('active');
};

/* ================== ПЛЕЕР И МОСТ JS <-> JAVA ================== */
function initPlayer() {
    const playBtn = document.getElementById('play-btn');
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');

    if (!playBtn) return;

    playBtn.addEventListener('click', () => {
        togglePlayState();
    });
}

function togglePlayState() {
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');

    /* --- СЦЕНАРИЙ 1: ANDROID --- */
    if (isApp) {
        if (isPlaying) {
            window.Android.pauseAudio();
            if(icon) icon.className = "fas fa-play";
            if(playerDiv) playerDiv.classList.remove('playing');
            isPlaying = false;
        } else {
            window.Android.playAudio();
            if(icon) icon.className = "fas fa-pause";
            if(playerDiv) playerDiv.classList.add('playing');
            isPlaying = true;
        }
        return;
    }

    /* --- СЦЕНАРИЙ 2: БРАУЗЕР --- */
    if (isPlaying) {
        audio.pause();
        audio.src = ""; // Сброс буфера
        
        if(icon) icon.className = "fas fa-play";
        if(playerDiv) playerDiv.classList.remove('playing');
        isPlaying = false;
    } else {
        // Добавляем время, чтобы избежать кэширования потока
        audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
        audio.load();
        audio.play().catch(e => console.log("Autoplay blocked by browser"));
        
        if(icon) icon.className = "fas fa-pause";
        if(playerDiv) playerDiv.classList.add('playing');
        isPlaying = true;
    }
}

/* ================== ГРОМКОСТЬ ================== */
function initVolume() {
    const slider = document.getElementById('vol-slider');
    if (!slider) return;

    let savedVol = localStorage.getItem('savedVolume');
    let finalVol = savedVol !== null ? parseFloat(savedVol) : 1.0;
    
    slider.value = finalVol;
    
    // Если браузер - ставим громкость тегу audio
    if (!isApp) audio.volume = finalVol;
    // Если Android - шлем команду (с небольшой задержкой, чтобы плеер успел создаться)
    if (isApp) setTimeout(() => { try { window.Android.setVolume(finalVol); } catch(e){} }, 1000);

    slider.addEventListener('input', (e) => {
        let vol = parseFloat(e.target.value);
        localStorage.setItem('savedVolume', vol);

        if (isApp) {
            try { window.Android.setVolume(vol); } catch(e) {}
        } else {
            audio.volume = vol;
        }
        
        // Логика "Стоп при 0"
        if (vol === 0 && isPlaying) {
            togglePlayState();
        } else if (vol > 0 && !isPlaying) {
            togglePlayState();
        }
    });
}

/* ================== ЗАГРУЗКА ИНФО (FIX) ================== */
function updateMetadata() {
    // Используем уникальный timestamp чтобы браузер не кэшировал запрос
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(res => {
            if (!res.ok) throw new Error("API Network Error");
            return res.json();
        })
        .then(data => {
            // 1. Текущий трек
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                
                // Безопасное обновление DOM (проверяем, есть ли элементы)
                safeSetText('track-name', song.title);
                
                if (song.artist) {
                    safeSetText('artist-name', song.artist);
                    const sep = document.getElementById('track-sep');
                    if(sep) sep.style.display = "inline";
                } else {
                    safeSetText('artist-name', "");
                    const sep = document.getElementById('track-sep');
                    if(sep) sep.style.display = "none";
                }
                
                const imgEl = document.getElementById('mini-art');
                let artUrl = fixUrl(song.art);
                if (imgEl && imgEl.src !== artUrl) imgEl.src = artUrl;
            }
            
            // 2. История
            if (data.song_history && data.song_history.length > 0) {
                renderHistory(data.song_history);
            }
        })
        .catch(err => {
            console.warn("Metadata load failed:", err);
            // Можно написать "Ошибка сети" в плеере, если нужно
        });
}

// Вспомогательная функция для текста
function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function renderHistory(history) {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    let html = '';
    history.forEach(item => {
        const song = item.song;
        const art = fixUrl(song.art);
        // Экранирование кавычек для onclick
        const safeTitle = (song.title || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeArtist = (song.artist || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        html += `
        <div class="history-item">
            <img src="${art}" class="hist-img" onerror="this.src='${CONFIG.defaultImage}'">
            <div class="hist-info">
                <span class="hist-title">${song.title}</span>
                <span class="hist-artist">${song.artist}</span>
            </div>
            <button class="sku-btn" onclick="openSku('${safeTitle}', '${safeArtist}', '${art}')">
                <i class="fas fa-info"></i>
            </button>
        </div>`;
    });
    
    // Меняем HTML только если он изменился (чтобы не моргало)
    if (container.innerHTML !== html) {
        container.innerHTML = html;
    }
}

function fixUrl(url) {
    if (!url || url.includes('generic')) return CONFIG.defaultImage;
    if (url.startsWith('http:')) return url.replace('http:', 'https:');
    return url;
}

/* ================== МОДАЛКА ================== */
window.openSku = function(title, artist, art) {
    const modal = document.getElementById('info-modal');
    const mArt = document.getElementById('modal-art');
    const mTitle = document.getElementById('modal-title');
    const mArtist = document.getElementById('modal-artist');
    
    if(mArt) mArt.src = art;
    if(mTitle) mTitle.innerText = title;
    if(mArtist) mArtist.innerText = artist;
    if(modal) modal.classList.remove('hidden');
};

window.closeSku = function() {
    const modal = document.getElementById('info-modal');
    if(modal) modal.classList.add('hidden');
};

/* ================== ТАЙМЕРЫ (С ЗАЩИТОЙ) ================== */
let sleepInterval = null;

window.updateSleepLabel = function(minutes) {
    const display = document.getElementById('timer-val-display');
    if(display) display.innerText = (minutes == 0) ? "Off" : minutes + " мин";
}

window.setSleepTimer = function(minutes) {
    window.cancelSleepTimer(); 
    if (minutes == 0) return; 
    
    const targetTime = Date.now() + (minutes * 60 * 1000);
    const statusDiv = document.getElementById('sleep-status');
    const countdownSpan = document.getElementById('sleep-countdown');
    
    if(statusDiv) statusDiv.style.display = "block"; 
    
    sleepInterval = setInterval(() => {
        const diff = targetTime - Date.now();
        if (diff <= 0) {
            stopRadioForce();
            window.cancelSleepTimer();
            const slider = document.getElementById('sleep-slider');
            const display = document.getElementById('timer-val-display');
            if(slider) slider.value = 0;
            if(display) display.innerText = "Off";
        } else {
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            if(countdownSpan) countdownSpan.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        }
    }, 1000);
}

window.cancelSleepTimer = function() {
    if (sleepInterval) clearInterval(sleepInterval);
    const statusDiv = document.getElementById('sleep-status');
    if(statusDiv) statusDiv.style.display = "none";
}

// Функции для управления плеером из таймера
function playRadioForce() { if (!isPlaying) togglePlayState(); }
function stopRadioForce() { if (isPlaying) togglePlayState(); }

/* ================== БУДИЛЬНИК ================== */
let alarms = []; 
let alarmChecker = null;
let lastTriggeredTime = "";

function loadAlarms() {
    try {
        const stored = localStorage.getItem('myAlarms');
        if (stored) { alarms = JSON.parse(stored); renderAlarms(); }
    } catch(e) {
        console.error("Alarms load error", e);
        alarms = []; // Сброс при ошибке
    }
}
function saveAlarms() {
    localStorage.setItem('myAlarms', JSON.stringify(alarms));
    renderAlarms();
}

let selectedDays = [];
window.toggleDay = function(el) {
    const day = parseInt(el.getAttribute('data-day'));
    if (selectedDays.includes(day)) {
        selectedDays = selectedDays.filter(d => d !== day);
        el.classList.remove('selected');
    } else {
        selectedDays.push(day);
        el.classList.add('selected');
    }
}
window.addAlarm = function() {
    const timeInput = document.getElementById('new-alarm-time');
    if(!timeInput) return;
    const time = timeInput.value;
    if (!time) { alert("Выберите время!"); return; }
    if (selectedDays.length === 0) { alert("Выберите дни недели!"); return; }
    alarms.push({ time: time, days: [...selectedDays], active: true });
    saveAlarms();
    timeInput.value = "";
    selectedDays = [];
    document.querySelectorAll('.day-check').forEach(el => el.classList.remove('selected'));
}
window.deleteAlarm = function(index) {
    alarms.splice(index, 1);
    saveAlarms();
}
function renderAlarms() {
    const container = document.getElementById('alarms-list');
    if (!container) return;
    container.innerHTML = "";
    const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    alarms.forEach((alarm, index) => {
        let daysStr = alarm.days.map(d => dayNames[d]).join(", ");
        if (alarm.days.length === 7) daysStr = "Каждый день";
        const div = document.createElement('div');
        div.className = "alarm-item";
        div.innerHTML = `
            <div><div class="alarm-time">${alarm.time}</div><div class="alarm-days">${daysStr}</div></div>
            <button class="alarm-del-btn" onclick="deleteAlarm(${index})"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
    });
}
function startAlarmClock() {
    if (alarmChecker) clearInterval(alarmChecker);
    alarmChecker = setInterval(() => {
        const now = new Date();
        const currentDay = now.getDay();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${h}:${m}`;
        if (currentTime === lastTriggeredTime) return;
        alarms.forEach(alarm => {
            if (alarm.active && alarm.time === currentTime && alarm.days.includes(currentDay)) {
                triggerAlarm();
                lastTriggeredTime = currentTime;
            }
        });
    }, 1000);
}
function triggerAlarm() {
    const slider = document.getElementById('vol-slider');
    if (!slider) return;
    slider.value = 0;
    slider.dispatchEvent(new Event('input'));
    playRadioForce();
    let vol = 0;
    let fadeInterval = setInterval(() => {
        vol += 0.05;
        if (vol >= 1.0) { vol = 1.0; clearInterval(fadeInterval); }
        slider.value = vol;
        slider.dispatchEvent(new Event('input'));
    }, 250);
}
