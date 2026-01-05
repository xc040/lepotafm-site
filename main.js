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

// === СИСТЕМА ОБНАРУЖЕНИЯ ПАУЗЫ ПО НЕАКТИВНОСТИ ===
var lastUserActivityTime = Date.now(); // Время последнего тача/клика

// Сбрасываем таймер при любом взаимодействии
document.addEventListener('touchstart', function() {
    lastUserActivityTime = Date.now();
}, { passive: true });

document.addEventListener('click', function() {
    lastUserActivityTime = Date.now();
});

// Порог неактивности — 30 секунд (можно изменить на 20 или 40)
var INACTIVITY_THRESHOLD = 30000; // в миллисекундах
// ============================================

// Счётчик секунд
setInterval(function() {
    var homePane = document.getElementById('home');
    var isHomeActive = homePane ? homePane.classList.contains('active') : false;
    
    // Проверяем, был ли пользователь активен недавно
    var isUserActive = (Date.now() - lastUserActivityTime < INACTIVITY_THRESHOLD);

    // Активная игровая сессия только если:
    // 1. Открыта вкладка Home
    // 2. Загружена игра
    // 3. Пользователь был активен недавно (тачал/кликал)
    var isActiveGameSession = isHomeActive && 
                              (stats.currentGame !== "lobby") && 
                              isUserActive;

    if (isActiveGameSession) {
        if (isPlaying) {
            stats.hybridTime++;
        } else {
            stats.gameOnlyTime++;
        }
    } else {
        // Всё остальное — только радио (включая паузу в игре, меню, бездействие)
        if (isPlaying) {
            stats.radioOnlyTime++;
        }
    }
}, 1000);

// Отправка данных каждые 15 секунд
setInterval(sendStatsToServer, 15000);

function sendStatsToServer() {
    if (stats.radioOnlyTime === 0 && stats.gameOnlyTime === 0 && stats.hybridTime === 0) return;

    var dateNum = new Date().toISOString().slice(0,10).replace(/-/g, ''); // YYYYMMDD
    
    var params = new URLSearchParams({
        radio_only: stats.radioOnlyTime,
        game_only: stats.gameOnlyTime,
        hybrid: stats.hybridTime,
        last_game: stats.currentGame,
        user_type: (window.isPaidUser ? 'paid' : 'free'),
        date_num: dateNum
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

    // === АВТООПРЕДЕЛЕНИЕ ИГРЫ ПРИ ЗАПУСКЕ В APK ===
    if (isApp) {
        setTimeout(function() {
            var frame = document.getElementById('game-frame');
            if (frame && frame.src && frame.src !== '' && frame.src !== 'about:blank') {
                // Извлекаем путь из src iframe и определяем имя игры
                var gameSrc = frame.src.split('?')[0]; // убираем параметры
                try {
                    var parts = gameSrc.split('/').filter(function(p) { return p.length > 0; });
                    var fileName = parts[parts.length - 1].replace('.html', '');
                    
                    if (fileName === 'index' && parts.length > 1) {
                        stats.currentGame = parts[parts.length - 2];
                    } else if (fileName !== '' && fileName !== 'about:blank') {
                        stats.currentGame = fileName;
                    }

                    // Убедимся, что вкладка Home активна
                    var homePane = document.getElementById('home');
                    if (homePane && !homePane.classList.contains('active')) {
                        // Принудительно активируем вкладку Home
                        var homeBtn = document.querySelector('.tab-btn[onclick*="home"]');
                        if (homeBtn) window.openTab('home', homeBtn);
                    }

                    // Сообщаем нативной части (Android)
                    if (window.Android && window.Android.updateActiveGame) {
                        window.Android.updateActiveGame(stats.currentGame);
                    }
                } catch(e) {
                    console.log('Не удалось определить игру при запуске');
                }
            }
        }, 2000); // задержка 2 секунды — чтобы iframe успел загрузиться
    }
    // ===========================================
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
    
    // === УЛУЧШЕННЫЙ СБРОС ПРИ ПЕРЕКЛЮЧЕНИИ ВКЛАДОК ===
    if (tabName !== 'home') {
        // Игрок ушёл с вкладки с игрой → считаем, что игра неактивна
        stats.currentGame = "lobby";
        stats.isInternalPause = true;  // Принудительно ставим паузу (на всякий случай)
        
        if (isApp && window.Android && window.Android.updateActiveGame) {
            window.Android.updateActiveGame("lobby");
        }
    }
    // ==========================================
};

window.loadGame = function(gamePath) {
    // УЛУЧШЕННОЕ ОПРЕДЕЛЕНИЕ ИМЕНИ ИГРЫ
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
        stats.currentGame = "unknown_game"; 
    }

    var frame = document.getElementById('game-frame');
    if(frame) {
        var buster = gamePath.indexOf('?') !== -1 ? '&' : '?';
        frame.src = gamePath + buster + "v=" + Date.now();
        
        // Переходим на вкладку с игрой
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
        }).catch(function(err) {});
}

function fixUrl(url) {
    if (!url || url.indexOf('generic') !== -1) return CONFIG.defaultImage;
    return url.replace('http:', 'https:');
}
