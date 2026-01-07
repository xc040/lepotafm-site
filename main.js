var CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    // Ссылка остается в конфиге, но здесь больше не используется (используется в Java)
    statsUrl: "https://script.google.com/macros/s/AKfycbyQsnyXLmGXTNDtL9CLAV6KC80dKm9aIdICEtpY5nqMmldh1gydaPjSc6bozIX8meNWAA/exec",
    defaultImage: "logo.jpg", 
    refreshTime: 8000 
};

var isApp = (typeof window.Android !== "undefined");
var audio = new Audio(); 
var isPlaying = false; 
window.isPaidUser = false;

// --- КЭШИРОВАНИЕ ЭЛЕМЕНТОВ И СОСТОЯНИЙ ---
var cachedHomePane = null; // Кэш для вкладки Home
var lastSongTitle = "";    // Для оптимизации обновления метаданных

// --- СТАТУС (ПЕРЕМЕННЫЕ) ---
var stats = {
    // Счетчики удалены, так как теперь считает Java
    currentGame: "lobby",
    isInternalPause: false 
};

// === СИСТЕМА ОБНАРУЖЕНИЯ ПАУЗЫ ПО НЕАКТИВНОСТИ ===
var lastUserActivityTime = Date.now(); 

document.addEventListener('touchstart', function() {
    lastUserActivityTime = Date.now();
}, { passive: true });

document.addEventListener('click', function() {
    lastUserActivityTime = Date.now();
});

var INACTIVITY_THRESHOLD = 30000; 
// ============================================

// --- МОСТ: ПРИЕМ ДАННЫХ ОТ ANDROID И ПЕРЕСЫЛКА В ИГРУ ---
window.updateRadioBar = function(percent) {
    var frame = document.getElementById('game-frame');
    if (frame && frame.contentWindow) {
        // Пересылаем проценты внутрь игры (iframe)
        frame.contentWindow.postMessage({ type: 'radioProgress', value: percent }, '*');
    }
};

// СИСТЕМА ТАЙМЕР (1 СЕКУНДА)
// Теперь он не считает время, а сообщает статус в Android
setInterval(function() {
    // ИСПОЛЬЗУЕМ КЭШ ВМЕСТО getElementById
    var isHomeActive = cachedHomePane ? cachedHomePane.classList.contains('active') : false;
    
    // Логика: Активная сессия = Вкладка Home + Не лобби
    var isActiveGameSession = isHomeActive && 
                              (stats.currentGame !== "lobby");

    // ОТПРАВЛЯЕМ СТАТУС В JAVA (Android)
    if (isApp && window.Android && window.Android.reportGameState) {
        window.Android.reportGameState(isActiveGameSession, stats.currentGame);
    }
}, 1000);

window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'gameStatus') {
        stats.isInternalPause = e.data.paused;
    }
    // МОСТ: ПРИЕМ КОМАНДЫ СБРОСА ОТ ИГРЫ И ОТПРАВКА В АНДРОИД
    if (e.data && e.data.type === 'resetRadioTimer') {
        if (isApp && window.Android && window.Android.resetRadioTimer) {
            window.Android.resetRadioTimer();
        }
    }
});
// ---------------------------------

window.onload = function() {
    // 1. УБИРАЕМ ГОЛУБОЕ ВЫДЕЛЕНИЕ
    var style = document.createElement('style');
    style.innerHTML = "* { -webkit-tap-highlight-color: transparent; } button:focus, .tab-btn:focus, #play-btn:focus { outline: none; }";
    document.head.appendChild(style);

    // 2. ЗАПОЛНЯЕМ КЭШ
    cachedHomePane = document.getElementById('home');

    // === ФУНКЦИЯ АВТОЗАГРУЗКИ ПОСЛЕДНЕЙ ИГРЫ ===
    var savedGamePath = localStorage.getItem('lastPlayedLepotaGame');
    if (isApp && savedGamePath) {
        window.loadGame(savedGamePath);
    }
    // ===========================================

    if (!isApp) {
        audio.src = CONFIG.streamUrl;
    } else {
        if(window.Android && window.Android.notifyPageLoaded) {
            window.Android.notifyPageLoaded();
        }
    }
    initPlayer();
    initVolume();
    updateMetadata(); // Первый запуск
    setInterval(updateMetadata, CONFIG.refreshTime);

    // === АВТООПРЕДЕЛЕНИЕ ИГРЫ ПРИ ЗАПУСКЕ В APK ===
    if (isApp) {
        setTimeout(function() {
            var frame = document.getElementById('game-frame');
            if (frame && frame.src && frame.src !== '' && frame.src !== 'about:blank') {
                var gameSrc = frame.src.split('?')[0]; 
                try {
                    var parts = gameSrc.split('/').filter(function(p) { return p.length > 0; });
                    var fileName = parts[parts.length - 1].replace('.html', '');
                    
                    if (fileName === 'index' && parts.length > 1) {
                        stats.currentGame = parts[parts.length - 2];
                    } else if (fileName !== '' && fileName !== 'about:blank') {
                        stats.currentGame = fileName;
                    }

                    if (cachedHomePane && !cachedHomePane.classList.contains('active')) {
                        var homeBtn = document.querySelector('.tab-btn[onclick*="home"]');
                        if (homeBtn) window.openTab('home', homeBtn);
                    }

                    // При старте тоже сообщаем статус
                    if (window.Android && window.Android.updateActiveGame) {
                        window.Android.updateActiveGame(stats.currentGame);
                    }
                } catch(e) {
                    console.log('Не удалось определить игру при запуске');
                }
            }
        }, 2000); 
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
    
    if (isApp && window.Android && window.Android.updateActiveTab) {
        window.Android.updateActiveTab(tabName);
    }

    if (tabName !== 'home') {
        stats.currentGame = "lobby";
        if (isApp && window.Android && window.Android.updateActiveGame) {
            window.Android.updateActiveGame("lobby");
        }
    }
};

window.loadGame = function(gamePath) {
    // СОХРАНЕНИЕ ПУТИ К ИГРЕ В ПАМЯТЬ
    localStorage.setItem('lastPlayedLepotaGame', gamePath);

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

    var savedVol = localStorage.getItem('savedVolume');
    var finalVol;
    
    if (savedVol === null) {
        finalVol = 0.3; 
    } else {
        finalVol = parseFloat(savedVol); 
    }
    
    slider.value = finalVol;

    if (isApp && window.Android) {
        window.Android.setVolume(finalVol); 
    } else {
        audio.volume = finalVol;
    }

    slider.addEventListener('input', function(e) {
        var vol = e.target.value;
        localStorage.setItem('savedVolume', vol);
        if (isApp && window.Android) window.Android.setVolume(parseFloat(vol)); 
        else audio.volume = vol;
    });
}

function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.now_playing && data.now_playing.song) {
                var song = data.now_playing.song;
                
                if (song.title !== lastSongTitle) {
                    lastSongTitle = song.title; 

                    if(document.getElementById('track-name')) document.getElementById('track-name').innerText = song.title;
                    if(document.getElementById('artist-name')) document.getElementById('artist-name').innerText = song.artist || "";
                    if(document.getElementById('mini-art')) document.getElementById('mini-art').src = fixUrl(song.art);
                }
            }
            if (data.song_history) renderHistory(data.song_history);
        }).catch(function(err) {});
}

function renderHistory(history) {
    var container = document.getElementById('history-container');
    if (!container) return;
    
    var html = '';
    history.slice(0, 5).forEach(function(item) {
        var song = item.song;
        var art = fixUrl(song.art);
        html += '<div class="history-item">' +
                '<img src="' + art + '" class="hist-img">' +
                '<div class="hist-info">' +
                '<div class="hist-title">' + song.title + '</div>' +
                '<div class="hist-artist">' + (song.artist || "") + '</div>' +
                '</div></div>';
    });
    if (container.innerHTML !== html) {
        container.innerHTML = html;
    }
}

function fixUrl(url) {
    if (!url || url.indexOf('generic') !== -1) return CONFIG.defaultImage;
    return url.replace('http:', 'https:');

// === ЛОГИКА ПОД-ВКЛАДОК (Студия и Эфир) ===
window.openSubTab = function(parentId, subTabId, btnElement) {
    // 1. Находим родительский контейнер (studio или ether)
    var parent = document.getElementById(parentId);
    if(!parent) return;

    // 2. Убираем активность у всех кнопок и панелей ВНУТРИ этого родителя
    var buttons = parent.querySelectorAll('.sub-tab-btn');
    var panes = parent.querySelectorAll('.sub-pane');

    for(var i=0; i<buttons.length; i++) buttons[i].classList.remove('active');
    for(var j=0; j<panes.length; j++) panes[j].classList.remove('active');

    // 3. Активируем нужные
    var target = document.getElementById(subTabId);
    if(target) target.classList.add('active');
    if(btnElement) btnElement.classList.add('active');
};

}
// === ЛОГИКА AI СТУДИИ ===
var currentAiMode = 'code'; // По умолчанию режим КОД

window.setAiMode = function(mode, btn) {
    currentAiMode = mode;
    
    // Обновляем вид кнопок
    var container = document.querySelector('.mode-switcher');
    var btns = container.querySelectorAll('.mode-btn');
    btns.forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');

    // Меняем подсказку в поле ввода
    var input = document.getElementById('ai-prompt');
    if(mode === 'chat') input.placeholder = "Спроси что-нибудь или попроси идею...";
    if(mode === 'code') input.placeholder = "Опиши игру (Змейка, Тетрис, Гонки)...";
    if(mode === 'part') input.placeholder = "Опиши функцию или часть кода (например: логика прыжка)...";
    if(mode === 'analyze') input.placeholder = "Вставь код для поиска ошибок или улучшения...";
};

window.startGeneration = function() {
    var promptText = document.getElementById('ai-prompt').value;
    var btn = document.getElementById('ai-submit-btn');
    var status = document.getElementById('ai-status');
    var resultArea = document.getElementById('ai-result-container');
    var frame = document.getElementById('generated-frame');
    var textArea = document.getElementById('text-output');

    if (!promptText.trim()) return;

    // UI: Блокировка
    btn.disabled = true;
    status.innerText = "СВЯЗЬ С НЕЙРОСЕТЬЮ... РЕЖИМ: " + currentAiMode.toUpperCase();
    resultArea.classList.remove('hidden');
    
    // Очистка перед новым запуском
    frame.style.display = 'none';
    textArea.style.display = 'none';
    frame.src = 'about:blank';
    textArea.innerText = '';

    var formData = new FormData();
    formData.append('text', promptText);
    formData.append('mode', currentAiMode); // ОТПРАВЛЯЕМ РЕЖИМ

    fetch('maker.php', { method: 'POST', body: formData })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) {
            status.innerText = "ГОТОВО!";
            
            // Если это игра (ссылка на файл)
            if (data.type === 'file') {
                frame.style.display = 'block';
                frame.src = data.url; // Загружаем игру
            } 
            // Если это текст (чат или анализ)
            else {
                textArea.style.display = 'block';
                textArea.innerText = data.content;
            }
        } else {
            status.innerText = "ОШИБКА: " + data.error;
        }
    })
    .catch(function(err) {
        status.innerText = "СБОЙ СЕТИ";
        console.error(err);
    })
    .finally(function() {
        btn.disabled = false;
    });
};
