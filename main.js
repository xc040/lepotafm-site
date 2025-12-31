/* --- НАСТРОЙКИ --- */
const CONFIG = {
    // Ссылки на поток и API
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    defaultImage: "logo.jpg", 
    refreshTime: 8000 
};

// Определяем, где мы: в Приложении или в Браузере
const isApp = (typeof window.Android !== "undefined");

// Создаем JS-плеер (он будет работать ТОЛЬКО в браузере)
let audio = new Audio(); 
let isPlaying = false; 

/* --- ЗАПУСК --- */
window.onload = function() {
    // Если мы в приложении - сразу ставим статус "Играет", т.к. ExoPlayer стартует сам
    if (isApp) {
        isPlaying = true;
    } else {
        // Если в браузере - готовим ссылку
        audio.src = CONFIG.streamUrl;
    }

    initPlayer();
    initVolume();
    loadAlarms(); 
    startAlarmClock(); 
    
    updateMetadata();
    setInterval(updateMetadata, CONFIG.refreshTime);
};

/* ================== ЛОГИКА ВКЛАДОК ================== */
window.openTab = function(tabName, btnElement) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(tabName);
    if (target) target.classList.add('active');
    
    if (btnElement) btnElement.classList.add('active');
};

/* ================== ПЛЕЕР (МОСТ JS <-> JAVA) ================== */
function initPlayer() {
    const playBtn = document.getElementById('play-btn');
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');

    if (!playBtn) return;

    // Визуальная инициализация при старте
    if (isPlaying) {
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

    /* --- СЦЕНАРИЙ 1: МЫ В ПРИЛОЖЕНИИ (JAVA) --- */
    if (isApp) {
        if (isPlaying) {
            // Шлем команду в Java: "Пауза"
            window.Android.pauseAudio();
            
            // Меняем иконки локально
            if(icon) icon.className = "fas fa-play";
            if(playerDiv) playerDiv.classList.remove('playing');
            isPlaying = false;
        } else {
            // Шлем команду в Java: "Играть"
            window.Android.playAudio();
            
            // Меняем иконки локально
            if(icon) icon.className = "fas fa-pause";
            if(playerDiv) playerDiv.classList.add('playing');
            isPlaying = true;
        }
        return; // Выходим, чтобы JS-плеер не включился
    }

    /* --- СЦЕНАРИЙ 2: МЫ В БРАУЗЕРЕ (JS) --- */
    if (isPlaying) {
        audio.pause();
        audio.src = ""; // Сброс буфера (экономия трафика)
        
        if(icon) icon.className = "fas fa-play";
        if(playerDiv) playerDiv.classList.remove('playing');
        isPlaying = false;
    } else {
        audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
        audio.load();
        audio.play().catch(e => console.log("Autoplay block"));
        
        if(icon) icon.className = "fas fa-pause";
        if(playerDiv) playerDiv.classList.add('playing');
        isPlaying = true;
    }
}

/* ================== ГРОМКОСТЬ (ИСПРАВЛЕНО) ================== */
function initVolume() {
    const slider = document.getElementById('vol-slider');
    if (!slider) return;

    // Восстанавливаем сохраненную громкость
    let savedVol = localStorage.getItem('savedVolume');
    let finalVol = savedVol !== null ? parseFloat(savedVol) : 1.0;
    if (finalVol < 0.1) finalVol = 0.5; // Защита от тишины

    slider.value = finalVol;
    
    // Применяем громкость сразу при старте
    if (isApp) {
        window.Android.setVolume(finalVol);
    } else {
        audio.volume = finalVol;
    }

    // Обработка движения ползунка
    slider.addEventListener('input', (e) => {
        let vol = parseFloat(e.target.value);
        localStorage.setItem('savedVolume', vol);

        if (isApp) {
            // Шлем команду в Java
            window.Android.setVolume(vol);
        } else {
            // Меняем в браузере
            audio.volume = vol;
        }
        
        // Логика "Стоп при громкости 0"
        if (vol === 0 && isPlaying) {
            togglePlayState();
        } else if (vol > 0 && !isPlaying) {
            togglePlayState();
        }
    });
}

/* ================== МЕТАДАННЫЕ (БЕЗ ИЗМЕНЕНИЙ) ================== */
function updateMetadata() {
    // Fetch данных (только текст, не грузит поток)
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

/* ================== ТАЙМЕРЫ И БУДИЛЬНИКИ (JS Logic) ================== */
// Эти функции управляют таймером локально. 
// Когда таймер истекает -> вызывается stopRadioForce()

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
window.cancelSl
