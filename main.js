const CONFIG = {
    streamUrl: "https://lepotafm.ru/listen/lepotafm/radio.mp3", 
    apiUrl: "https://lepotafm.ru/api/nowplaying/lepotafm",           
    defaultImage: "logo.jpg",      
    updateInterval: 5000 
};

// Проверка: в приложении мы или нет
const isApp = (typeof window.Android !== "undefined") || window.location.search.includes('app=true');

let audio = new Audio();
let isPlaying = false; 

// В приложении считаем, что уже играет
if (isApp) isPlaying = true;

window.addEventListener('load', () => {
    initPlayer();
    initBarba();
    updateMetadata();
    setInterval(updateMetadata, CONFIG.updateInterval);
});

function initPlayer() {
    const playBtn = document.getElementById('play-btn');
    const playIcon = document.getElementById('play-icon');

    if (!playBtn) return;

    if (isApp) playIcon.innerText = "⏸";

    playBtn.addEventListener('click', () => {
        // ЛОГИКА ПРИЛОЖЕНИЯ
        if (isApp) {
            if (isPlaying) {
                if (window.Android) window.Android.pauseAudio();
                playIcon.innerText = "▶";
                isPlaying = false;
            } else {
                if (window.Android) window.Android.playAudio();
                playIcon.innerText = "⏸";
                isPlaying = true;
            }
            return;
        }

        // ЛОГИКА БРАУЗЕРА
        if (isPlaying) {
            audio.pause();
            audio.src = ""; 
            playIcon.innerText = "▶";
            isPlaying = false;
        } else {
            playIcon.innerText = "⏳";
            audio.crossOrigin = "anonymous";
            audio.src = CONFIG.streamUrl + "?nocache=" + Date.now();
            audio.load();
            audio.play()
                .then(() => {
                    playIcon.innerText = "⏸";
                    isPlaying = true;
                }).catch(err => playIcon.innerText = "▶");
        }
    });
}

function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
    .then(res => res.json())
    .then(data => {
        if (!data.now_playing || !data.now_playing.song) return;
        const song = data.now_playing.song;
        
        const miniName = document.getElementById('mini-track-name');
        const bigName = document.getElementById('track-name');
        const artistName = document.getElementById('artist-name');
        
        if (miniName) miniName.innerText = song.title;
        if (bigName) bigName.innerText = song.title;
        if (artistName) artistName.innerText = song.artist;

        // КАРТИНКА (Просто и надежно)
        const img = document.getElementById('album-art');
        if (img) {
            let artUrl = song.art;
            if (artUrl && artUrl.length > 5) {
                if (artUrl.startsWith("http:")) artUrl = artUrl.replace("http:", "https:");
                
                // Просто меняем. Если картинка битая - сработает onerror в HTML
                if (img.src !== artUrl) img.src = artUrl;
            } else {
                if (!img.src.includes(CONFIG.defaultImage)) img.src = CONFIG.defaultImage;
            }
        }
    })
    .catch(e => console.log("Ошибка API"));
}

function initBarba() {
    if (typeof barba === 'undefined') return;
    barba.init({
        transitions: [{
            name: 'fade',
            leave(data) { 
                return typeof gsap !== 'undefined' ? 
                    gsap.to(data.current.container, { opacity: 0, duration: 0.3 }) : null; 
            },
            enter(data) { 
                window.scrollTo(0, 0); 
                return typeof gsap !== 'undefined' ? 
                    gsap.from(data.next.container, { opacity: 0, duration: 0.3 }) : null; 
            }
        }]
    });
}
