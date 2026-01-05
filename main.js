var CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    // ТВОЯ ССЫЛКА НА ГУГЛ ТАБЛИЦУ
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
    radioOnlyTime: 0, 
    gameOnlyTime: 0,  
    hybridTime: 0,    
    currentGame: "lobby",
    isInternalPause: false 
};

// Счётчик секунд
setInterval(function() {
    var homePane = document.getElementById('home');
    var isHomeActive = homePane ? homePane.classList.contains('active') : false;
    
    var isActuallyPlaying = (stats.currentGame !== "lobby" && isHomeActive && !stats.isInternalPause);

    if (isActuallyPlaying) {
        if (isPlaying) {
            stats.hybridTime++; 
        } else {
            stats.gameOnlyTime++; 
        }
    } else {
        if (isPlaying) {
            stats.radioOnlyTime++; 
        }
    }
}, 1000);

// Отправка данных каждые 15 секунд
setInterval(sendStatsToServer, 15000);

function sendStatsToServer() {
    if (stats.radioOnlyTime === 0 && stats.gameOnlyTime === 0 && stats.hybridTime === 0) return;

    var params = new URLSearchParams({
        radio_only: stats.radioOnlyTime,
        game_only: stats.gameOnlyTime,
        hybrid: stats.hybridTime,
        last_game: stats.currentGame,
        user_type: (window.isPaidUser ? 'paid' : 'free')
    });

    fetch(CONFIG.statsUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    });

    stats.radioOnlyTime = 0; stats.gameOnlyTime = 0; stats.hybridTime = 0;
}

// Слушаем паузу из игр
window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'gameStatus') {
        stats.isInternalPause = e.data.paused;
    }
});
// ---------------------------------

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

// Вызывается из Android
window.syncAppState = function(androidIsPlaying, androidIsPaid) {
    window.isPaidUser = androidIsPaid;
    isPlaying = androidIsPlaying; 
    updateUI();
};

function updateUI() {
    var icon = document.getElementById('play-icon');
    var playerDiv = document.querySelector('.inline-player');
    if (icon) icon.className = isPlaying ? "fas fa-pause" : "fas fa-play";
    if (playerDiv) {
        if (isPlaying) playerDiv.classList.add('playing');
        else playerDiv.classList.remove('playing');
    }
}

window.openTab = function(tabName, btnElement) {
    var panes = document.querySelectorAll('.tab-pane');
    var btns = document.querySelectorAll('.tab-btn');
    for(var i=0; i<panes.length; i++) panes[i].classList.remove('active');
    for(var j=0; j<btns.length; j++) btns[j].classList.remove('active');

    var target = document.getElementById(tabName);
    if(target) target.classList.add('active');
    if(btnElement) btnElement.classList.add('active');

    if (tabName !== 'home') {
        // stats.currentGame = "lobby"; // Закомментировано, чтобы не терять имя игры при переключении табов
        // var frame = document.getElementById('game-frame');
        // if(frame) frame.src = "about:blank";
    }
};

window.loadGame = function(gamePath) {
    var homeBtn = document.querySelector('.tab-btn[onclick*="home"]');
    
    document.querySelectorAll('.tab-pane').forEach(function(el){ el.classList.remove('active'); });
    document.getElementById('home').classList.add('active');

    try {
        var cleanPath = gamePath.split('?')[0];
        var parts = cleanPath.split('/').filter(function(p) { return p.length > 0; });
        var fileName = parts[parts.length - 1].replace('.html', '');
        
        if (fileName === 'index' && parts.length > 1) {
            stats.currentGame = parts[parts.length - 2];
        } else {
            stats.currentGame = fileName;
        }
        stats.isInternalPause = false;
        if (isApp && window.Android && window.Android.updateActiveGame) {
            window.Android.updateActiveGame(stats.currentGame);
        }
    } catch(e) {
        stats.currentGame = "unknown";
    }

    var frame = document.getElementById('game-frame');
    if(frame) {
        var buster = gamePath.indexOf('?') !== -1 ? '&' : '?';
        frame.src = gamePath + buster + "v=" + Date.now();
    }
};

function initPlayer() {
    var btn = document.getElementById('play-btn');
    if (btn) btn.addEventListener('click', togglePlayState);
}

function togglePlayState() {
    var slider = document.getElementById('vol-slider');

    if (isApp && window.Android) {
        if (isPlaying) {
            window.Android.pauseAudio();
            isPlaying = false;
        } else {
            if (slider) window.Android.setVolume(parseFloat(slider.value));
            window.Android.playAudio();
            isPlaying = true;
        }
    } else {
        if (isPlaying) {
            audio.pause(); audio.src = ""; audio.load();
            isPlaying = false;
        } else {
            audio.src = CONFIG.streamUrl + "?nc=" + Date.now();
            audio.play().catch(function(e) {});
            isPlaying = true;
        }
    }
    updateUI();
}

function initVolume() {
    var slider = document.getElementById('vol-slider');
    if (!slider) return;
    var savedVol = localStorage.getItem('savedVolume') || 1.0;
    slider.value = savedVol;
    if (isApp && window.Android) window.Android.setVolume(parseFloat(savedVol)); else audio.volume = savedVol;

    slider.addEventListener('input', function(e) {
        var vol = e.target.value;
        localStorage.setItem('savedVolume', vol);
        if (isApp && window.Android) window.Android.setVolume(parseFloat(vol)); else audio.volume = vol;
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
    history.forEach(function(item) {
        var song = item.song;
        var art = fixUrl(song.art);
        var safeTitle = (song.title || "").replace(/'/g, "\\'");
        var safeArtist = (song.artist || "").replace(/'/g, "\\'");
        html += '<div class="history-item"><img src="' + art + '" class="hist-img" onerror="this.src=\'' + CONFIG.defaultImage + '\'"><div class="hist-info"><span class="hist-title">' + song.title + '</span><span class="hist-artist">' + song.artist + '</span></div><button class="sku-btn" onclick="openSku(\'' + safeTitle + '\', \'' + safeArtist + '\', \'' + art + '\')"><i class="fas fa-info"></i></button></div>';
    });
    container.innerHTML = html;
}

function fixUrl(url) {
    if (!url || url.indexOf('generic') !== -1) return CONFIG.defaultImage;
    return url.replace('http:', 'https:');
}

window.openSku = function(title, artist, art) {
    if(document.getElementById('modal-art')) document.getElementById('modal-art').src = art;
    if(document.getElementById('modal-title')) document.getElementById('modal-title').innerText = title;
    if(document.getElementById('modal-artist')) document.getElementById('modal-artist').innerText = artist;
    if(document.getElementById('info-modal')) document.getElementById('info-modal').classList.remove('hidden');
};

window.closeSku = function() { 
    if(document.getElementById('info-modal')) document.getElementById('info-modal').classList.add('hidden'); 
};
