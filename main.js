/* --- НАСТРОЙКИ --- */
const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    defaultImage: "logo.jpg", 
    refreshTime: 8000 
};

const isApp = window.location.search.includes('app=true') || (typeof window.Android !== "undefined");
let audio = new Audio(CONFIG.streamUrl);
let isPlaying = false; 

if (isApp) isPlaying = true;

window.onload = function() {
    initPlayer();
    initVolume();
    loadAlarms(); 
    startAlarmClock(); 
    updateMetadata(); 
    setInterval(updateMetadata, CONFIG.refreshTime);
};

/* ================== ПЛЕЕР ================== */
function initPlayer() {
    const playBtn = document.getElementById('play-btn');
    const icon = document.getElementById('play-icon');

    if (!playBtn) return;

    if (isApp) {
        if(icon) icon.className = "fas fa-pause";
    }

    playBtn.addEventListener('click', () => {
        togglePlayState();
    });
}

function togglePlayState() {
    const icon = document.getElementById('play-icon');

    // ПРИЛОЖЕНИЕ
    if (isApp && window.Android) {
        try {
            if (isPlaying) {
                window.Android.pauseAudio();
                if(icon) icon.className = "fas fa-play";
                isPlaying = false;
            } else {
                window.Android.playAudio();
                if(icon) icon.className = "fas fa-pause";
                isPlaying = true;
            }
        } catch(e) {}
        return;
    }

    // БРАУЗЕР
    if (isPlaying) {
        audio.pause();
        audio.src = ""; 
        audio.load();
        if(icon) icon.className = "fas fa-play";
        isPlaying = false;
    } else {
        audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
        audio.play().catch(e => console.log("Block"));
        if(icon) icon.className = "fas fa-pause";
        isPlaying = true;
    }
}

// Функции для будильника
function playRadioForce() {
    if (isApp && window.Android) {
        try { 
            window.Android.playAudio(); 
            const icon = document.getElementById('play-icon');
            if(icon) icon.className = "fas fa-pause";
            isPlaying = true;
        } catch(e) {}
    } else {
        if (!isPlaying) togglePlayState();
    }
}

function stopRadioForce() {
    if (isPlaying) togglePlayState();
}

/* ================== ГРОМКОСТЬ (ЧЕСТНАЯ СТАТИСТИКА) ================== */
function initVolume() {
    const slider = document.getElementById('vol-slider');
    if (!slider) return;

    let savedVol = localStorage.getItem('savedVolume');
    let finalVol = savedVol !== null ? parseFloat(savedVol) : 1.0;
    
    slider.value = finalVol;
    audio.volume = finalVol;
    
    if (isApp && window.Android && window.Android.setVolume) {
        try { window.Android.setVolume(finalVol); } catch(e){}
    }

    slider.addEventListener('input', (e) => {
        let vol = parseFloat(e.target.value);
        localStorage.setItem('savedVolume', vol);
        audio.volume = vol;
        
        if (isApp && window.Android) {
            try { window.Android.setVolume(vol); } catch(e) {}
        }

        // ЛОГИКА ЭКОНОМИИ ТРАФИКА
        if (vol <= 0.01) {
            // Если громкость 0 - выключаем радио совсем
            if (isPlaying) stopRadioForce();
        } else {
            // Если громкость появилась, а радио молчит - включаем
            if (!isPlaying) playRadioForce();
        }
    });
}

/* ================== МЕТАДАННЫЕ (ИСПРАВЛЕН ТЕКСТ) ================== */
function updateMetadata() {
    fetch(CONFIG.apiUrl + "?nocache=" + Date.now())
        .then(res => res.json())
        .then(data => {
            // ТЕКУЩИЙ ТРЕК
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                
                // Формируем строку: если нет артиста, только название
                let tickerText = song.title;
                if (song.artist && song.artist.trim() !== "") {
                    tickerText = `${song.artist} - ${song.title}`;
                }
                
                // Бегущая строка
                const ticker = document.getElementById('track-ticker');
                if (ticker) ticker.innerText = tickerText + "       "; // Просто пробелы, без звезд
                
                // Картинка (если где-то есть)
                const imgEl = document.getElementById('mini-art');
                let artUrl = fixUrl(song.art);
                if (imgEl && imgEl.src !== artUrl) imgEl.src = artUrl;
            }
            // ИСТОРИЯ
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

// МОДАЛЬНОЕ ОКНО
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

/* ================== ВКЛАДКИ ================== */
window.openTab = function(tabName, btnElement) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(tabName);
    if (target) target.classList.add('active');
    
    if (btnElement) btnElement.classList.add('active');
};
