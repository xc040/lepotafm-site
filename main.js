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
window.isPaidUser = false;

// --- СИСТЕМА СТАТИСТИКИ (МАЯК) ---
var stats = {
    radioOnlyTime: 0, 
    gameOnlyTime: 0,  
    hybridTime: 0,    
    currentGame: "lobby",
    isGameActive: false,    // Видит ли юзер вкладку с игрой
    isInternalPause: false  // Нажата ли пауза ВНУТРИ игры
};

// Счётчик секунд
setInterval(function() {
    // Юзер играет, ТОЛЬКО если он на вкладке игры И игра НЕ на паузе внутри
    var isUserActuallyPlaying = (stats.currentGame !== "lobby" && stats.isGameActive && !stats.isInternalPause);

    if (!isUserActuallyPlaying) {
        // Если юзер в меню, или на другой вкладке, или игра ВНУТРИ на паузе
        if (isPlaying) stats.radioOnlyTime++;
    } else {
        // Юзер реально играет прямо сейчас
        if (isPlaying) {
            stats.hybridTime++; // Радио + Игра
        } else {
            stats.gameOnlyTime++; // Только игра (тишина)
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

// МОСТИК ДЛЯ ИГР: Слушаем сообщения от игр внутри фрейма
window.addEventListener('message', function(event) {
    // Если игра прислала { "type": "gameStatus", "paused": true }
    if (event.data && event.data.type === 'gameStatus') {
        stats.isInternalPause = event.data.paused;
    }
});

// Дополнительная функция: можно вызвать из игры как parent.setGamePauseStatus(true)
window.setGamePauseStatus = function(isPaused) {
    stats.isInternalPause = isPaused;
};
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

    if (tabName === 'home') {
        var frame = document.getElementById('game-frame');
        if (frame && frame.src && !frame.src.includes('about:blank')) {
            stats.isGameActive = true;
        } else {
            stats.isGameActive = false;
            stats.currentGame = "lobby";
        }
    } else {
        stats.isGameActive = false; // Ушли с экрана игры — считаем паузой
    }
};

window.loadGame = function(gamePath) {
    try {
        var name = gamePath.split('/').pop().replace('.html', '');
        stats.currentGame = name;
    } catch(e) { stats.currentGame = "unknown"; }

    stats.isGameActive = true;
    stats.isInternalPause = false; // Новая игра всегда активна

    var frame = document.getElementById('game-frame');
    if(frame) {
        var buster = gamePath.indexOf('?') !== -1 ? '&' : '?';
        frame.src = gamePath + buster + "v=" + Date.now();
        var homeBtn = document.querySelector('.tab-btn[onclick*="home"]');
        window.openTab('home', homeBtn);
    }
};

function initPlayer() {
    var btn = document.getElementById('play-btn');
    if (btn) btn.addEventListener('click', togglePlayState);
}

function togglePlayState() {
    var slider = document.getElementById('vol-slider');
    if (isApp && window.Android) {
        if (isPlaying) { window.Android.pauseAudio(); isPlaying = false; }
        else { 
            if (slider) window.Android.setVolume(parseFloat(slider.value));
            window.Android.playAudio(); isPlaying = true; 
        }
    } else {
        if (isPlaying) { audio.pause(); audio.src = ""; isPlaying = false; }
        else { 
            audio.src = CONFIG.streamUrl + "?nc=" + Date.now(); 
            audio.play().catch(function(e){}); isPlaying = true; 
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
        }).catch(function(err) {});
}

function fixUrl(url) {
    if (!url || url.indexOf('generic') !== -1) return CONFIG.defaultImage;
    return url.replace('http:', 'https:');
}
