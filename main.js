/* --- НАСТРОЙКИ --- */
const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    defaultImage: "logo.jpg", 
    refreshTime: 5000 
};

const isApp = window.location.search.includes('app=true') || (typeof window.Android !== "undefined");
let audio = new Audio(CONFIG.streamUrl);
let isPlaying = false; 

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

    if (isPlaying) {
        audio.pause();
        if(icon) icon.className = "fas fa-play";
        if(playerDiv) playerDiv.classList.remove('playing');
        isPlaying = false;
    } else {
        audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
        audio.play().catch(e => console.log("Auto block"));
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
    if (finalVol < 0.1) finalVol = 0.5;

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
    });
}

/* --- ВКЛАДКИ --- */
window.openTab = function(tabName, btnElement) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    if (btnElement) btnElement.classList.add('active');
};

/* --- МЕТАДАННЫЕ И ИСТОРИЯ --- */
function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(res => res.json())
        .then(data => {
            // 1. ТЕКУЩИЙ ТРЕК (СТРОГО из playing)
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                document.getElementById('track-name').innerText = song.title;
                document.getElementById('artist-name').innerText = song.artist;
                
                let artUrl = fixUrl(song.art);
                const img = document.getElementById('mini-art');
                if (img && img.src !== artUrl) img.src = artUrl;
            }

            // 2. ИСТОРИЯ (Строго из history)
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
    // Берем историю. Иногда API дублирует текущую песню первой,
    // но мы выводим всё как дает сервер, чтобы не путаться.
    history.forEach(item => {
        const song = item.song;
        const art = fixUrl(song.art);
        // Экранируем кавычки для JS
        const safeTitle = song.title.replace(/'/g, "\\'"); 
        const safeArtist = song.artist.replace(/'/g, "\\'"); 
        const safeArt = art;

        html += `
        <div class="history-item">
            <img src="${art}" class="hist-img" onerror="this.src='${CONFIG.defaultImage}'">
            <div class="hist-info">
                <span class="hist-title">${song.title}</span>
                <span class="hist-artist">${song.artist}</span>
            </div>
            <!-- КНОПКА ИНФО (Вернулась!) -->
            <button class="sku-btn" onclick="openSku('${safeTitle}', '${safeArtist}', '${safeArt}')">
                <i class="fas fa-info"></i>
            </button>
        </div>`;
    });
    container.innerHTML = html;
}

function fixUrl(url) {
    if (!url || url.includes('generic')) return CONFIG.defaultImage;
    if (url.startsWith('http:')) return url.replace('http:', 'https:');
    return url;
}

// Функция для кнопки Инфо (пример заглушки или редиректа)
window.openSku = function(title, artist, art) {
    alert(`Инфо о треке:\n${artist} - ${title}`);
    // Тут можно сделать window.open('гугл поиск...')
};
