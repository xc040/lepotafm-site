/* --- НАСТРОЙКИ --- */
const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    defaultImage: "logo.jpg", 
    refreshTime: 5000 // 5 секунд
};

// Проверка: мы в приложении или в браузере?
const isApp = window.location.search.includes('app=true') || (typeof window.Android !== "undefined");

let audio = new Audio(CONFIG.streamUrl);
let isPlaying = false; 

// В приложении считаем, что музыка играет сразу (автостарт)
if (isApp) isPlaying = true;

/* --- ЗАПУСК ПРИ ЗАГРУЗКЕ --- */
window.onload = function() {
    console.log("Скрипт запущен!"); // Проверка в консоли
    
    initPlayer();
    updateMetadata(); // Первое обновление сразу
    setInterval(updateMetadata, CONFIG.refreshTime); // Запуск таймера
};

/* --- МГНОВЕННОЕ ОБНОВЛЕНИЕ ПРИ ПРОБУЖДЕНИИ ЭКРАНА --- */
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        console.log("Экран включен -> Обновляем данные");
        updateMetadata();
    }
});

/* --- УПРАВЛЕНИЕ ВКЛАДКАМИ (TABS) --- */
// Делаем функцию глобальной (window), чтобы onclick в HTML её видел
window.openTab = function(tabName, btnElement) {
    // 1. Скрываем все вкладки
    const contents = document.querySelectorAll('.tab-pane');
    contents.forEach(el => el.classList.remove('active'));
    
    // 2. Убираем подсветку со всех кнопок
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(el => el.classList.remove('active'));

    // 3. Показываем нужную вкладку
    const target = document.getElementById(tabName);
    if (target) target.classList.add('active');
    
    // 4. Подсвечиваем нажатую кнопку
    if (btnElement) btnElement.classList.add('active');
};

/* --- ПЛЕЕР И КНОПКА --- */
function initPlayer() {
    const playBtn = document.getElementById('play-btn');
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.bottom-player');

    if (!playBtn) return;

    // Если приложение - сразу ставим иконку Паузы и крутим диск
    if (isApp) {
        if(icon) icon.className = "fas fa-pause";
        if(playerDiv) playerDiv.classList.add('playing');
    }

    playBtn.addEventListener('click', () => {
        // ЛОГИКА ДЛЯ ПРИЛОЖЕНИЯ
        if (isApp && window.Android) {
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
            return; // Выходим
        }

        // ЛОГИКА ДЛЯ БРАУЗЕРА
        if (isPlaying) {
            audio.pause();
            if(icon) icon.className = "fas fa-play";
            if(playerDiv) playerDiv.classList.remove('playing');
            isPlaying = false;
        } else {
            audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
            audio.play().catch(e => console.log("Автоплей запрещен"));
            if(icon) icon.className = "fas fa-pause";
            if(playerDiv) playerDiv.classList.add('playing');
            isPlaying = true;
        }
    });
}

/* --- ОБНОВЛЕНИЕ ДАННЫХ (API) --- */
function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(res => res.json())
        .then(data => {
            // 1. ТЕКУЩИЙ ТРЕК
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                
                // Защита от пустоты
                const title = song.title || "Прямой эфир";
                const artist = song.artist || "LepotaFM";

                const elName = document.getElementById('track-name');
                const elArtist = document.getElementById('artist-name');

                if (elName) elName.innerText = title;
                if (elArtist) elArtist.innerText = artist;
                
                // Картинка
                let artUrl = fixUrl(song.art);
                const img = document.getElementById('mini-art');
                
                if (img && img.src !== artUrl) {
                    img.src = artUrl;
                }
            }

            // 2. ИСТОРИЯ
            if (data.song_history && data.song_history.length > 0) {
                renderHistory(data.song_history);
            } else {
                const histContainer = document.getElementById('history-container');
                if(histContainer) histContainer.innerHTML = '<div class="loading-msg">История пока пуста</div>';
            }
        })
        .catch(err => {
            console.log("Ошибка API");
            // Если ошибка, пишем название станции
            const elName = document.getElementById('track-name');
            if (elName) elName.innerText = "LepotaFM";
        });
}

/* --- ОТРИСОВКА ИСТОРИИ --- */
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
            <button class="sku-btn" onclick="openSku('${song.title} - ${song.artist}')">
                <i class="fas fa-search"></i>
            </button>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

/* --- ПОМОЩНИКИ --- */
function fixUrl(url) {
    if (!url || url.includes('generic')) return CONFIG.defaultImage;
    if (url.startsWith('http:')) return url.replace('http:', 'https:');
    return url;
}

window.openSku = function(query) {
    // Поиск песни в Гугле
    const url = "https://www.google.com/search?q=" + encodeURIComponent(query);
    window.open(url, '_blank');
};
