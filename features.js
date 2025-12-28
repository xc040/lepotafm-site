/* --- ТАЙМЕР СНА --- */
let sleepInterval = null;

function setSleepTimer(minutes) {
    cancelSleepTimer(); // Сброс старого

    const targetTime = Date.now() + (minutes * 60 * 1000);
    const statusDiv = document.getElementById('sleep-status');
    const countdownSpan = document.getElementById('sleep-countdown');

    statusDiv.style.display = "block"; 

    sleepInterval = setInterval(() => {
        const diff = targetTime - Date.now();

        if (diff <= 0) {
            // Время вышло!
            stopRadio();
            cancelSleepTimer();
            statusDiv.innerHTML = "Радио выключено 💤";
            setTimeout(() => { statusDiv.style.display = "none"; }, 3000);
        } else {
            // Тик-так
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            countdownSpan.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        }
    }, 1000);
}

function cancelSleepTimer() {
    if (sleepInterval) clearInterval(sleepInterval);
    const statusDiv = document.getElementById('sleep-status');
    if(statusDiv) {
        statusDiv.style.display = "none";
        statusDiv.innerHTML = 'Стоп через: <span id="sleep-countdown" class="neon-text">00:00</span> <button class="cancel-btn" onclick="cancelSleepTimer()">✕</button>';
    }
}

/* --- БУДИЛЬНИК --- */
let alarmInterval = null;

// При загрузке проверяем, был ли включен будильник
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
    const msg = document.getElementById('alarm-msg');

    if (isChecked) {
        if (!timeVal) {
            alert("Сначала выберите время!");
            document.getElementById('alarm-toggle').checked = false;
            return;
        }
        // Сохраняем
        localStorage.setItem('alarmTime', timeVal);
        localStorage.setItem('alarmActive', 'true');
        
        msg.style.display = 'block';
        msg.style.color = '#00f3ff';
        msg.innerText = `Будильник установлен на ${timeVal}`;
        
        startAlarmCheck();
    } else {
        // Выключаем
        localStorage.setItem('alarmActive', 'false');
        msg.style.display = 'none';
        if (alarmInterval) clearInterval(alarmInterval);
    }
}

function startAlarmCheck() {
    if (alarmInterval) clearInterval(alarmInterval);

    alarmInterval = setInterval(() => {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${h}:${m}`;
        
        const targetTime = localStorage.getItem('alarmTime');

        // Если время совпало и секунды == 0
        if (currentTime === targetTime && now.getSeconds() === 0) {
            triggerAlarm();
        }
    }, 1000);
}

function triggerAlarm() {
    // 1. Включаем радио (используем функцию из main.js)
    playRadio();
    
    // 2. Ставим громкость на максимум (чтобы точно проснулся)
    const slider = document.getElementById('vol-slider');
    if (slider) {
        slider.value = 1.0;
        // Генерируем событие, чтобы main.js увидел изменение
        slider.dispatchEvent(new Event('input'));
    }

    // 3. Пишем сообщение
    const msg = document.getElementById('alarm-msg');
    msg.innerText = "⏰ ПОДЪЕМ! ИГРАЕТ РАДИО!";
    msg.style.color = "var(--neon-pink)";
}

/* --- СВЯЗЬ С MAIN.JS --- */
function stopRadio() {
    // Если играет (переменная из main.js), нажимаем кнопку
    if (typeof isPlaying !== 'undefined' && isPlaying) {
        document.getElementById('play-btn').click();
    }
}

function playRadio() {
    // Если НЕ играет, нажимаем кнопку
    if (typeof isPlaying !== 'undefined' && !isPlaying) {
        document.getElementById('play-btn').click();
    }
}
