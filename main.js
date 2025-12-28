function updateMetadata() {
    fetch(CONFIG.apiUrl + "?t=" + Date.now())
        .then(res => res.json())
        .then(data => {
            // 1. ТЕКУЩИЙ ТРЕК
            if (data.now_playing && data.now_playing.song) {
                const song = data.now_playing.song;
                
                // Проверка на пустоту
                let title = song.title || "Прямой эфир";
                let artist = song.artist || "LepotaFM";

                document.getElementById('track-name').innerText = title;
                document.getElementById('artist-name').innerText = artist;
                
                let artUrl = fixUrl(song.art);
                const img = document.getElementById('mini-art');
                
                if (img.src !== artUrl) img.src = artUrl;
            }

            // 2. ИСТОРИЯ
            if (data.song_history && data.song_history.length > 0) {
                renderHistory(data.song_history);
            } else {
                // Если истории нет
                document.getElementById('history-container').innerHTML = 
                    '<div class="loading-msg">История пока пуста</div>';
            }
        })
        .catch(err => {
            console.log("API Error");
            // Если ошибка - убираем слово "Загрузка"
            document.getElementById('track-name').innerText = "LepotaFM";
            document.getElementById('artist-name').innerText = "Онлайн";
        });
}
