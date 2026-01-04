const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    // ТВОЯ ССЫЛКА НА GOOGLE ТАБЛИЦУ
    statsUrl: "https://script.google.com/macros/s/AKfycbyQsnyXLmGXTNDtL9CLAV6KC80dKm9aIdICEtpY5nqMmldh1gydaPjSc6bozIX8meNWAA/exec", 
    defaultImage: "logo.jpg", 
    refreshTime: 8000 
};

const isApp = (typeof window.Android !== "undefined");
let audio = new Audio(); 
let isPlaying = false; 
window.isPaidUser = false;

// --- СИСТЕМА СТАТИСТИКИ ---
let stats = {
    radioOnlyTime: 0, 
    gameOnlyTime: 0,  
    hybridTime: 0,    
    currentGame: "lobby" 
};

setInterval(() => {
    if (stats.currentGame === "lobby" && isPlaying) {
        stats.radioOnlyTime++;
    }
    else if (stats.currentGame !== "lobby" && !isPlaying) {
        stats.gameOnlyTime++;
    }
    else if (stats.currentGame !== "lobby" && isPlaying) {
        stats.hybridTime++;
    }
}, 1000);

// Отправка данных раз в минуту
setInterval(sendBeacon, 60000);

function sendBeacon() {
    if (stats.radioOnlyTime === 0 && stats.gameOnlyTime === 0 && stats.hybridTime === 0) return;

    // Формируем данные для Google Sheets
    const data = new FormData();
    data.append('radio_only', stats.radioOnlyTime);
    data.append('game_only', stats.gameOnlyTime);
    data.append('hybrid', stats.hybridTime);
    data.append('last_game', stats.currentGame);
    data.append('user_type', window.isPaidUser ? 'paid' : 'free');

    // Отправляем (Google Script примет это как POST запрос)
    navigator.sendBeacon(CONFIG.statsUrl, data);

    // Сброс счетчиков
    stats.radioOnlyTime = 0;
    stats.gameOnlyTime = 0;
    stats.hybridTime = 0;
}
// ---------------------------

window.onload = function() {
    if (!isApp) {
        audio.src = CONFIG.streamUrl;
    } else {
        if(window.Android && window.Android.notifyPageLoaded) {
            window.Android.notifyPageLoaded();
        }
    }
    initPlayer();
    initVolume();
    updateMetadata();
    setInterval(updateMetadata, CONFIG.refreshTime);
};

window.syncAppState = function(androidIsPlaying, androidIsPaid) {
    window.isPaidUser = androidIsPaid;
    isPlaying = androidIsPlaying; 
    
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
    let gameName = "unknown";
    try {
        gameName = gamePath.split('/').pop().replace('.html', '');
    } catch(e) {}
    
    stats.currentGame = gameName; 

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
            isPlaying = false;
        } else {
            if (slider) window.Android.setVolume(parseFloat(slider.value));
            window.Android.playAudio();
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
