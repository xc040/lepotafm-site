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

// Переменные для таймеров
let sleepTimerId = null;
let alarmCheckId = null;

if (isApp) isPlaying = true;

window.onload = function() {
    initPlayer();
    initVolume();
    initFeatures(); // Запуск логики будильников
    
    updateMetadataLoop();
};

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateMetadata();
});

function updateMetadataLoop() {
    updateMetadata();
    setTimeout(updateMetadataLoop, CONFIG.refreshTime);
}

/* --- НОВЫЙ ФУНКЦИОНАЛ: БУДИЛЬНИК И ТАЙМЕР --- */
function initFeatures() {
    // 1. ТАЙМЕР СНА
    const sleepSelect = document.getElementById('sleep-select');
    const sleepText = document.getElementById('sleep-countdown');

    sleepSelect.addEventListener('change', () => {
        const minutes = parseInt(sleepSelect.value);
        if (sleepTimerId) clearTimeout(sleepTimerId); // Сброс старого

        if (minutes > 0) {
            let secondsLeft = minutes * 60;
            sleepText.innerText = `Осталось: ${minutes} мин`;
            sleepText.style.color = "#00f3ff";

            // Запускаем отсчет
            sleepTimerId = setInterval(() => {
                secondsLeft--;
                if (secondsLeft <= 0) {
                    // ВРЕМЯ ВЫШЛО
                    clearInterval(sleepTimerId);
                    stopPlayback(); // Выключаем радио
                    sleepSelect.value = "0";
                    sleepText.innerText = "Радио выключено";
                } else {
                    // Обновляем текст (если больше минуты - пишем мин, иначе сек)
                    const m = Math.floor(secondsLeft / 60);
                    const s = secondsLeft % 60;
                    sleepText.innerText = `${m}:${s < 10 ? '0'+s : s}`;
                }
            }, 1000);
        } else {
            sleepText.innerText = "Не активен";
            sleepText.style.color = "#888";
        }
    });

    // 2. БУДИЛЬНИК
    const alarmToggle = document.getElementById('alarm-toggle');
    const alarmTimeInput = document.getElementById('alarm-time');
    const alarmVolSlider = document.getElementById('alarm-vol');

    // Восстанавливаем настройки из памяти
    const savedAlarmTime = localStorage.getItem('alarmTime');
    const savedAlarmOn = localStorage.getItem('alarmOn') === 'true';
    const savedAlarmVol = localStorage.getItem('alarmVol');

    if (savedAlarmTime) alarmTimeInput.value = savedAlarmTime;
    if (savedAlarmVol) alarmVolSlider.value = savedAlarmVol;
    alarmToggle.checked = savedAlarmOn;

    // Функция проверки времени (Запускается каждую секунду)
    setInterval(() => {
        if (!alarmToggle.checked) return;

        const now = new Date();
        const currentTime = 
            (now.getHours() < 10 ? '0' : '') + now.getHours() + ":" + 
            (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();

        const targetTime = alarmTimeInput.value;

        // Если время совпало и секунды == 0 (чтобы сработало 1 раз в минуту)
        if (currentTime === targetTime && now.getSeconds() === 0) {
            triggerAlarm();
        }
    }, 1000);

    // Сохранение настроек при изменении
    alarmToggle.addEventListener('change', () => localStorage.setItem('alarmOn', alarmToggle.checked));
    alarmTimeInput.addEventListener('change', () => localStorage.setItem('alarmTime', alarmTimeInput.value));
    alarmVolSlider.addEventListener('input', () => localStorage.setItem('alarmVol', alarmVolSlider.value));
}

// СРАБАТЫВАНИЕ БУДИЛЬНИКА
function triggerAlarm() {
    const vol = parseFloat(document.getElementById('alarm-vol').value);
    
    // 1. Устанавливаем громкость
    setGlobalVolume(vol);
    document.getElementById('vol-slider').value = vol; // Двигаем основной ползунок

    // 2. Включаем радио
    startPlayback();
    
    alert("⏰ БУДИЛЬНИК! Доброе утро с LepotaFM!");
    
    // Выключаем будильник после срабатывания (чтобы не орал завтра, или оставьте, если нужно ежедневно)
    document.getElementById('alarm-toggle').checked = false;
    localStorage.setItem('alarmOn', 'false');
}

// Вспомогательная: ВКЛЮЧИТЬ
function startPlayback() {
    if (isPlaying) return; // Уже играет
    
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');

    if (isApp && window.Android) {
        try { window.Android.playAudio(); } catch(e){}
    } else {
        audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
        audio.play();
    }
    
    icon.className = "fas fa-pause";
    if(playerDiv) playerDiv.classList.add('playing');
    isPlaying = true;
}

// Вспомогательная: ВЫКЛЮЧИТЬ
function stopPlayback() {
    if (!isPlaying) return;

    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');

    if (isApp && window.Android) {
        try { window.Android.pauseAudio(); } catch(e){}
    } else {
        audio.pause();
    }

    icon.className = "fas fa-play";
    if(playerDiv) playerDiv.classList.remove('playing');
    isPlaying = false;
}

// Вспомогательная: ГРОМКОСТЬ
function setGlobalVolume(vol) {
    if (isApp && window.Android && window.Android.setVolume) {
        try { window.Android.setVolume(vol); } catch(e){}
    } else {
        audio.volume = vol;
    }
}

/* --- СТАНДАРТНЫЙ КОД (Плеер, Метаданные) --- */
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
        if (isPlaying) stopPlayback();
        else startPlayback();
    });
}

function initVolume() {
    const slider = document.getElementById('vol-slider');
    if (!slider) return;

    let savedVol = localStorage.getItem('savedVolume');
    let finalVol = 1.0; 
    if (savedVol !== null) {
        finalVol = parseFloat(savedVol);
        if (finalVol < 0.25) finalVol = 0.25;
    }

    slider.value = finalVol;
    setGlobalVolume(finalVol);

    slider.addEventListener('input', (e) => {
        let vol = parseFloat(e.target.value);
        localStorage.setItem('savedVolume', vol);
        setGlobalVolume(vol);
    });
}

function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(res => res.json())
        .then(data => {
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                document.getElementById('track-name').innerText = song.title;
                document.getElementById('artist-name').innerText = song.artist;
                
                let artUrl = fixUrl(song.art);
                const img = document.getElementById('mini-art');
                if (img && img.src !== artUrl) img.src = artUrl;
            }
            if (data.song_history) renderHistory(data.song_history);
        })
        .catch(err => {
            document.getElementById('track-name').innerText = "LepotaFM";
        });
}

function renderHistory(history) {
    const container = document.getElementById('history-container');
    if (!container) return;
    let html = '';
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
        </div>`;
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

window.openTab = function(tabName, btnElement) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    if (btnElement) btnElement.classList.add('active');
};
