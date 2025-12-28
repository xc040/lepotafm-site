// --- ЛОГИКА ГРОМКОСТИ ---
function initVolume() {
    const slider = document.getElementById('vol-slider');
    if (!slider) return;

    slider.addEventListener('input', (e) => {
        let vol = parseFloat(e.target.value);
        
        // 1. ЕСЛИ ПРИЛОЖЕНИЕ: Отправляем команду в Java
        if (isApp && window.Android) {
            try {
                window.Android.setVolume(vol); 
            } catch(e) { console.log(e); }
        } 
        // 2. ЕСЛИ БРАУЗЕР: Меняем громкость HTML5
        else {
            audio.volume = vol;
        }
    });
}
