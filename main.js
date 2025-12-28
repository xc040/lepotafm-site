/* Настройки */
const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    defaultImage: "logo.jpg", 
    refreshTime: 10000 
};

// Определяем приложение
const isApp = window.location.search.includes('app=true') || (typeof window.Android !== "undefined");
let isPlaying = false; 
let audio = new Audio(CONFIG.streamUrl);

// Если приложение - считаем, что играет сразу
if (isApp) isPlaying = true;

window.onload = function() {
    // 1. Инициализация плеера
    initPlayer();
    
    // 2. Загрузка данных сразу
    updateMetadata(); 
    setInterval(updateMetadata, CONFIG.refreshTime);
};

// --- ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК ---
window.openTab = function(tabName) {
    // Скрываем все
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(el => el.classList.remove('active'));
    
    // Деактивируем кнопки
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(el => el.classList.remove('active'));

    // Показываем нужное
    document.getElementById(tabName).classList.add('active');
    
    // Ищем кнопку, на которую нажали (через event) или вручную
    // (Простая реализация: просто подсвечиваем ту, что совпадает по индексу, или через CSS)
    event.currentTarget.classList.add('active');
};


function initPlayer() {
    const playBtn = document.getElementById('play-btn');
    const icon = document.getElementById('play-icon');

    if (isApp) icon.className = "fas fa-pause";

    playBtn.addEventListener('click', () => {
        // ВИЗУАЛЬНО меняем кнопку МГНОВЕННО (чтобы не тупило)
        if (isPlaying) {
            icon.className = "fas fa-play";
            isPlaying = false;
            // Команда
            if (isApp && window.Android) window.Android.pauseAudio();
            else audio.pause();
        } else {
            icon.className = "fas fa-pause";
            isPlaying = true;
            // Команда
            if (isApp && window.Android) window.Android.playAudio();
            else {
                audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
                audio.play();
            }
        }
    });
}

function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(res => res.json())
        .then(data => {
            // 1. Текущая песня (в нижнем плеере)
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                document.getElementById('track-name').innerText = song.title;
                document.getElementById('artist-name').innerText = song.artist;
                
                let artUrl = fixUrl(song.art);
                const img = document.getElementById('mini-art');
                const bg = document.getElementById('bg-art');

                if (img.src !== artUrl) {
                    img.src = artUrl;
                    if (bg) bg.style.backgroundImage = `url('${artUrl}')`;
                }
            }

            // 2. ИСТОРИЯ ПЕСЕН (Заполняем список)
            if (data.song_history && data.song_history.length > 0) {
                renderHistory(data.song_history);
            }
        })
        .catch(err => console.log("API Error"));
}

// Рендер списка истории
function renderHistory(historyArray) {
    const container = document.getElementById('history-container');
    let html = '';

    // Проходим по каждой песне из истории
    historyArray.forEach(item => {
        const song = item.song;
        const art = fixUrl(song.art);
        
        // Генерируем HTML для одной строки
        html += `
        <div class="history-item">
            <img src="${art}" class="hist-art" onerror="this.src='${CONFIG.defaultImage}'">
            <div class="hist-info">
                <span class="hist-title">${song.title}</span>
                <span class="hist-artist">${song.artist}</span>
            </div>
            <button class="sku-btn" onclick="openSku('${song.title} ${song.artist}')">
                <i class="fas fa-info"></i>
            </button>
        </div>
        `;
    });

    container.innerHTML = html;
}

// Хелпер для ссылок
function fixUrl(url) {
    if (!url || url.includes('generic')) return CONFIG.defaultImage;
    if (url.startsWith('http:')) return url.replace('http:', 'https:');
    return url;
}

// Кнопка SKU (Свойства)
window.openSku = function(query) {
    // Пока просто открывает поиск в гугле по песне
    // Можно заменить на открытие текста песни или магазина
    alert("Свойства песни: " + query + "\n(Тут можно сделать ссылку на покупку)");
};
