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
window.isPaidUser = false; // Глобальная переменная для игр
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
        // --- ИСПРАВЛЕНИЕ: Говорим Андроиду "Я тут, дай статус!" ---
        if(window.Android.notifyPageLoaded) {
        // Просим Android сообщить статус при старте
        if(window.Android && window.Android.notifyPageLoaded) {
            window.Android.notifyPageLoaded();
        }
    }
@@ -25,22 +75,19 @@ window.onload = function() {
    setInterval(updateMetadata, CONFIG.refreshTime);
};

// --- ФУНКЦИЯ, КОТОРУЮ ВЫЗОВЕТ ANDROID В ОТВЕТ ---
// СИНХРОНИЗАЦИЯ С АНДРОИДОМ
window.syncAppState = function(androidIsPlaying, androidIsPaid) {
    console.log("Sync received: Playing=" + androidIsPlaying);
    console.log("Sync: Playing=" + androidIsPlaying);

    // 1. Ставим статус оплаты
    window.isPaidUser = androidIsPaid;

    // 2. Обновляем визуальный плеер
    isPlaying = androidIsPlaying;
    isPlaying = androidIsPlaying; // Обновляем статус для статистики

    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');

    if (isPlaying) {
        if(icon) icon.className = "fas fa-pause";
        if(playerDiv) playerDiv.classList.add('playing'); // Добавляем класс вращения
        if(playerDiv) playerDiv.classList.add('playing');
    } else {
        if(icon) icon.className = "fas fa-play";
        if(playerDiv) playerDiv.classList.remove('playing');
@@ -53,6 +100,11 @@ window.openTab = function(tabName, btnElement) {
    document.getElementById(tabName).classList.add('active');
    if (btnElement) btnElement.classList.add('active');

    // Если вернулись на главную - сбрасываем игру в статистике
    if (tabName === 'home') {
        stats.currentGame = "lobby";
    }

    const gameFrame = document.getElementById('game-frame');
    if (gameFrame && gameFrame.contentWindow && typeof gameFrame.contentWindow.setGamePause === 'function') {
        if (tabName !== 'home') {
@@ -62,12 +114,22 @@ window.openTab = function(tabName, btnElement) {
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
        window.openTab('home', homeBtn);
        window.openTab('home', homeBtn); // Тут, возможно, ошибка в логике? Обычно игру открывают в табе игры.
        // Если у тебя игра открывается в табе 'games', то раскомментируй ниже:
        // window.openTab('games', null); 
    }
};

@@ -84,6 +146,7 @@ function togglePlayState() {
    if (isApp) {
        if (isPlaying) {
            window.Android.pauseAudio();
            // Визуал обновит syncAppState, но для мгновенного отклика можно и тут:
            if(icon) icon.className = "fas fa-play";
            if(playerDiv) playerDiv.classList.remove('playing');
            isPlaying = false;
@@ -97,6 +160,7 @@ function togglePlayState() {
        return;
    }

    // Логика для обычного браузера
    if (isPlaying) {
        audio.pause(); audio.src = ""; audio.load();
        if(icon) icon.className = "fas fa-play";
