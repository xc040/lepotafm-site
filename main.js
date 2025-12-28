/* Настройки */
const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    defaultImage: "logo.jpg", 
    refreshTime: 10000 // 10 сек
};

let audio = new Audio(CONFIG.streamUrl);
let isPlaying = false;

// Проверка: запущено ли в приложении (по ссылке или по объекту Android)
const isApp = window.location.search.includes('app=true') || (typeof window.Android !== "undefined");

window.onload = function() {
    // Запускаем обновление данных
    updateMetadata();
    setInterval(updateMetadata, CONFIG.refreshTime);

    // Логика кнопки Play
    const playBtn = document.getElementById('play-btn');
    const icon = document.getElementById('play-icon');

    if (playBtn) {
        // В приложении ставим иконку паузы сразу (так как там автоплей)
        if (isApp) {
            icon.className = "fas fa-pause";
            isPlaying = true;
        }

        playBtn.addEventListener('click', () => {
            if (isApp && window.Android) {
                // --- РЕЖИМ ПРИЛОЖЕНИЯ (Командуем Андроиду) ---
                if (isPlaying) {
                    window.Android.pauseAudio();
                    icon.className = "fas fa-play";
                    isPlaying = false;
                } else {
                    window.Android.playAudio();
                    icon.className = "fas fa-pause";
                    isPlaying = true;
                }
            } else {
                // --- РЕЖИМ БРАУЗЕРА (HTML5) ---
                if (isPlaying) {
                    audio.pause();
                    icon.className = "fas fa-play";
                    isPlaying = false;
                } else {
                    // Защита от кэша при старте
                    audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
                    audio.play().catch(e => console.log("Браузер заблокировал автоплей"));
                    icon.className = "fas fa-pause";
                    isPlaying = true;
                }
            }
        });
    }

    // Громкость (Только для браузера, в приложении работают кнопки телефона)
    const volSlider = document.getElementById('volume-slider');
    if (volSlider) {
        volSlider.addEventListener('input', (e) => {
            audio.volume = e.target.value;
        });
    }
};

function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now()) // Добавил анти-кэш для текста
        .then(response => response.json())
        .then(data => {
            if (!data.now_playing || !data.now_playing.song) return;
            const song = data.now_playing.song;

            // Обновляем текст
            document.getElementById('track-name').innerText = song.title;
            document.getElementById('artist-name').innerText = song.artist;

            // --- ЛЕЧЕНИЕ КАРТИНКИ ---
            let artUrl = song.art;
            const imgEl = document.getElementById('album-art');
            const bgEl = document.getElementById('bg-art');

            // 1. Если картинки нет или это заглушка азуры
            if (!artUrl || artUrl.includes("generic")) {
                artUrl = CONFIG.defaultImage;
            } 
            // 2. Если ссылка HTTP, меняем на HTTPS
            else if (artUrl.startsWith("http:")) {
                artUrl = artUrl.replace("http:", "https:");
            }

            // Применяем, если картинка изменилась
            if (imgEl.src !== artUrl) {
                imgEl.src = artUrl;
                // Меняем фон тоже
                if (bgEl) bgEl.style.backgroundImage = `url('${artUrl}')`;
            }
        })
        .catch(err => console.log("Ошибка API (возможно блокировка):", err));
}
