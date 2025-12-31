/* --- НАСТРОЙКИ --- */
const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    defaultImage: "logo.jpg", 
    refreshTime: 8000 
};

// Глобальные переменные
const isApp = window.location.search.includes('app=true') || (typeof window.Android !== "undefined");
let audio = new Audio(CONFIG.streamUrl);
let isPlaying = false; 

if (isApp) isPlaying = true;

/* --- ЗАПУСК --- */
window.onload = function() {
    initPlayer();
    initVolume();
    loadAlarms(); 
    startAlarmClock(); 
    updateMetadata();
    setInterval(updateMetadata, CONFIG.refreshTime);
};

/* ================== ЛОГИКА ВКЛАДОК (ГЛАВНОЕ ИСПРАВЛЕНИЕ) ================== */
window.openTab = function(tabName, btnElement) {
    // 1. Скрываем все вкладки (убираем класс active)
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    
    // 2. Деактивируем все кнопки
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    // 3. Показываем нужную вкладку (добавляем active)
    const target = document.getElementById(tabName);
    if (target) {
        target.classList.add('active');
    }
    
    // 4. Подсвечиваем кнопку
    if (btnElement) {
        btnElement.classList.add('active');
    }
};

/* ================== ПЛЕЕР ================== */
function initPlayer() {
    const playBtn = document.getElementById('play-btn');
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');

    if (!playBtn) return;

    if (isApp) {
        if(icon) icon.className = "fas fa-pause";
        if(playerDiv) playerDiv.classList.add('playing');
    }

    playBtn.addEventListener('click', () => {
        togglePlayState();
    });
}

function togglePlayState() {
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');

    if (isApp && window.Android) {
        // Логика для Android (если будет реализована)
        try { /* ... */ } catch(e) {}
        return;
    }

    // Логика браузера/простого APK
    if (isPlaying) {
        audio.pause();
        audio.src = ""; // Сброс буфера
        audio.load();
        
        if(icon) icon.className = "fas fa-play";
        if(playerDiv) playerDiv.classList.remove('playing');
        isPlaying = false;
    } else {
        audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
        audio.play().catch(e => console.log("Autoplay block"));
        
        if(icon) icon.className = "fas fa-pause";
        if(playerDiv) playerDiv.classList.add('playing');
        isPlaying = true;
    }
}

function initVolume() {
    const slider = document.getElementById('vol-slider');
    if (!slider) return;

    let savedVol = localStorage.getItem('savedVolume');
    let finalVol = savedVol !== null ? parseFloat(savedVol) : 1.0;
    if (finalVol < 0.1) finalVol = 0.5;

    slider.value = finalVol;
    audio.volume = finalVol;

    slider.addEventListener('input', (e) => {
        let vol = parseFloat(e.target.value);
        localStorage.setItem('savedVolume', vol);
        audio.volume = vol;
        
        // Стоп при громкости 0
        if (vol === 0 && isPlaying) {
            togglePlayState();
        } else if (vol > 0 && !isPlaying) {
            togglePlayState();
        }
    });
}

/* ================== МЕТАДАННЫЕ ================== */
function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(res => res.json())
        .then(data => {
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                const titleEl = document.getElementById('track-name');
                const artistEl = document.getElementById('artist-name');
                const imgEl = document.getElementById('mini-art');
                const sepEl = document.getElementById('track-sep');

                if (titleEl) titleEl.innerText = song.title;
                if (song.artist) {
                    if (artistEl) artistEl.innerText = song.artist;
                    if (sepEl) sepEl.style.display = "inline";
                } else {
                    if (artistEl) artistEl.innerText = "";
                    if (sepEl) sepEl.style.display = "none";
                }
                
                let artUrl = fixUrl(song.art);
                if (imgEl && imgEl.src !== artUrl) imgEl.src = artUrl;
            }
            if (data.song_history && data.song_history.length > 0) {
                renderHistory(data.song_history);
            }
        })
        .catch(err => {});
}

function renderHistory(history) {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    let html = '';
    history.forEach(item => {
        const song = item.song;
        const art = fixUrl(song.art);
        const safeTitle = song.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeArtist = song.artist.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeArt = art;

        html += `
        <div class="history-item">
            <img src="${art}" class="hist-img" onerror="this.src='${CONFIG.defaultImage}'">
            <div class="hist-info">
                <span class="hist-title">${song.title}</span>
                <span class="hist-artist">${song.artist}</span>
            </div>
            <button class="sku-btn" onclick="openSku('${safeTitle}', '${safeArtist}', '${safeArt}')">
                <i class="fas fa-info"></i>
            </button>
        </div>`;
    });
    
    if (container.innerHTML !== html) {
        container.innerHTML = html;
    }
}

function fixUrl(url) {
    if (!url || url.includes('generic')) return CONFIG.defaultImage;
    if (url.startsWith('http:')) return url.replace('http:', 'https:');
    return url;
}

window.openSku = function(title, artist, art) {
    const modal = document.getElementById('info-modal');
    const mArt = document.getElementById('modal-art');
    if(mArt) mArt.src = art;
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-artist').innerText = artist;
    if(modal) modal.classList.remove('hidden');
};

window.closeSku = function() {
    const modal = document.getElementById('info-modal');
    if(modal) modal.classList.add('hidden');
};

/* ================== ТАЙМЕРЫ И БУДИЛЬНИКИ ================== */
let sleepInterval = null;
window.updateSleepLabel = function(minutes) {
    const display = document.getElementById('timer-val-display');
    if (minutes == 0) display.innerText = "Off";
    else display.innerText = minutes + " мин";
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

let alarms = []; 
let alarmChecker = null;
let lastTriggeredTime = "";

function loadAlarms() {
    const stored = localStorage.getItem('myAlarms');
    if (stored) { alarms = JSON.parse(stored); renderAlarms(); }
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
