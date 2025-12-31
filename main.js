/* --- НАСТРОЙКИ --- */
const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3",
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    defaultImage: "logo.jpg", 
    refreshTime: 8000 
};

const isApp = (typeof window.Android !== "undefined");
let audio = new Audio(); 
let isPlaying = false; 
let isGamePausedSystem = false; 

window.onload = function() {
    if (!isApp) audio.src = CONFIG.streamUrl;
    initPlayer();
    initVolume();
    updateMetadata();
    setInterval(updateMetadata, CONFIG.refreshTime);
};

/* ================== СИСТЕМНАЯ ПАУЗА ================== */
window.toggleGamePause = function(forceState) {
    const overlay = document.getElementById('pause-overlay');
    const btnIcon = document.getElementById('pause-icon');
    
    const newState = (forceState !== undefined) ? forceState : !isGamePausedSystem;
    isGamePausedSystem = newState;

    if (isGamePausedSystem) {
        // ПАУЗА (Радио НЕ трогаем, только игру)
        overlay.style.display = 'flex';
        btnIcon.className = 'fas fa-play';
    } else {
        // ИГРАЕМ
        overlay.style.display = 'none';
        btnIcon.className = 'fas fa-pause';
    }
};

/* ================== ИНФО О ИГРЕ ================== */
window.openGameInfo = function() {
    window.openSku("Snake", "Лицензия: Open Source\nВерсия: 1.0", CONFIG.defaultImage);
};

/* ================== Вкладки ================== */
window.openTab = function(tabName, btnElement) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    if (btnElement) btnElement.classList.add('active');

    const gameFrame = document.getElementById('game-frame');
    if (gameFrame && gameFrame.contentWindow && typeof gameFrame.contentWindow.setGamePause === 'function') {
        if (tabName === 'home') {
            gameFrame.contentWindow.setGamePause(false);
            toggleGamePause(false);
        } else {
            gameFrame.contentWindow.setGamePause(true);
            toggleGamePause(true);
        }
    }
};

/* ================== Плеер ================== */
function initPlayer() {
    const playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.addEventListener('click', togglePlayState);
}

function togglePlayState() {
    const icon = document.getElementById('play-icon');
    const playerDiv = document.querySelector('.inline-player');

    if (isApp) {
        if (isPlaying) {
            window.Android.pauseAudio();
            if(icon) icon.className = "fas fa-play";
            if(playerDiv) playerDiv.classList.remove('playing');
            isPlaying = false;
        } else {
            window.Android.playAudio();
            if(icon) icon.className = "fas fa-pause";
            if(playerDiv) playerDiv.classList.add('playing');
            isPlaying = true;
        }
        return;
    }

    if (isPlaying) {
        audio.pause();
        audio.src = ""; 
        audio.load();
        if(icon) icon.className = "fas fa-play";
        if(playerDiv) playerDiv.classList.remove('playing');
        isPlaying = false;
    } else {
        audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
        audio.play().catch(e => console.log("Autoplay block"));
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
    if (finalVol < 0.1) finalVol = 0.5;
    slider.value = finalVol;
    if (!isApp) audio.volume = finalVol;
    if (isApp) setTimeout(() => { try { window.Android.setVolume(finalVol); } catch(e){} }, 1000);

    slider.addEventListener('input', (e) => {
        let vol = parseFloat(e.target.value);
        localStorage.setItem('savedVolume', vol);
        if (isApp) { try { window.Android.setVolume(vol); } catch(e) {} } else { audio.volume = vol; }
        if (vol === 0 && isPlaying) togglePlayState();
        else if (vol > 0 && !isPlaying) togglePlayState();
    });
}

function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(res => res.json())
        .then(data => {
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                const titleEl = document.getElementById('track-name');
                const artistEl = document.getElementById('artist-name');
                const imgEl = document.getElementById('mini-art');
                const sepEl = document.getElementById('track-sep');
                if (titleEl) titleEl.innerText = song.title;
                if (song.artist) {
                    if (artistEl) artistEl.innerText = song.artist;
                    if (sepEl) sepEl.style.display = "inline";
                } else {
                    if (artistEl) artistEl.innerText = "";
                    if (sepEl) sepEl.style.display = "none";
                }
                let artUrl = fixUrl(song.art);
                if (imgEl && imgEl.src !== artUrl) imgEl.src = artUrl;
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
        const safeTitle = (song.title || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeArtist = (song.artist || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeArt = art;
        html += `<div class="history-item"><img src="${art}" class="hist-img" onerror="this.src='${CONFIG.defaultImage}'"><div class="hist-info"><span class="hist-title">${song.title}</span><span class="hist-artist">${song.artist}</span></div><button class="sku-btn" onclick="openSku('${safeTitle}', '${safeArtist}', '${safeArt}')"><i class="fas fa-info"></i></button></div>`;
    });
    if (container.innerHTML !== html) container.innerHTML = html;
}

function fixUrl(url) {
    if (!url || url.includes('generic')) return CONFIG.defaultImage;
    if (url.startsWith('http:')) return url.replace('http:', 'https:');
    return url;
}

window.playRadioForce = function() { if (!isPlaying) togglePlayState(); };
window.stopRadioForce = function() { if (isPlaying) togglePlayState(); };
window.openSku = function(title, artist, art) {
    const modal = document.getElementById('info-modal');
    document.getElementById('modal-art').src = art;
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-artist').innerText = artist;
    if(modal) modal.classList.remove('hidden');
};
window.closeSku = function() { document.getElementById('info-modal').classList.add('hidden'); };
