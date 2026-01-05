var CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    statsUrl: "https://script.google.com/macros/s/AKfycbyQsnyXLmGXTNDtL9CLAV6KC80dKm9aIdICEtpY5nqMmldh1gydaPjSc6bozIX8meNWAA/exec",
    defaultImage: "logo.jpg", 
    refreshTime: 8000 
};

var isApp = (typeof window.Android !== "undefined");
var audio = new Audio(); 
var isPlaying = false; 
window.isPaidUser = true; // Для АПК всегда ставим true

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
        if (isPlaying) stats.hybridTime++; else stats.gameOnlyTime++; 
    } else {
        if (isPlaying) stats.radioOnlyTime++; 
    }
}, 1000);

// Отправка данных каждые 15 секунд (для теста)
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
    fetch(CONFIG.statsUrl, { method: 'POST', mode: 'no-cors', body: params.toString() });
    stats.radioOnlyTime = 0; stats.gameOnlyTime = 0; stats.hybridTime = 0;
}

window.onload = function() {
    // ПРОВЕРКА ПРИ СТАРТЕ: если во фрейме уже есть игра, запоминаем её
    var frame = document.getElementById('game-frame');
    if (frame && frame.src && !frame.src.includes('about:blank')) {
        try {
            var name = frame.src.split('/').pop().split('?')[0].replace('.html', '');
            if (name === 'index') {
                var parts = frame.src.split('/');
                stats.currentGame = parts[parts.length - 2];
            } else { stats.currentGame = name; }
        } catch(e) { stats.currentGame = "startup_game"; }
    }

    if (!isApp) { audio.src = CONFIG.streamUrl; }
    else { if(window.Android && window.Android.notifyPageLoaded) window.Android.notifyPageLoaded(); }
    initPlayer();
    initVolume();
    updateMetadata();
    setInterval(updateMetadata, CONFIG.refreshTime);
};

window.syncAppState = function(p, paid) {
    isPlaying = p; window.isPaidUser = paid;
    var icon = document.getElementById('play-icon');
    if (icon) icon.className = isPlaying ? "fas fa-pause" : "fas fa-play";
};

window.openTab = function(tabName, btn) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    if(document.getElementById(tabName)) document.getElementById(tabName).classList.add('active');
    if(btn) btn.classList.add('active');
};

window.loadGame = function(gamePath) {
    try {
        var cleanPath = gamePath.split('?')[0];
        var parts = cleanPath.split('/').filter(p => p.length > 0);
        var fileName = parts[parts.length - 1].replace('.html', '');
        stats.currentGame = (fileName === 'index' && parts.length > 1) ? parts[parts.length - 2] : fileName;
        stats.isInternalPause = false;
    } catch(e) { stats.currentGame = "unknown"; }

    var frame = document.getElementById('game-frame');
    if(frame) {
        frame.src = gamePath + (gamePath.indexOf('?') !== -1 ? '&' : '?') + "v=" + Date.now();
        window.openTab('home', document.querySelector('.tab-btn[onclick*="home"]'));
    }
};

function initPlayer() { var btn = document.getElementById('play-btn'); if (btn) btn.onclick = togglePlayState; }
function togglePlayState() {
    if (isApp && window.Android) {
        if (isPlaying) { window.Android.pauseAudio(); isPlaying = false; }
        else { window.Android.playAudio(); isPlaying = true; }
    } else {
        if (isPlaying) { audio.pause(); audio.src = ""; isPlaying = false; }
        else { audio.src = CONFIG.streamUrl + "?n=" + Date.now(); audio.play(); isPlaying = true; }
    }
    window.syncAppState(isPlaying, window.isPaidUser);
}

function initVolume() {
    var s = document.getElementById('vol-slider'); if (!s) return;
    s.oninput = function(e) { 
        if (isApp && window.Android) window.Android.setVolume(parseFloat(e.target.value)); else audio.volume = e.target.value; 
    };
}
function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now()).then(r => r.json()).then(d => {
        if (d.now_playing && d.now_playing.song) {
            document.getElementById('track-name').innerText = d.now_playing.song.title;
        }
    }).catch(e => {});
}
function fixUrl(url) { return url.replace('http:', 'https:'); }
