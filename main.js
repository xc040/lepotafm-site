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

// === СИСТЕМА АВТОРИЗАЦИИ И ГЕНЕРАЦИИ ===

// 1. Идентификация устройства (для халявных попыток)
var deviceId = localStorage.getItem('device_id');
if (!deviceId) {
    deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('device_id', deviceId);
}

var currentUser = null;

// 2. Проверка сессии при запуске
function checkSession() {
    var fd = new FormData();
    fd.append('action', 'check_session');
    
    fetch('http://k96266d9.beget.tech/auth.php', { method: 'POST', body: fd })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        var statusDiv = document.getElementById('user-status');
        if (data.status === 'logged_in') {
            currentUser = data.user;
            statusDiv.innerHTML = '<span style="color:#00ff41"><i class="fas fa-user"></i> ' + currentUser + '</span> <i onclick="doAuth(\'logout\')" class="fas fa-sign-out-alt" style="cursor:pointer; margin-left:5px; color:#666;"></i>';
        } else {
            currentUser = null;
            statusDiv.innerHTML = 'Гость (2 попытки)';
        }
    })
    .catch(function(err){ console.log('Auth check fail'); });
}
// Запускаем проверку через секунду после старта
setTimeout(checkSession, 1000);

// 3. Функция Входа/Регистрации
window.doAuth = function(action) {
    var msg = document.getElementById('auth-msg');
    
    // Выход
    if (action === 'logout') {
        var fd = new FormData();
        fd.append('action', 'logout');
        fetch('http://k96266d9.beget.tech/auth.php', { method: 'POST', body: fd }).then(function() {
            checkSession();
        });
        return;
    }

    // Вход/Рега
    var login = document.getElementById('auth-login').value;
    var pass = document.getElementById('auth-pass').value;

    if (!login || !pass) {
        msg.innerText = "Введите логин и пароль";
        return;
    }

    var fd = new FormData();
    fd.append('action', action);
    fd.append('login', login);
    fd.append('password', pass);

    msg.innerText = "Загрузка...";

    fetch('http://k96266d9.beget.tech/auth.php', { method: 'POST', body: fd })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.status === 'success') {
            document.getElementById('auth-modal').classList.add('hidden');
            msg.innerText = "";
            checkSession(); // Обновляем статус
        } else {
            msg.innerText = data.message;
        }
    })
    .catch(function(err) { msg.innerText = "Ошибка сети"; });
};

// === ПЕРЕМЕННЫЕ ДЛЯ ГЕНЕРАЦИИ ===
var lastGeneratedUrl = ""; // Тут храним ссылку на игру

// === ФУНКЦИЯ ОТКРЫТИЯ В НОВОМ ОКНЕ (ИЗОЛЯЦИЯ) ===
window.openIsolatedGame = function() {
    if (!lastGeneratedUrl) return;
    // Открываем в новом окне (в Android WebView это создаст новое окно браузера или вкладку)
    window.open(lastGeneratedUrl, '_blank');
};

// === ГЕНЕРАЦИЯ ===
window.startGeneration = function() {
    var promptText = document.getElementById('ai-prompt').value;
    var btn = document.getElementById('ai-submit-btn');
    var status = document.getElementById('ai-status');
    var textArea = document.getElementById('text-output');
    var cardSlot = document.getElementById('game-card-slot');
    
    // Имя проекта
    var projectInput = document.getElementById('project-name');
    var project = (projectInput && projectInput.value.trim() !== "") ? projectInput.value : 'default';

    if (!promptText.trim()) return;

    btn.disabled = true;
    status.innerText = "ДУМАЮ (ЧИТАЮ КОНТЕКСТ)...";
    
    // Скрываем старое
    cardSlot.classList.add('hidden');
    textArea.classList.add('hidden');

    var formData = new FormData();
    formData.append('text', promptText);
    formData.append('mode', currentAiMode);
    formData.append('device_id', deviceId);
    formData.append('project', project);

    fetch('http://k96266d9.beget.tech/maker.php', { method: 'POST', body: formData })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) {
            status.innerText = "ГОТОВО!";
            
            if (data.type === 'file') {
                // РЕЖИМ ИГРЫ: Показываем карточку
                lastGeneratedUrl = data.url; // Запоминаем ссылку
                document.getElementById('gen-filename').innerText = data.name || "game.html";
                cardSlot.classList.remove('hidden'); // Показываем карточку
            } else {
                // РЕЖИМ ТЕКСТА
                textArea.classList.remove('hidden');
                textArea.innerText = data.content;
            }
        } else {
            if (data.error === 'LIMIT_REACHED') {
                status.innerText = "ЛИМИТ!";
                document.getElementById('auth-modal').classList.remove('hidden');
            } else {
                status.innerText = "ОШИБКА: " + data.error;
            }
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
