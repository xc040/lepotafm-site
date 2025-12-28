/* Настройки */
const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    defaultImage: "logo.jpg", 
    refreshTime: 8000 // 8 сек
};

const isApp = window.location.search.includes('app=true') || (typeof window.Android !== "undefined");
let isPlaying = false; 
let audio = new Audio(CONFIG.streamUrl);

// Если в приложении - считаем, что играет сразу (автостарт)
if (isApp) isPlaying = true;

window.onload = function() {
    initPlayer();
    updateMetadata(); // Сразу при загрузке
    setInterval(updateMetadata, CONFIG.refreshTime);
};

// --- МГНОВЕННОЕ ОБНОВЛЕНИЕ ПРИ ПРОБУЖДЕНИИ ---
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        // Как только открыли приложение/вкладку - обновляем
        updateMetadata();
    }
});

function initPlayer() {
    const playBtn = document.getElementById('play-btn');
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.bottom-player');

    if (isApp) {
        icon.className = "fas fa-pause";
        playerDiv.classList.add('playing'); // Крутим пластинку
    }

    playBtn.addEventListener('click', () => {
        if (isApp && window.Android) {
            // Приложение
            if (isPlaying) {
                window.Android.pauseAudio();
                icon.className = "fas fa-play";
                playerDiv.classList.remove('playing');
                isPlaying = false;
            } else {
                window.Android.playAudio();
                icon.className = "fas fa-pause";
                playerDiv.classList.add('playing');
                isPlaying = true;
            }
        } else {
            // Браузер
            if (isPlaying) {
                audio.pause();
                icon.className = "fas fa-play";
                playerDiv.classList.remove('playing');
                isPlaying = false;
            } else {
                audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
                audio.play();
                icon.className = "fas fa-pause";
                playerDiv.classList.add('playing');
                isPlaying = true;
            }
        }
    });
}

function updateMetadata() {
    // Добавляем ?t=... чтобы не брал старое из кэша
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(res => res.json())
        .then(data => {
            // 1. ТЕКУЩИЙ ТРЕК
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                
                document.getElementById('track-name').innerText = song.title;
                document.getElementById('artist-name').innerText = song.artist;
                
                let artUrl = fixUrl(song.art);
                const img = document.getElementById('mini-art');
                
                // Меняем картинку, если она другая
                if (img.src !== artUrl) {
                    img.src = artUrl;
                }
            }

            // 2. ИСТОРИЯ (Загружаем список)
            if (data.song_history && data.song_history.length > 0) {
                renderHistory(data.song_history);
            }
        })
        .catch(err => console.log("API Error"));
}

function renderHistory(history) {
    const container = document.getElementById('history-container');
    // Если контейнера нет (например, другая страница), выходим
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
            <button class="sku-btn" onclick="alert('SKU: ${song.title}')">
                <i class="fas fa-shopping-bag"></i>
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

// Переключение вкладок
window.openTab = function(tabName, btn) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    // Убираем подсветку кнопок
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    // Показываем нужную
    document.getElementById(tabName).classList.add('active');
    // Подсвечиваем нажатую кнопку
    btn.classList.add('active');
};
