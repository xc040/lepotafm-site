/* --- ТАЙМЕР СНА (СЛАЙДЕР) --- */
let sleepInterval = null;

function updateSleepLabel(minutes) {
    const display = document.getElementById('timer-val-display');
    if (minutes == 0) display.innerText = "Off";
    else display.innerText = minutes + " мин";
}

function setSleepTimer(minutes) {
    cancelSleepTimer(); // Сброс

    if (minutes == 0) return; // Если 0 - просто выключили

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
            // Сбрасываем слайдер
            document.getElementById('sleep-slider').value = 0;
            document.getElementById('timer-val-display').innerText = "Off";
        } else {
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            countdownSpan.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        }
    }, 1000);
}

function cancelSleepTimer() {
    if (sleepInterval) clearInterval(sleepInterval);
    const statusDiv = document.getElementById('sleep-status');
    if(statusDiv) statusDiv.style.display = "none";
}

/* --- БУДИЛЬНИК (СПИСОК) --- */
let alarms = []; // Массив будильников
let alarmChecker = null;

window.addEventListener('load', () => {
    loadAlarms();
    startAlarmClock();
});

// Загрузка из памяти
function loadAlarms() {
    const stored = localStorage.getItem('myAlarms');
    if (stored) {
        alarms = JSON.parse(stored);
        renderAlarms();
    }
}

// Сохранение
function saveAlarms() {
    localStorage.setItem('myAlarms', JSON.stringify(alarms));
    renderAlarms();
}

// Выбор дней при создании
let selectedDays = []; // 0=Вс, 1=Пн...
function toggleDay(el) {
    const day = parseInt(el.getAttribute('data-day'));
    if (selectedDays.includes(day)) {
        selectedDays = selectedDays.filter(d => d !== day);
        el.classList.remove('selected');
    } else {
        selectedDays.push(day);
        el.classList.add('selected');
    }
}

// Добавить будильник
function addAlarm() {
    const timeInput = document.getElementById('new-alarm-time');
    const time = timeInput.value;

    if (!time) { alert("Выберите время!"); return; }
    if (selectedDays.length === 0) { alert("Выберите дни недели!"); return; }

    alarms.push({
        time: time,
        days: [...selectedDays], // Копия массива
        active: true
    });

    saveAlarms();
    
    // Сброс формы
    timeInput.value = "";
    selectedDays = [];
    document.querySelectorAll('.day-check').forEach(el => el.classList.remove('selected'));
}

// Удалить будильник
function deleteAlarm(index) {
    alarms.splice(index, 1);
    saveAlarms();
}

// Отрисовка списка
function renderAlarms() {
    const container = document.getElementById('alarms-list');
    container.innerHTML = "";
    
    const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

    alarms.forEach((alarm, index) => {
        // Формируем строку дней
        let daysStr = alarm.days.map(d => dayNames[d]).join(", ");
        if (alarm.days.length === 7) daysStr = "Каждый день";

        const div = document.createElement('div');
        div.className = "alarm-item";
        div.innerHTML = `
            <div>
                <div class="alarm-time">${alarm.time}</div>
                <div class="alarm-days">${daysStr}</div>
            </div>
            <button class="alarm-del-btn" onclick="deleteAlarm(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

// ГЛАВНЫЙ ЦИКЛ ПРОВЕРКИ
function startAlarmClock() {
    if (alarmChecker) clearInterval(alarmChecker);
    
    alarmChecker = setInterval(() => {
        const now = new Date();
        const currentDay = now.getDay(); // 0-6
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${h}:${m}`;
        const seconds = now.getSeconds();

        // Проверяем только в 00 секунд (чтобы не орало минуту)
        if (seconds !== 0) return;

        alarms.forEach(alarm => {
            if (alarm.active && alarm.time === currentTime && alarm.days.includes(currentDay)) {
                triggerAlarm();
            }
        });

    }, 1000);
}

function triggerAlarm() {
    playRadio();
    // Громкость на макс
    const slider = document.getElementById('vol-slider');
    if (slider) {
        slider.value = 1.0;
        slider.dispatchEvent(new Event('input'));
    }
    
    const msg = document.getElementById('alarm-msg');
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 60000);
}

/* --- СВЯЗЬ --- */
function stopRadio() {
    if (typeof isPlaying !== 'undefined' && isPlaying) {
        document.getElementById('play-btn').click();
    }
}
function playRadio() {
    if (typeof isPlaying !== 'undefined' && !isPlaying) {
        document.getElementById('play-btn').click();
    }
}
