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

// В приложении автостарт
if (isApp) isPlaying = true;

window.onload = function() {
    initPlayer();
    initVolume(); // Запускаем умную громкость
    
    // Запуск вечного цикла обновлений
    updateMetadataLoop();
};

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateMetadata();
});

// Вечный цикл (защита от зависания)
function updateMetadataLoop() {
    updateMetadata();
    setTimeout(updateMetadataLoop, CONFIG.refreshTime);
}

/* --- ПЛЕЕР --- */
function initPlayer() {
    const playBtn = document.getElementById('play-btn');
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player'); // Блок для анимации

    if (!playBtn) return;

    // Старт в приложении
    if (isApp) {
        if(icon) icon.className = "fas fa-pause";
        if(playerDiv) playerDiv.classList.add('playing'); // Вращение!
    }

    playBtn.addEventListener('click', () => {
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
            audio.play().catch(e => console.log("Block"));
            if(icon) icon.className = "fas fa-pause";
            if(playerDiv) playerDiv.classList.add('playing');
            isPlaying = true;
        }
    });
}

/* --- УМНАЯ ГРОМКОСТЬ --- */
function initVolume() {
    const slider = document.getElementById('vol-slider');
    if (!slider) return;

    // 1. Восстанавливаем
    let savedVol = localStorage.getItem('savedVolume');
    let finalVol = 1.0; 

    if (savedVol !== null) {
        finalVol = parseFloat(savedVol);
        // Если меньше 25% -> ставим 25%
        if (finalVol < 0.25) finalVol = 0.25;
    }

    // 2. Применяем
    slider.value = finalVol;
    audio.volume = finalVol;
    if (isApp && window.Android && window.Android.setVolume) {
        try { window.Android.setVolume(finalVol); } catch(e){}
    }

    // 3. Слушаем
    slider.addEventListener('input', (e) => {
        let vol = parseFloat(e.target.value);
        localStorage.setItem('savedVolume', vol);

        if (isApp && window.Android) {
            try { window.Android.setVolume(vol); } catch(e) {}
        } else {
            audio.volume = vol;
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
            if (!res.ok) throw new Error("Server error");
            return res.json();
        })
        .then(data => {
            // ТЕКУЩИЙ ТРЕК
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                document.getElementById('track-name').innerText = song.title;
                document.getElementById('artist-name').innerText = song.artist;
                
                let artUrl = fixUrl(song.art);
                const img = document.getElementById('mini-art');
                if (img && img.src !== artUrl) img.src = artUrl;
            }

            // ИСТОРИЯ
            if (data.song_history && data.song_history.length > 0) {
                renderHistory(data.song_history);
            }
        })
        .catch(err => console.log("Waiting..."));
}

function renderHistory(history) {
    const container = document.getElementById('history-container');
    if (!container) return;

    let html = '';
    // Берем 10 последних
    history.slice(0, 10).forEach(item => {
        const song = item.song;
        const art = fixUrl(song.art);
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
            <button class="sku-btn" onclick="openSku('${safeTitle}', '${safeArtist}', '${safeArt}')">
                <i class="fas fa-info"></i>
            </button>
        </div>
        `;
    });
    container.innerHTML = html;
}

function fixUrl(url) {
    if (!url || url.includes('generic')) return CONFIG.defaultImage;
    if (url.startsWith('http:')) return url.replace('http:', 'https:');
    return url;
}

window.openSku = function(title, artist, art) {
    const params = new URLSearchParams({ title: title, artist: artist, art: art });
    window.location.href = 'song-info.html?' + params.toString();
};
