var CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    // ТВОЯ ССЫЛКА НА GOOGLE ТАБЛИЦУ
    statsUrl: "https://script.google.com/macros/s/AKfycbyQsnyXLmGXTNDtL9CLAV6KC80dKm9aIdICEtpY5nqMmldh1gydaPjSc6bozIX8meNWAA/exec",
    defaultImage: "logo.jpg", 
    refreshTime: 8000 
};

var isApp = (typeof window.Android !== "undefined");
var audio = new Audio(); 
var isPlaying = false; 
window.isPaidUser = false;

// --- СИСТЕМА СТАТИСТИКИ (МАЯК) ---
var stats = {
    radioOnly: 0, 
    gameOnly: 0,  
    hybrid: 0,    
    currentGame: "lobby" 
};

// Считаем время каждую секунду
setInterval(function() {
    if (stats.currentGame === "lobby") {
        if (isPlaying) stats.radioOnly++;
    } else {
        if (isPlaying) {
            stats.hybrid++;
        } else {
            stats.gameOnly++;
        }
    }
}, 1000);

// ОТПРАВКА ДАННЫХ (Сейчас каждые 10 секунд для теста)
setInterval(sendStatsToServer, 10000); 

function sendStatsToServer() {
    // Если активности нет - не шлем ничего
    if (stats.radioOnly === 0 && stats.gameOnly === 0 && stats.hybrid === 0) return;

    var query = "radio_only=" + stats.radioOnly +
                "&game_only=" + stats.gameOnly +
                "&hybrid=" + stats.hybrid +
                "&last_game=" + encodeURIComponent(stats.currentGame) +
                "&user_type=" + (window.isPaidUser ? 'paid' : 'free');

    fetch(CONFIG.statsUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: query
    });

    // Сбрасываем счетчики
    stats.radioOnly = 0; stats.gameOnly = 0; stats.hybrid = 0;
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

// СИНХРОНИЗАЦИЯ С АНДРОИДОМ
window.syncAppState = function(androidIsPlaying, androidIsPaid) {
    window.isPaidUser = androidIsPaid;
    isPlaying = androidIsPlaying; 
    
    var icon = document.getElementById('play-icon');
    var playerDiv = document.querySelector('.inline-player');
    
    if (isPlaying) {
        if(icon) icon.className = "fas fa-pause";
        if(playerDiv) playerDiv.classList.add('playing');
    } else {
        if(icon) icon.className = "fas fa-play";
        if(playerDiv) playerDiv.classList.remove('playing');
    }
};

window.openTab = function(tabName, btnElement) {
    var panes = document.querySelectorAll('.tab-pane');
    var btns = document.querySelectorAll('.tab-btn');
    for(var i=0; i<panes.length; i++) panes[i].classList.remove('active');
    for(var j=0; j<btns.length; j++) btns[j].classList.remove('active');
    
    var target = document.getElementById(tabName);
    if(target) target.classList.add('active');
    if (btnElement) btnElement.classList.add('active');

    // Если вернулись на главную - Маячок пишет "lobby"
    if (tabName === 'home') {
        stats.currentGame = "lobby";
    }

    var gameFrame = document.getElementById('game-frame');
    if (gameFrame && gameFrame.contentWindow && typeof gameFrame.contentWindow.setGamePause === 'function') {
        if (tabName !== 'home') {
            gameFrame.contentWindow.setGamePause(true);
        }
    }
};

window.loadGame = function(gamePath) {
    // Маячок запоминает название игры
    try {
        stats.currentGame = gamePath.split('/').pop().replace('.html', '');
    } catch(e) {
        stats.currentGame = "unknown";
    }
    
    var frame = document.getElementById('game-frame');
    if(frame) {
        var buster = gamePath.indexOf('?') !== -1 ? '&' : '?';
        frame.src = gamePath + buster + "v=" + Date.now();
        var homeBtn = document.querySelector('.tab-btn[onclick*="home"]');
        window.openTab('home', homeBtn);
    }
};

function initPlayer() {
    var playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.addEventListener('click', togglePlayState);
}

function togglePlayState() {
    var slider = document.getElementById('vol-slider');

    if (isApp) {
        if (isPlaying) {
            if(window.Android) window.Android.pauseAudio();
            isPlaying = false;
        } else {
            if (slider && window.Android) window.Android.setVolume(parseFloat(slider.value));
            if(window.Android) window.Android.playAudio();
            isPlaying = true;
        }
        return;
    }

    if (isPlaying) {
        audio.pause(); audio.src = ""; audio.load();
        isPlaying = false;
    } else {
        audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
        audio.play().catch(function(e) {});
        isPlaying = true;
    }
    // Обновляем визуал (для браузера)
    syncAppState(isPlaying, window.isPaidUser);
}

function initVolume() {
    var slider = document.getElementById('vol-slider');
    if (!slider) return;
    var savedVol = localStorage.getItem('savedVolume');
    var finalVol = savedVol !== null ? parseFloat(savedVol) : 1.0;
    slider.value = finalVol;
    if (isApp) { try { if(window.Android) window.Android.setVolume(finalVol); } catch(e){} } else { audio.volume = finalVol; }

    slider.addEventListener('input', function(e) {
        var vol = parseFloat(e.target.value);
        localStorage.setItem('savedVolume', vol);
        if (isApp) { try { if(window.Android) window.Android.setVolume(vol); } catch(e) {} } else { audio.volume = vol; }
    });
}

function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.now_playing && data.now_playing.song) {
                var song = data.now_playing.song;
                if(document.getElementById('track-name')) document.getElementById('track-name').innerText = song.title;
                if(document.getElementById('artist-name')) document.getElementById('artist-name').innerText = song.artist || "";
                if(document.getElementById('mini-art')) document.getElementById('mini-art').src = fixUrl(song.art);
            }
            if (data.song_history) renderHistory(data.song_history);
        }).catch(function(err) {});
}

function renderHistory(history) {
    var container = document.getElementById('history-container');
    if (!container) return;
    var html = '';
    for(var i=0; i<history.length; i++) {
        var song = history[i].song;
        var art = fixUrl(song.art);
        var safeTitle = (song.title || "").replace(/'/g, "\\'");
        var safeArtist = (song.artist || "").replace(/'/g, "\\'");
        html += '<div class="history-item"><img src="' + art + '" class="hist-img" onerror="this.src=\'' + CONFIG.defaultImage + '\'"><div class="hist-info"><span class="hist-title">' + song.title + '</span><span class="hist-artist">' + song.artist + '</span></div><button class="sku-btn" onclick="openSku(\'' + safeTitle + '\', \'' + safeArtist + '\', \'' + art + '\')"><i class="fas fa-info"></i></button></div>';
    }
    container.innerHTML = html;
}

function fixUrl(url) {
    if (!url || url.indexOf('generic') !== -1) return CONFIG.defaultImage;
    return url.replace('http:', 'https:');
}

window.playRadioForce = function() { if (!isPlaying) togglePlayState(); };
window.stopRadioForce = function() { if (isPlaying) togglePlayState(); };
window.openSku = function(title, artist, art) {
    if(document.getElementById('modal-art')) document.getElementById('modal-art').src = art;
    if(document.get
