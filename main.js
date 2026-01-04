const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    statsUrl: "https://lepotafm.ru/api/stats.php", // ⚠️ СОЗДАЙ ЭТОТ ФАЙЛ НА СЕРВЕРЕ
    defaultImage: "logo.jpg", 
    refreshTime: 8000 
};

const isApp = (typeof window.Android !== "undefined");
let audio = new Audio(); 
let isPlaying = false; 
window.isPaidUser = false;

// --- СИСТЕМА СТАТИСТИКИ ---
let stats = {
    radioOnlyTime: 0, // Слушает, но не играет
    gameOnlyTime: 0,  // Играет без радио
    hybridTime: 0,    // И играет, и слушает
    currentGame: "lobby" // Название текущей игры или "lobby"
};

// Тикаем каждую секунду
setInterval(() => {
    // 1. Если мы в меню (не в игре) и Радио играет
    if (stats.currentGame === "lobby" && isPlaying) {
        stats.radioOnlyTime++;
    }
    // 2. Если мы в игре и Радио НЕ играет
    else if (stats.currentGame !== "lobby" && !isPlaying) {
        stats.gameOnlyTime++;
    }
    // 3. Если мы в игре и Радио играет (Самое важное!)
    else if (stats.currentGame !== "lobby" && isPlaying) {
        stats.hybridTime++;
    }
}, 1000);

// Отправляем отчет на сервер каждые 60 секунд
setInterval(sendBeacon, 60000);

function sendBeacon() {
    // Если все по нулям - не спамим сервер
    if (stats.radioOnlyTime === 0 && stats.gameOnlyTime === 0 && stats.hybridTime === 0) return;

    // Данные для отправки
    const data = new FormData();
    data.append('radio_only', stats.radioOnlyTime);
    data.append('game_only', stats.gameOnlyTime);
    data.append('hybrid', stats.hybridTime);
    data.append('last_game', stats.currentGame);
    data.append('user_type', window.isPaidUser ? 'paid' : 'free');

    // Отправляем
    navigator.sendBeacon(CONFIG.statsUrl, data);

    // Сбрасываем счетчики после отправки (чтобы не дублировать)
    stats.radioOnlyTime = 0;
    stats.gameOnlyTime = 0;
    stats.hybridTime = 0;
}
// ---------------------------

window.onload = function() {
    if (!isApp) {
        audio.src = CONFIG.streamUrl;
    } else {
        // Просим Android сообщить статус при старте
        if(window.Android && window.Android.notifyPageLoaded) {
            window.Android.notifyPageLoaded();
        }
    }
    initPlayer();
    initVolume();
    updateMetadata();
    setInterval(updateMetadata, CONFIG.refreshTime);
};

// СИНХРОНИЗАЦИЯ С АНДРОИДОМ
window.syncAppState = function(androidIsPlaying, androidIsPaid) {
    console.log("Sync: Playing=" + androidIsPlaying);
    
    window.isPaidUser = androidIsPaid;
    isPlaying = androidIsPlaying; // Обновляем статус для статистики
    
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');
    
    if (isPlaying) {
        if(icon) icon.className = "fas fa-pause";
        if(playerDiv) playerDiv.classList.add('playing');
    } else {
        if(icon) icon.className = "fas fa-play";
        if(playerDiv) playerDiv.classList.remove('playing');
    }
};

window.openTab = function(tabName, btnElement) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    if (btnElement) btnElement.classList.add('active');

    // Если вернулись на главную - сбрасываем игру в статистике
    if (tabName === 'home') {
        stats.currentGame = "lobby";
    }

    const gameFrame = document.getElementById('game-frame');
    if (gameFrame && gameFrame.contentWindow && typeof gameFrame.contentWindow.setGamePause === 'function') {
        if (tabName !== 'home') {
            gameFrame.contentWindow.setGamePause(true);
        }
    }
};

window.loadGame = function(gamePath) {
    // Вытаскиваем имя игры из пути для статистики (например "games/snake" -> "snake")
    let gameName = "unknown";
    try {
        gameName = gamePath.split('/').pop().replace('.html', '');
    } catch(e) {}
    
    stats.currentGame = gameName; // <--- ЗАПИСЫВАЕМ ИГРУ В СТАТИСТИКУ

    const frame = document.getElementById('game-frame');
    if(frame) {
        const buster = gamePath.includes('?') ? '&' : '?';
        frame.src = gamePath + buster + "v=" + Date.now();
        const homeBtn = document.querySelector('.tab-btn[onclick*="home"]');
        window.openTab('home', homeBtn); // Тут, возможно, ошибка в логике? Обычно игру открывают в табе игры.
        // Если у тебя игра открывается в табе 'games', то раскомментируй ниже:
        // window.openTab('games', null); 
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
            // Визуал обновит syncAppState, но для мгновенного отклика можно и тут:
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

    // Логика для обычного браузера
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
    const container = document.getElementById('history-container');
    if (!container) return;
    let html = '';
    history.forEach(item => {
        const song = item.song;
        const art = fixUrl(song.art);
        const safeTitle = (song.title || "").replace(/'/g, "\\'");
        const safeArtist = (song.artist || "").replace(/'/g, "\\'");
        html += `<div class="history-item"><img src="${art}" class="hist-img" onerror="this.src='${CONFIG.defaultImage}'"><div class="hist-info"><span class="hist-title">${song.title}</span><span class="hist-artist">${song.artist}</span></div><button class="sku-btn" onclick="openSku('${safeTitle}', '${safeArtist}', '${art}')"><i class="fas fa-info"></i></button></div>`;
    });
    container.innerHTML = html;
}

function fixUrl(url) {
    if (!url || url.includes('generic')) return CONFIG.defaultImage;
    return url.replace('http:', 'https:');
}

window.playRadioForce = function() { if (!isPlaying) togglePlayState(); };
window.stopRadioForce = function() { if (isPlaying) togglePlayState(); };
window.openSku = function(title, artist, art) {
    document.getElementById('modal-art').src = art;
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-artist').innerText = artist;
    document.getElementById('info-modal').classList.remove('hidden');
};
window.closeSku = function() { document.getElementById('info-modal').classList.add('hidden'); };
