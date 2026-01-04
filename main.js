const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    defaultImage: "logo.jpg", 
    refreshTime: 8000 
};

const isApp = (typeof window.Android !== "undefined");
let audio = new Audio(); 
let isPlaying = false; 
// Глобальная переменная для статуса подписки (чтобы игра знала)
window.isPaidUser = false; 

window.onload = function() {
    if (!isApp) audio.src = CONFIG.streamUrl;
    initPlayer();
    initVolume();
    updateMetadata();
    setInterval(updateMetadata, CONFIG.refreshTime);
};

// --- ГЛАВНАЯ ФУНКЦИЯ СВЯЗИ С АНДРОИДОМ ---
// Android вызывает её сам, когда загрузка завершена
window.syncAppState = function(androidIsPlaying, androidIsPaid) {
    console.log("Sync from Android: Playing=" + androidIsPlaying + ", Paid=" + androidIsPaid);
    
    // 1. Сохраняем статус оплаты (для игры)
    window.isPaidUser = androidIsPaid;

    // 2. Синхронизируем плеер (Крутилку и Иконку)
    isPlaying = androidIsPlaying;
    
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');
    
    if (isPlaying) {
        // Если Андроид сказал, что музыка играет -> Включаем анимацию и иконку Паузы
        if(icon) icon.className = "fas fa-pause";
        if(playerDiv) playerDiv.classList.add('playing'); // Класс для вращения
    } else {
        // Если тишина -> Стоп анимация и иконка Плей
        if(icon) icon.className = "fas fa-play";
        if(playerDiv) playerDiv.classList.remove('playing');
    }
};
// -----------------------------------------

window.openTab = function(tabName, btnElement) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    if (btnElement) btnElement.classList.add('active');

    const gameFrame = document.getElementById('game-frame');
    if (gameFrame && gameFrame.contentWindow && typeof gameFrame.contentWindow.setGamePause === 'function') {
        if (tabName !== 'home') {
            gameFrame.contentWindow.setGamePause(true);
        }
    }
};

window.loadGame = function(gamePath) {
    const frame = document.getElementById('game-frame');
    if(frame) {
        const buster = gamePath.includes('?') ? '&' : '?';
        frame.src = gamePath + buster + "v=" + Date.now();
        
        const homeBtn = document.querySelector('.tab-btn[onclick*="home"]');
        window.openTab('home', homeBtn);
    }
};

function initPlayer() {
    const playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.addEventListener('click', togglePlayState);
}

function togglePlayState() {
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');
    const slider = document.getElementById('vol-slider');

    if (isApp) {
        if (isPlaying) {
            window.Android.pauseAudio();
            if(icon) icon.className = "fas fa-play";
            if(playerDiv) playerDiv.classList.remove('playing');
            isPlaying = false;
        } else {
            if (slider) window.Android.setVolume(parseFloat(slider.value));
            window.Android.playAudio();
            if(icon) icon.className = "fas fa-pause";
            if(playerDiv) playerDiv.classList.add('playing');
            isPlaying = true;
        }
        return;
    }

    if (isPlaying) {
        audio.pause(); audio.src = ""; audio.load();
        if(icon) icon.className = "fas fa-play";
        if(playerDiv) playerDiv.classList.remove('playing');
        isPlaying = false;
    } else {
        audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
        audio.play().catch(e => {});
        if(icon) icon.className = "fas fa-pause";
        if(playerDiv) playerDiv.classList.add('playing');
        isPlaying = true;
    }
}

function initVolume() {
    const slider = document.getElementById('vol-slider');
    if (!slider) return;
    let savedVol = localStorage.getItem('savedVolume');
    let finalVol = savedVol !== null ? parseFloat(savedVol) : 1.0;
    slider.value = finalVol;
    if (isApp) { try { window.Android.setVolume(finalVol); } catch(e){} } else { audio.volume = finalVol; }

    slider.addEventListener('input', (e) => {
        let vol = parseFloat(e.target.value);
        localStorage.setItem('savedVolume', vol);
        if (isApp) { try { window.Android.setVolume(vol); } catch(e) {} } else { audio.volume = vol; }
    });
}

function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(res => res.json())
        .then(data => {
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                document.getElementById('track-name').innerText = song.title;
                document.getElementById('artist-name').innerText = song.artist || "";
                document.getElementById('track-sep').style.display = song.artist ? "inline" : "none";
                document.getElementById('mini-art').src = fixUrl(song.art);
            }
            if (data.song_history) renderHistory(data.song_history);
        }).catch(err => {});
}

function renderHistory(history) {
    con
