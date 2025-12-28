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
    updateMetadata(); 
    setInterval(updateMetadata, CONFIG.refreshTime);
    initVolume(); // Запуск громкости
};

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateMetadata();
});

// Управление вкладками
window.openTab = function(tabName, btnElement) {
    const contents = document.querySelectorAll('.tab-pane');
    contents.forEach(el => el.classList.remove('active'));
    
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(el => el.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    if (btnElement) btnElement.classList.add('active');
};

function initPlayer() {
    const playBtn = document.getElementById('play-btn');
    const icon = document.getElementById('play-icon');

    if (!playBtn) return;

    if (isApp) {
        if(icon) icon.className = "fas fa-pause";
    }

    playBtn.addEventListener('click', () => {
        // Приложение
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
            } catch(e) { console.log(e); }
            return;
        }

        // Браузер
        if (isPlaying) {
            audio.pause();
            if(icon) icon.className = "fas fa-play";
            isPlaying = false;
        } else {
            audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
            audio.play().catch(e => console.log("Блок автоплея"));
            if(icon) icon.className = "fas fa-pause";
            isPlaying = true;
        }
    });
}

// Логика громкости
function initVolume() {
    const slider = document.getElementById('vol-slider');
    if (!slider) return;

    // Если это приложение - отключаем ползунок (так как кнопки телефона главнее)
    if (isApp) {
        slider.disabled = true;
        slider.parentElement.style.opacity = "0.5";
        return;
    }

    // Для браузера
    slider.addEventListener('input', (e) => {
        audio.volume = e.target.value;
    });
}

function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(res => res.json())
        .then(data => {
            // Текущий трек
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                
                document.getElementById('track-name').innerText = song.title;
                document.getElementById('artist-name').innerText = song.artist;
                
                let artUrl = fixUrl(song.art);
                const img = document.getElementById('mini-art');
                
                if (img && img.src !== artUrl) img.src = artUrl;
            }

            // История
            if (data.song_history && data.song_history.length > 0) {
                renderHistory(data.song_history);
            }
        })
        .catch(err => {
            document.getElementById('track-name').innerText = "LepotaFM";
        });
}

function renderHistory(history) {
    const container = document.getElementById('history-container');
    if (!container) return;

    let html = '';
    history.forEach(item => {
        const song = item.song;
        const art = fixUrl(song.art);
        
        html += `
        <div class="history-item">
            <img src="${art}" class="hist-img" onerror="this.src='${CONFIG.defaultImage}'">
            <div class="hist-info">
                <span class="hist-title">${song.title}</span>
                <span class="hist-artist">${song.artist}</span>
            </div>
            <button class="sku-btn" onclick="openSku('${song.title} ${song.artist}')">
                <i class="fas fa-search"></i>
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

window.openSku = function(query) {
    window.open("https://www.google.com/search?q=" + encodeURIComponent(query), '_blank');
};
