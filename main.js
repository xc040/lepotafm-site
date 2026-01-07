// --- ДОБАВЛЕНО В САМЫЙ КОНЕЦ ФАЙЛА main.js ---

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ СТУДИИ ===
var currentMode = 'code'; // Режим генерации: code, chat, patch, analyze
var currentProjectName = '';
var currentProjectVersions = []; // Массив [{name: 'game_123.html', timestamp: 12345}, ...]
var lastGeneratedFilePath = ''; // Путь к последней сгенерированной игре
var isGameLoaded = false; // Флаг, что игра загружена в iframe

// --- ФУНКЦИИ УПРАВЛЕНИЯ РЕЖИМАМИ ---
window.setMode = function(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    // TODO: Обновить UI, возможно, показать/скрыть поля ввода
    console.log("Режим установлен:", currentMode);

    // Показываем/скрываем поле для загрузки файла в зависимости от режима
    const gameFileLabel = document.querySelector('label[for="gameFile"]');
    const gameFile = document.getElementById('gameFile');
    if (mode === 'patch' || mode === 'analyze') {
        if (gameFileLabel) gameFileLabel.style.display = 'inline';
        if (gameFile) gameFile.style.display = 'inline-block';
    } else {
        if (gameFileLabel) gameFileLabel.style.display = 'none';
        if (gameFile) gameFile.style.display = 'none';
        // Очищаем поле выбора файла, если переключили режим
        if (gameFile) gameFile.value = ''; 
    }
};

// --- ФУНКЦИИ УПРАВЛЕНИЯ ПРОЕКТОМ ---
function setProjectName(name) {
    currentProjectName = name || `project_${Date.now()}`;
    document.getElementById('projectName').value = currentProjectName;
    document.getElementById('projectNameDisplay').innerText = currentProjectName;
    localStorage.setItem('currentProjectName', currentProjectName); // Сохраняем имя проекта
}

function addVersionToProject(filePath, timestamp, projectName) {
    // Если имя проекта изменилось, обновляем
    if (projectName && projectName !== currentProjectName) {
        setProjectName(projectName);
    }
    
    currentProjectVersions.push({ name: filePath, timestamp: timestamp });
    currentProjectVersions.sort((a, b) => b.timestamp - a.timestamp); // Сортируем по убыванию времени
    renderProjectVersions();
    document.getElementById('projectVersionCount').innerText = currentProjectVersions.length;
    if(currentProjectVersions.length > 0) {
        document.getElementById('projectLastVersion').innerText = currentProjectVersions[0].name;
    }
    localStorage.setItem('projectVersions', JSON.stringify(currentProjectVersions)); // Сохраняем версии
}

function renderProjectVersions() {
    const versionList = document.querySelector('#p-versions .version-list');
    versionList.innerHTML = ''; // Очищаем
    currentProjectVersions.forEach((version, index) => {
        const versionItem = document.createElement('div');
        versionItem.classList.add('version-item');
        versionItem.dataset.filePath = version.name;
        if (index === 0) versionItem.classList.add('selected'); // Выделяем последнюю

        const timestamp = new Date(version.timestamp * 1000); // Конвертируем сек в мс
        const timeString = timestamp.toLocaleString(); // Форматируем дату

        versionItem.innerHTML = `
            <span>${version.name.split('/').pop()}</span> <!-- Показываем только имя файла -->
            <span>${timeString}</span>
            <button class="restore-btn" onclick="restoreVersion('${version.name}')">Вернуть</button>
        `;
        versionItem.onclick = function(e) {
             // Игнорируем клик, если нажали на кнопку "Вернуть"
             if (e.target.classList.contains('restore-btn')) return;

            // Выделяем кликнутую версию
            document.querySelectorAll('#p-versions .version-item').forEach(v => v.classList.remove('selected'));
            versionItem.classList.add('selected');
            // Загружаем эту версию в превью
            loadGamePreview(version.name);
        };
        versionList.appendChild(versionItem);
    });
}

function restoreVersion(filePath) {
    console.log("Восстанавливаем версию:", filePath);
    loadGamePreview(filePath);
    // TODO: Обновить UI, если нужно
}

// --- ИНИЦИАЛИЗАЦИЯ ---
window.onload = function() {
    // ... (оставляем старый код window.onload, кроме строки 'var cachedHomePane = null;') ...
    // 1. Убираем голубое выделение
    var style = document.createElement('style');
    style.innerHTML = "* { -webkit-tap-highlight-color: transparent; } button:focus, .tab-btn:focus, #play-btn:focus { outline: none; }";
    document.head.appendChild(style);

    // 2. Заполняем кэш (для studio/ether нам не нужен cachedHomePane)
    // cachedHomePane = document.getElementById('home'); 

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

    // --- Инициализация студии ---
    // Устанавливаем имя проекта из LocalStorage или создаем новое
    const savedProjectName = localStorage.getItem('currentProjectName');
    setProjectName(savedProjectsName || `project_${Date.now()}`);
    document.getElementById('projectCreationDate').innerText = localStorage.getItem('projectCreationDate') || '---';

    // Загружаем сохраненные версии
    const savedVersionsJson = localStorage.getItem('projectVersions');
    if (savedVersionsJson) {
        try {
            currentProjectVersions = JSON.parse(savedVersionsJson);
            renderProjectVersions(); // Рендерим список версий
            document.getElementById('projectVersionCount').innerText = currentProjectVersions.length;
            if (currentProjectVersions.length > 0) {
                document.getElementById('projectLastVersion').innerText = currentProjectVersions[0].name;
                 // Автоматически загружаем последнюю версию в превью при старте
                 loadGamePreview(currentProjectVersions[0].name);
            } else {
                document.getElementById('projectLastVersion').innerText = 'Нет';
            }
        } catch (e) {
            console.error("Ошибка загрузки версий проекта:", e);
            localStorage.removeItem('projectVersions'); // Очищаем, если формат JSON неверен
        }
    }

    // Инициализация UI для режимов
    setMode(currentMode); // Устанавливаем режим по умолчанию ('code')

    // Автоопределение игры при запуске в APK (оставить как есть)
    if (isApp) {
        setTimeout(function() {
            var frame = document.getElementById('game-frame');
            if (frame && frame.src && frame.src !== '' && frame.src !== 'about:blank') {
                // ... (код автоопределения) ...
            }
        }, 2000);
    }
};

// --- ФУНКЦИИ ГЕНЕРАЦИИ ---
window.generateGame = async function() {
    const promptText = document.getElementById('promptInput').value.trim();
    const projectNameInput = document.getElementById('projectName');
    const gameFileInput = document.getElementById('gameFile');
    const btn = document.getElementById('genBtn');
    const statusDiv = document.getElementById('status');
    const frame = document.getElementById('gameFrame');
    const runBtn = document.getElementById('runGameBtn');
    const thumbnailDiv = document.getElementById('thumbnail');

    // Валидация
    if ((currentMode === 'code' || currentMode === 'chat') && !promptText) {
        statusDiv.innerText = "ОШИБКА: Заполните поле запроса.";
        return;
    }
    if ((currentMode === 'patch' || currentMode === 'analyze') && gameFileInput.files.length === 0) {
        statusDiv.innerText = "ОШИБКА: Для режима 'Часть'/'Анализ' выберите файл игры.";
        return;
    }

    // Обновляем имя проекта, если оно изменилось
    if (projectNameInput.value !== currentProjectName) {
        setProjectName(projectNameInput.value);
    }

    // Блокируем интерфейс
    btn.disabled = true;
    runBtn.disabled = true;
    statusDiv.innerText = "ПОДГОТОВКА...";
    frame.src = ""; // Очистка превью
    thumbnailDiv.innerHTML = ''; // Очистка миниатюры
    isGameLoaded = false;

    // Подготовка данных для POST запроса
    const formData = new FormData();
    formData.append('mode', currentMode);
    formData.append('prompt', promptText);
    formData.append('projectName', currentProjectName);

    if (currentMode === 'patch' || currentMode === 'analyze') {
        formData.append('gameFile', gameFileInput.files[0]);
    }

    try {
        statusDiv.innerText = `СВЯЗЬ С НЕЙРОСЕТЬЮ (${currentMode.toUpperCase()})... ДУМАЮ...`;

        const response = await fetch('maker.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            statusDiv.innerText = "УСПЕХ: КОД ПОЛУЧЕН. ЗАГРУЗКА...";
            lastGeneratedFilePath = data.url; // Сохраняем путь
            addVersionToProject(data.url, data.timestamp, data.projectName); // Добавляем в историю проекта
            loadGamePreview(data.url); // Загружаем в iframe
            runBtn.disabled = false; // Кнопка "Запуск" активна
            isGameLoaded = true;
        } else {
            statusDiv.innerText = "ОШИБКА СЕРВЕРА: " + (data.error || "Неизвестная ошибка");
            runBtn.disabled = true;
        }

    } catch (e) {
        statusDiv.innerText = "КРИТИЧЕСКИЙ СБОЙ СЕТИ";
        console.error(e);
        runBtn.disabled = true;
    } finally {
        btn.disabled = false;
        // TODO: Реализовать генерацию миниатюры и показ здесь
        if(isGameLoaded) {
            thumbnailDiv.innerHTML = '<div class="placeholder-box" style="padding:10px; font-size:12px;">Миниатюра</div>'; 
        }
    }
};

// Функция загрузки игры в iframe
window.loadGamePreview = function(filePath) {
    const frame = document.getElementById('gameFrame');
    if (frame) {
        frame.src = filePath + "?v=" + Date.now();
        frame.onload = () => {
            console.log("Игра загружена:", filePath);
            document.getElementById('status').innerText = "Игра загружена.";
            isGameLoaded = true;
        };
        frame.onerror = () => {
            console.error("Ошибка загрузки игры:", filePath);
            document.getElementById('status').innerText = "Ошибка загрузки игры.";
            isGameLoaded = false;
        };
    }
};

// Функция запуска игры на весь экран
window.runGameInFullScreen = function() {
    if (isGameLoaded && lastGeneratedFilePath) {
        // TODO: Реализовать полноэкранный режим или новое окно
        window.open(lastGeneratedFilePath, '_blank', 'width=800,height=600,resizable=yes,scrollbars=no'); // Пример открытия в новом окне
        console.log("Запуск игры:", lastGeneratedFilePath);
    } else {
        alert("Сначала сгенерируйте или загрузите игру!");
    }
};

// Сброс формы для новой генерации
window.resetGenerationForm = function() {
    document.getElementById('promptInput').value = '';
    document.getElementById('gameFile').value = ''; // Сбрасываем выбор файла
    document.getElementById('projectName').value = currentProjectName; // Оставляем имя проекта
    document.getElementById('status').innerText = "ОЖИДАНИЕ ВВОДА...";
    document.getElementById('gameFrame').src = '';
    document.getElementById('thumbnail').innerHTML = ''; // Очищаем миниатюру
    document.getElementById('runGameBtn').disabled = true;
    document.getElementById('genBtn').disabled = false;
    isGameLoaded = false;
    
    // Сбрасываем выделение версии
    document.querySelectorAll('#p-versions .version-item').forEach(v => v.classList.remove('selected'));
    // TODO: Возможно, подгрузить последнюю версию обратно, если она была загружена
};

// --- Функция переключения под-вкладок (уже должна быть, но на всякий случай) ---
window.openSubTab = function(parentId, subTabId, btnElement) {
    var parent = document.getElementById(parentId);
    if (!parent) return;

    var buttons = parent.querySelectorAll('.sub-tab-btn');
    var panes = parent.querySelectorAll('.sub-pane');

    buttons.forEach(btn => btn.classList.remove('active'));
    panes.forEach(pane => pane.classList.remove('active'));

    var target = document.getElementById(subTabId);
    if (target) target.classList.add('active');
    if (btnElement) btnElement.classList.add('active');
};
// --- Конец добавленного кода ---

// (В конце файла main.js должен быть закрывающий тег </script>)
