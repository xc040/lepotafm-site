/* --- ТАЙМЕР СНА --- */
let sleepInterval = null;

function setSleepTimer(minutes) {
    // Сбрасываем старый если был
    cancelSleepTimer();

    const targetTime = Date.now() + (minutes * 60 * 1000);
    const statusDiv = document.getElementById('sleep-status');
    const countdownSpan = document.getElementById('sleep-countdown');

    statusDiv.style.display = "block"; // Показываем таймер

    sleepInterval = setInterval(() => {
        const now = Date.now();
        const diff = targetTime - now;

        if (diff <= 0) {
            // Время вышло!
            stopRadio();
            cancelSleepTimer();
            statusDiv.innerHTML = "Радио выключено 💤";
            setTimeout(() => { statusDiv.style.display = "none"; }, 3000);
        } else {
            // Обновляем цифры
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            countdownSpan.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        }
    }, 1000);
}

function cancelSleepTimer() {
    if (sleepInterval) clearInterval(sleepInterval);
    document.getElementById('sleep-status').style.display = "none";
}

/* --- БУДИЛЬНИК --- */
let alarmInterval = null;

// Загружаем сохраненный будильник при старте
window.addEventListener('load', () => {
    const savedTime = localStorage.getItem('alarmTime');
    const savedState = localStorage.getItem('alarmActive');
    
    if (savedTime) document.getElementById('alarm-time-input').value = savedTime;
    if (savedState === 'true') {
        document.getElementById('alarm-toggle').checked = true;
        startAlarmCheck();
    }
});

function toggleAlarm() {
    const isChecked = document.getElementById('alarm-toggle').checked;
    const timeVal = document.getElementById('alarm-time-input').value;

    if (isChecked) {
        if (!timeVal) {
            alert("Сначала выберите время!");
            document.getElementById('alarm-toggle').checked = false;
            return;
        }
        // Сохраняем
        localStorage.setItem('alarmTime', timeVal);
        localStorage.setItem('alarmActive', 'true');
        document.getElementById('alarm-msg').style.display = 'block';
        document.getElementById('alarm-msg').innerText = `Будильник на ${timeVal}`;
        startAlarmCheck();
    } else {
        // Выключаем
        localStorage.setItem('alarmActive', 'false');
        document.getElementById('alarm-msg').style.display = 'none';
        if (alarmInterval) clearInterval(alarmInterval);
    }
}

function startAlarmCheck() {
    if (alarmInterval) clearInterval(alarmInterval);

    alarmInterval = setInterval(() => {
        const now = new Date();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${currentHours}:${currentMinutes}`;
        
        const targetTime = localStorage.getItem('alarmTime');

        // Сравниваем время (и проверяем, чтобы секунды были 00, чтобы сработало 1 раз)
        if (currentTime === targetTime && now.getSeconds() === 0) {
            triggerAlarm();
        }
    }, 1000);
}

function triggerAlarm() {
    // Включаем радио
    playRadio();
    
    // Показываем сообщение
    const msg = document.getElementById('alarm-msg');
    msg.innerText = "⏰ ПОДЪЕМ! ИГРАЕТ МУЗЫКА!";
    msg.style.color = "#00f3ff";
    
    // Выключаем переключатель (чтобы завтра само не заиграло, если не хочешь)
    // document.getElementById('alarm-toggle').checked = false;
    // toggleAlarm(); 
}

/* --- Вспомогательные функции (связь с main.js) --- */
function stopRadio() {
    // Нажимаем кнопку Play, если музыка играет
    // Мы определяем это по классу иконки или глобальной переменной isPlaying из main.js
    if (typeof isPlaying !== 'undefined' && isPlaying) {
        document.getElementById('play-btn').click();
    }
}

function playRadio() {
    if (typeof isPlaying !== 'undefined' && !isPlaying) {
        document.getElementById('play-btn').click();
    }
}