/* --- НАСТРОЙКИ --- */
const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    defaultImage: "logo.jpg", 
    refreshTime: 5000 // 5 секунд
};

const isApp = window.location.search.includes('app=true') || (typeof window.Android !== "undefined");
let audio = new Audio(CONFIG.streamUrl);
let isPlaying = false; 

if (isApp) isPlaying = true;

window.onload = function() {
    initPlayer();
    initVolume(); 
    
    // ЗАПУСК ВЕЧНОГО ЦИКЛА ОБНОВЛЕНИЯ
    updateMetadataLoop();
};

// Пробуждение экрана - обновляем немедленно
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        updateMetadata(); 
    }
});

// --- ВЕЧНЫЙ ЦИКЛ (Защита от зависания) ---
function updateMetadataLoop() {
    updateMetadata();
    // Запускаем следующий раз через 5 сек, что бы ни случилось
    setTimeout(updateMetadataLoop, CONFIG.refreshTime);
}

// --- ФУНКЦИЯ ОБНОВЛЕНИЯ ---
function updateMetadata() {
    // Добавляем случайное число, чтобы пробить кэш
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(res => {
            if (!res.ok) throw new Error("Server error");
            return res.json();
        })
        .then(data => {
            // 1. ТЕКУЩИЙ ТРЕК
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                
                document.getElementById('track-name').innerText = song.title;
                document.getElementById('artist-name').innerText = song.artist;
                
                let artUrl = fixUrl(song.art);
                const img = document.getElementById('mini-art');
                
                if (img && img.src !== artUrl) img.src = artUrl;
            }

            // 2. ИСТОРИЯ
            if (data.song_history && data.song_history.length > 0) {
                renderHistory(data.song_history);
            }
        })
        .catch(err => {
            // Если ошибка сети - просто молчим и пробуем в следующий раз
            // Не меняем текст на "Ошибка", чтобы не пугать пользователя
            console.log("Ждем сеть...");
        });
}

// --- ОТРИСОВКА ИСТОРИИ (Новая верстка) ---
function renderHistory(history) {
    const container = document.getElementById('history-container');
    if (!container) return;

    let html = '';
    
    // Берем последние 10 песен
    history.slice(0, 10).forEach(item => {
        const song = item.song;
        const art = fixUrl(song.art);
        
        // Защита кавычек для JS
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

// --- ОСТАЛЬНОЙ КОД (Плеер, Громкость, Табы) ---

function initPlayer() {
    const playBtn = document.getElementById('play-btn');
    const icon = document.getElementById('play-icon');

    if (!playBtn) return;

    if (isApp) {
        if(icon) icon.className = "fas fa-pause";
    }

    playBtn.addEventListener('click', () => {
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

        if (isPlaying) {
            audio.pause();
            if(icon) icon.className = "fas fa-play";
            isPlaying = false;
        } else {
            audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
            audio.play().catch(e => console.log("Block"));
            if(icon) icon.className = "fas fa-pause";
            isPlaying = true;
        }
    });
}

function initVolume() {
    const slider = document.getElementById('vol-slider');
    if (!slider) return;

    // Восстанавливаем сохраненную громкость
    const savedVol = localStorage.getItem('savedVolume');
    if (savedVol !== null) {
        slider.value = savedVol;
        audio.volume = savedVol;
        if (isApp && window.Android && window.Android.setVolume) {
            try { window.Android.setVolume(parseFloat(savedVol)); } catch(e){}
        }
    }

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

window.openTab = function(tabName, btnElement) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    if (btnElement) btnElement.classList.add('active');
};

function fixUrl(url) {
    if (!url || url.includes('generic')) return CONFIG.defaultImage;
    if (url.startsWith('http:')) return url.replace('http:', 'https:');
    return url;
}

window.openSku = function(title, artist, art) {
    const params = new URLSearchParams({ title: title, artist: artist, art: art });
    window.location.href = 'song-info.html?' + params.toString();
};
