const CONFIG = {
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",
    defaultImage: "logo.jpg", 
    refreshTime: 8000 
};

const isApp = (typeof window.Android !== "undefined");
let isPlaying = false; 

window.onload = function() {
    initPlayer();
    initVolume();
    updateMetadata();
    setInterval(updateMetadata, CONFIG.refreshTime);
};

window.openTab = function(tabName, btnElement) {
    document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabName).style.display = 'block';
    if (btnElement) btnElement.classList.add('active');

    const gameFrame = document.getElementById('game-frame');
    if (gameFrame && gameFrame.contentWindow && typeof gameFrame.contentWindow.setGamePause === 'function') {
        if (tabName !== 'home') gameFrame.contentWindow.setGamePause(true);
    }
};

window.loadGame = function(gamePath) {
    const frame = document.getElementById('game-frame');
    if(frame) {
        // Уникальный ключ к ссылке для обхода кэша
        frame.src = gamePath + "?v=" + Date.now();
        const homeBtn = document.querySelector('.tab-btn[onclick*="home"]');
        window.openTab('home', homeBtn);
    }
};

function initPlayer() {
    document.getElementById('play-btn').addEventListener('click', () => {
        const icon = document.getElementById('play-icon');
        if (isPlaying) {
            window.Android.pauseAudio();
            icon.className = "fas fa-play";
            isPlaying = false;
        } else {
            window.Android.playAudio();
            icon.className = "fas fa-pause";
            isPlaying = true;
        }
    });
}

function initVolume() {
    const slider = document.getElementById('vol-slider');
    let saved = localStorage.getItem('savedVolume') || 1.0;
    slider.value = saved;
    window.Android.setVolume(parseFloat(saved));

    slider.addEventListener('input', (e) => {
        let vol = parseFloat(e.target.value);
        localStorage.setItem('savedVolume', vol);
        window.Android.setVolume(vol);
    });
}

function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(res => res.json())
        .then(data => {
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                document.getElementById('track-name').innerText = song.title;
                document.getElementById('artist-name').innerText = song.artist || "";
                document.getElementById('mini-art').src = fixUrl(song.art);
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
        const safeT = song.title.replace(/'/g, "\\'");
        const safeA = (song.artist || "").replace(/'/g, "\\'");
        html += `<div class="history-item"><img src="${art}" class="hist-img" onerror="this.src='${CONFIG.defaultImage}'"><div class="hist-info"><span class="hist-title">${song.title}</span><span class="hist-artist">${song.artist}</span></div><button class="sku-btn" onclick="openSku('${safeT}', '${safeA}', '${art}')"><i class="fas fa-info"></i></button></div>`;
    });
    container.innerHTML = html;
}

function fixUrl(url) {
    if (!url || url.includes('generic')) return CONFIG.defaultImage;
    return url.replace('http:', 'https:');
}

window.openSku = function(title, artist, art) {
    document.getElementById('modal-art').src = art;
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-artist').innerText = artist;
    document.getElementById('info-modal').classList.remove('hidden');
};
window.closeSku = function() { document.getElementById('info-modal').classList.add('hidden'); };
