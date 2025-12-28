/* --- НАСТРОЙКИ --- */
const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    defaultImage: "logo.jpg", 
    refreshTime: 5000 
};

// Глобальные переменные (доступны для features.js)
const isApp = window.location.search.includes('app=true') || (typeof window.Android !== "undefined");
let audio = new Audio(CONFIG.streamUrl);
let isPlaying = false; 

// Автостарт в приложении
if (isApp) isPlaying = true;

window.onload = function() {
    initPlayer();
    initVolume();
    updateMetadataLoop();
};

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateMetadata();
});

function updateMetadataLoop() {
    updateMetadata();
    setTimeout(updateMetadataLoop, CONFIG.refreshTime);
}

/* --- ПЛЕЕР --- */
function initPlayer() {
    const playBtn = document.getElementById('play-btn');
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');

    if (!playBtn) return;

    // Визуальный старт если приложение
    if (isApp) {
        if(icon) icon.className = "fas fa-pause";
        if(playerDiv) playerDiv.classList.add('playing');
    }

    playBtn.addEventListener('click', () => {
        togglePlayState();
    });
}

// Вынесли функцию переключения, чтобы будильник мог её нажимать
function togglePlayState() {
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');

    // ПРИЛОЖЕНИЕ
    if (isApp && window.Android) {
        try {
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
        } catch(e) {}
        return;
    }

    // БРАУЗЕР
    if (isPlaying) {
        audio.pause();
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

/* --- УМНАЯ ГРОМКОСТЬ --- */
function initVolume() {
    const slider = document.getElementById('vol-slider');
    if (!slider) return;

    let savedVol = localStorage.getItem('savedVolume');
    let finalVol = savedVol !== null ? parseFloat(savedVol) : 1.0;
    if (finalVol < 0.1) finalVol = 0.5; // Защита от тишины

    slider.value = finalVol;
    audio.volume = finalVol;
    
    // Попытка установить громкость в приложении (если поддерживается)
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
    });
}

/* --- ВКЛАДКИ --- */
window.openTab = function(tabName, btnElement) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    if (btnElement) btnElement.classList.add('active');
};

/* --- МЕТАДАННЫЕ --- */
function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(res => {
            if (!res.ok) throw new Error("Err");
            return res.json();
        })
        .then(data => {
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                document.getElementById('track-name').innerText = song.title;
                document.getElementById('artist-name').innerText = song.artist;
                
                let artUrl = fixUrl(song.art);
                const img = document.getElementById('mini-art');
                if (img && img.src !== artUrl) img.src = artUrl;
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
    history.slice(0, 10).forEach(item => {
        html += `
        <div class="history-item">
            <img src="${fixUrl(item.song.art)}" class="hist-img" onerror="this.src='${CONFIG.defaultImage}'">
            <div class="hist-info">
                <span class="hist-title">${item.song.title}</span>
                <span class="hist-artist">${item.song.artist}</span>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function fixUrl(url) {
    if (!url || url.includes('generic')) return CONFIG.defaultImage;
    if (url.startsWith('http:')) return url.replace('http:', 'https:');
    return url;
}
