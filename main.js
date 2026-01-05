var CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    // СЮДА ВСТАВИТЬ НОВУЮ ССЫЛКУ ИЗ ГУГЛ ДЕПЛОЯ
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

setInterval(function() {
    var homePane = document.getElementById('home');
    var isHomeActive = homePane ? homePane.classList.contains('active') : false;
    var isActuallyPlaying = (stats.currentGame !== "lobby" && isHomeActive && !stats.isInternalPause);

    if (isActuallyPlaying) {
        if (isPlaying) stats.hybridTime++; else stats.gameOnlyTime++; 
    } else {
        if (isPlaying) stats.radioOnlyTime++; 
    }
}, 1000);

setInterval(sendStatsToServer, 15000);

function sendStatsToServer() {
    if (stats.radioOnlyTime === 0 && stats.gameOnlyTime === 0 && stats.hybridTime === 0) return;
    var params = new URLSearchParams({
        radio_only: stats.radioOnlyTime,
        game_only: stats.gameOnlyTime,
        hybrid: stats.hybridTime,
        last_game: stats.currentGame,
        user_type: "paid"
    });
    fetch(CONFIG.statsUrl, { method: 'POST', mode: 'no-cors', body: params.toString() });
    stats.radioOnlyTime = 0; stats.gameOnlyTime = 0; stats.hybridTime = 0;
}

window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'gameStatus') {
        stats.isInternalPause = e.data.paused;
    }
});
// ---------------------------------

window.onload = function() {
    var frame = document.getElementById('game-frame');
    if (frame && frame.src && !frame.src.includes('about:blank')) {
        try {
            var parts = frame.src.split('?')[0].split('/').filter(function(p){return p.length > 0;});
            var file = parts.pop().replace('.html', '');
            stats.currentGame = (file === 'index' && parts.length > 0) ? parts.pop() : file;
        } catch(e) { stats.currentGame = "startup_game"; }
    }

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

window.syncAppState = function(playing, paid) {
    window.isPaidUser = paid;
    isPlaying = playing; 
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
};

window.loadGame = function(gamePath) {
    try {
        var clean = gamePath.split('?')[0];
        var parts = clean.split('/').filter(function(p){return p.length > 0;});
        var file = parts[parts.length - 1].replace('.html', '');
        stats.currentGame = (file === 'index' && parts.length > 1) ? parts[parts.length - 2] : file;
        stats.isInternalPause = false;
        if (isApp && window.Android && window.Android.updateActiveGame) {
            window.Android.updateActiveGame(stats.currentGame);
        }
    } catch(e) { stats.currentGame = "unknown"; }

    var frame = document.getElementById('game-frame');
    if(frame) {
        frame.src = gamePath + (gamePath.indexOf('?') !== -1 ? '&' : '?') + "v=" + Date.now();
        window.openTab('home', document.querySelector('.tab-btn[onclick*="home"]'));
    }
};

function initPlayer() {
    var btn = document.getElementById('play-btn');
    if (btn) btn.addEventListener('click', togglePlayState);
}

function togglePlayState() {
    if (isApp && window.Android) {
        if (isPlaying) window.Android.pauseAudio(); else window.Android.playAudio();
    } else {
        if (isPlaying) { audio.pause(); audio.src = ""; }
        else { audio.src = CONFIG.streamUrl + "?nc=" + Date.now(); audio.play().catch(function(){}); }
    }
    window.syncAppState(!isPlaying, true);
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
        }).catch(function(){});
}

function renderHistory(history) {
    var container = document.getElementById('history-container');
    if (!container) return;
    var html = '';
    history.forEach(function(item) {
        var song = item.song;
        var art = fixUrl(song.art);
        html += '<div class="history-item"><img src="' + art + '" class="hist-img" onerror="this.src=\'' + CONFIG.defaultImage + '\'"><div class="hist-info"><span class="hist-title">' + song.title + '</span><span class="hist-artist">' + song.artist + '</span></div></div>';
    });
    container.innerHTML = html;
}

function fixUrl(url) {
    if (!url || url.indexOf('generic') !== -1) return CONFIG.defaultImage;
    return url.replace('http:', 'https:');
}
