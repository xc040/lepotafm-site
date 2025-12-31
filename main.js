/* --- НАСТРОЙКИ --- */
const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    defaultImage: "logo.jpg", 
    refreshTime: 8000 
};

// Глобальные переменные
const isApp = (typeof window.Android !== "undefined");
let audio = new Audio();
let isPlaying = false; 

/* --- ЗАПУСК --- */
window.onload = function() {
    // ВАЖНО: Если мы в браузере - готовим ссылку. Если в приложении - НЕТ.
    if (!isApp) {
        audio.src = CONFIG.streamUrl;
    }

    initPlayer();
    initVolume();
    loadAlarms(); 
    startAlarmClock(); 
    
    // СТАРЫЙ, ПРОВЕРЕННЫЙ МЕТОД ЗАГРУЗКИ
    updateMetadata();
    setInterval(updateMetadata, CONFIG.refreshTime);
};

/* ================== ЛОГИКА ВКЛАДОК ================== */
window.openTab = function(tabName, btnElement) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    if (btnElement) btnElement.classList.add('active');
};

/* ================== ПЛЕЕР (С ЗАЩИТОЙ ОТ БАНА) ================== */
function initPlayer() {
    const playBtn = document.getElementById('play-btn');
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');

    if (!playBtn) return;

    if (isApp) {
        // Если Java-плеер скажет что он играет, можно тут обновить UI
        // Но пока просто ставим паузу по умолчанию
    }

    playBtn.addEventListener('click', () => {
        togglePlayState();
    });
}

function togglePlayState() {
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');

    // 1. ЕСЛИ АНДРОИД (Командуем Java)
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

    // 2. ЕСЛИ БРАУЗЕР (Сами играем)
    if (isPlaying) {
        audio.pause();
        audio.src = ""; 
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

/* ================== ГРОМКОСТЬ ================== */
function initVolume() {
    const slider = document.getElementById('vol-slider');
    if (!slider) return;

    let savedVol = localStorage.getItem('savedVolume');
    let finalVol = savedVol !== null ? parseFloat(savedVol) : 1.0;
    if (finalVol < 0.1) finalVol = 0.5;

    slider.value = finalVol;
    if (!isApp) audio.volume = finalVol;
    
    // Отправляем в Android с задержкой, чтобы он успел инициализироваться
    if (isApp) setTimeout(() => { try { window.Android.setVolume(finalVol); } catch(e){} }, 1000);

    slider.addEventListener('input', (e) => {
        let vol = parseFloat(e.target.value);
        localStorage.setItem('savedVolume', vol);
        
        if (isApp) {
            try { window.Android.setVolume(vol); } catch(e) {}
        } else {
            audio.volume = vol;
        }

        if (vol === 0 && isPlaying) togglePlayState();
        else if (vol > 0 && !isPlaying) togglePlayState();
    });
}

/* ================== ЗАГРУЗКА ДАННЫХ (СТАРАЯ ВЕРСИЯ) ================== */
function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(res => res.json())
        .then(data => {
            // Текущий трек
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
            // История
            if (data.song_history && data.song_history.length > 0) {
                renderHistory(data.song_history);
            }
        })
        .catch(err => {
            // Тихо падаем
        });
}

function renderHistory(history) {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    let html = '';
    history.forEach(item => {
        const song = item.song;
        const art = fixUrl(song.art);
        const safeTitle = (song.title || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeArtist = (song.artist || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');
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

// МОДАЛКА
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

/* ================== ТАЙМЕР И БУДИЛЬНИК ================== */
// ... (Тут всё стандартно, без изменений)
let sleepInterval = null;
window.updateSleepLabel = function(m) {
    const d = document.getElementById('timer-val-display');
    if(d) d.innerText = (m == 0) ? "Off" : m + " мин";
}
window.setSleepTimer = function(m) {
    window.cancelSleepTimer(); 
    if (m == 0) return; 
    const t = Date.now() + (m * 60 * 1000);
    document.getElementById('sleep-status').style.display = "block"; 
    sleepInterval = setInterval(() => {
        const diff = t - Date.now();
        if (diff <= 0) {
            if(isPlaying) togglePlayState();
            window.cancelSleepTimer();
            document.getElementById('sleep-slider').value = 0;
            document.getElementById('timer-val-display').innerText = "Off";
        } else {
            const min = Math.floor(diff/60000);
            const sec = Math.floor((diff%60000)/1000);
            document.getElementById('sleep-countdown').innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        }
    }, 1000);
}
window.cancelSleepTimer = function() {
    if (sleepInterval) clearInterval(sleepInterval);
    document.getElementById('sleep-status').style.display = "none";
}

let alarms = []; 
function loadAlarms() { const s = localStorage.getItem('myAlarms'); if(s) { alarms = JSON.parse(s); renderAlarms(); } }
function saveAlarms() { localStorage.setItem('myAlarms', JSON.stringify(alarms)); renderAlarms(); }
let selectedDays = [];
window.toggleDay = function(el) {
    const d = parseInt(el.getAttribute('data-day'));
    if (selectedDays.includes(d)) { selectedDays = selectedDays.filter(x => x !== d); el.classList.remove('selected'); }
    else { selectedDays.push(d); el.classList.add('selected'); }
}
window.addAlarm = function() {
    const inp = document.getElementById('new-alarm-time');
    if(!inp || !inp.value || selectedDays.length === 0) return alert("Время и дни!");
    alarms.push({ time: inp.value, days: [...selectedDays], active: true });
    saveAlarms();
    inp.value = ""; selectedDays = [];
    document.querySelectorAll('.day-check').forEach(el => el.classList.remove('selected'));
}
window.deleteAlarm = function(i) { alarms.splice(i, 1); saveAlarms(); }
function renderAlarms() {
    const c = document.getElementById('alarms-list');
    if(!c) return;
    c.innerHTML = "";
    const dn = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    alarms.forEach((a, i) => {
        let ds = a.days.length === 7 ? "Каждый день" : a.days.map(d => dn[d]).join(", ");
        c.innerHTML += `<div class="alarm-item"><div><div class="alarm-time">${a.time}</div><div class="alarm-days">${ds}</div></div><button class="alarm-del-btn" onclick="deleteAlarm(${i})"><i class="fas fa-trash"></i></button></div>`;
    });
}
function startAlarmClock() {
    setInterval(() => {
        const now = new Date();
        const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        alarms.forEach(a => {
            if (a.active && a.time === t && a.days.includes(now.getDay()) && now.getSeconds() === 0) triggerAlarm();
        });
    }, 1000);
}
function triggerAlarm() {
    const s = document.getElementById('vol-slider');
    if(!s) return;
    s.value = 0; s.dispatchEvent(new Event('input'));
    if(!isPlaying) togglePlayState();
    let v = 0;
    let i = setInterval(() => { v += 0.05; if(v>=1) {v=1; clearInterval(i);} s.value = v; s.dispatchEvent(new Event('input')); }, 250);
}
