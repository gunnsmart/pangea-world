// ui/static/app.js
let ws = null;
let canvas = document.getElementById('map-canvas');
let ctx = canvas.getContext('2d');
let CELL_SIZE = 6;
const MAP_SIZE = 100;
let lastState = null;
let gameOver = false;

function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    ws.onopen = () => console.log('WebSocket connected');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'full') {
            lastState = data.data;
            renderFull(lastState);
        } else if (data.type === 'log') {
            addLog(data.data);
        } else if (data.type === 'dialogue') {
            addDialogue(data.data);
        }
    };
    ws.onclose = () => setTimeout(initWebSocket, 3000);
}

// Log
function addLog(msg) {
    const container = document.getElementById('log-list');
    if (!container) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = msg;
    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
    while (container.children.length > 100) container.removeChild(container.firstChild);
}

// Dialogue
function addDialogue(utt) {
    const panel = document.getElementById('dialogue-panel');
    if (!panel) return;
    const entry = document.createElement('div');
    entry.className = 'dialogue-entry';
    entry.innerHTML = `<strong>${utt.speaker}</strong> ${utt.words}`;
    panel.appendChild(entry);
    panel.scrollTop = panel.scrollHeight;
    while (panel.children.length > 30) panel.removeChild(panel.firstChild);
}

// รีเซ็ต log (ใช้เมื่อได้รับ history ใหม่)
function clearLog() {
    const container = document.getElementById('log-list');
    if (container) container.innerHTML = '';
}
function clearDialogue() {
    const panel = document.getElementById('dialogue-panel');
    if (panel) panel.innerHTML = '';
}

function renderFull(state) {
    if (!state) return;
    // Update header stats
    document.getElementById('day').innerText = state.day;
    document.getElementById('time').innerText = state.time || `${state.hour}:00`;
    document.getElementById('temp').innerText = state.temp;
    document.getElementById('weather').innerText = state.weather;
    document.getElementById('biomass').innerText = state.biomass.toFixed(1);
    document.getElementById('rabbit').innerText = state.fauna.rabbit;
    document.getElementById('deer').innerText = state.fauna.deer;
    document.getElementById('tiger').innerText = state.fauna.tiger;
    document.getElementById('eagle').innerText = state.fauna.eagle;

    // Update relationship
    if (state.relationship) {
        document.getElementById('rel-stage').innerText = state.relationship.stage;
        setBar('rel-bond', 'rel-bond-val', state.relationship.bond, 100);
        setBar('rel-trust', 'rel-trust-val', state.relationship.trust, 100);
        setBar('rel-conflict', 'rel-conflict-val', state.relationship.conflict, 100);
    }

    // Update disasters
    const dsec = document.getElementById('disaster-section');
    if (dsec) {
        if (state.disasters && state.disasters.length) {
            dsec.innerHTML = state.disasters.map(d => `<div class="alert">⚠️ ${d.label} — ${(d.severity*100).toFixed(0)}% | เหลือ ${d.days_left} วัน</div>`).join('');
        } else {
            dsec.innerHTML = '';
        }
    }

    // Update fire info
    const fireDiv = document.getElementById('fire-info');
    if (fireDiv) {
        if (state.fire_spots && state.fire_spots.length) {
            fireDiv.innerHTML = state.fire_spots.map(f => `<div>🔥 ที่ (${f.x},${f.y}) | ความรุนแรง ${f.intensity}</div>`).join('');
        } else {
            fireDiv.innerHTML = 'ไม่มีกองไฟ';
        }
    }

    // Update atmosphere
    const atmoGrid = document.getElementById('atmo-grid');
    if (atmoGrid && state.atmosphere) {
        atmoGrid.innerHTML = Object.entries(state.atmosphere).map(([k,v]) => `<div class="stat">${k}: <span>${v}</span></div>`).join('');
    }

    // Update dialogue panel from state.dialogue (initial history)
    const dialoguePanel = document.getElementById('dialogue-panel');
    if (dialoguePanel && state.dialogue && state.dialogue.length) {
        dialoguePanel.innerHTML = state.dialogue.map(d => `<div class="dialogue-entry"><strong>${d.speaker}</strong> ${d.words}</div>`).join('');
    } else if (dialoguePanel) {
        dialoguePanel.innerHTML = '<div class="dialogue-entry">ยังไม่มีบทสนทนา</div>';
    }

    // Update humans
    renderHumans(state.humans);

    // Update map
    drawMap(state.map);

    // Update log panel from state.history
    if (state.history && state.history.length) {
        clearLog();
        state.history.slice(-50).forEach(msg => addLog(msg));
    }

    // Check game over
    checkGameOver(state);
}

function renderHumans(humans) {
    const container = document.getElementById('humans-panel');
    if (!container) return;
    if (!humans || humans.length === 0) {
        container.innerHTML = '<div class="human-card">ไม่มีมนุษย์รอดชีวิต</div>';
        return;
    }
    container.innerHTML = humans.map(h => {
        const d = h.drives || {};
        return `
        <div class="human-card">
            <div class="human-name">${h.name} (${h.sex === 'M' ? '♂' : '♀'})</div>
            <div class="human-stats">
                Health: ${(h.health || 0).toFixed(0)} | Age: ${(h.age || 0).toFixed(1)}<br>
                Action: ${h.action || 'idle'}<br>
                Emotion: ${h.emotion || '😐'}<br>
                Hunger: ${(d.hunger || 0).toFixed(0)} | Tired: ${(d.tired || 0).toFixed(0)}<br>
                Cold: ${(d.cold || 0).toFixed(0)} | Fear: ${(d.fear || 0).toFixed(0)}<br>
                Lonely: ${(d.lonely || 0).toFixed(0)} | Bored: ${(d.bored || 0).toFixed(0)}
            </div>
            ${h.last_speech ? `<div style="margin-top:6px;font-style:italic;">💬 "${h.last_speech}"</div>` : ''}
        </div>`;
    }).join('');
}

function setBar(barId, valId, val, max) {
    const bar = document.getElementById(barId);
    const txt = document.getElementById(valId);
    if (bar) {
        const percent = Math.min(100, (val / max) * 100);
        bar.style.width = `${percent}%`;
    }
    if (txt) txt.innerText = val;
}

function drawMap(mapData) {
    if (!mapData || mapData.length !== MAP_SIZE) return;
    const container = document.querySelector('.map-container');
    const maxSize = Math.min(container.clientWidth, container.clientHeight) - 20;
    CELL_SIZE = Math.floor(maxSize / MAP_SIZE);
    if (CELL_SIZE < 2) CELL_SIZE = 2;
    canvas.width = MAP_SIZE * CELL_SIZE;
    canvas.height = MAP_SIZE * CELL_SIZE;

    const imgData = ctx.createImageData(canvas.width, canvas.height);
    const data = imgData.data;
    for (let r = 0; r < MAP_SIZE; r++) {
        for (let c = 0; c < MAP_SIZE; c++) {
            const [R, G, B] = mapData[r][c];
            for (let dy = 0; dy < CELL_SIZE; dy++) {
                for (let dx = 0; dx < CELL_SIZE; dx++) {
                    const idx = ((r * CELL_SIZE + dy) * canvas.width + (c * CELL_SIZE + dx)) * 4;
                    data[idx] = R;
                    data[idx+1] = G;
                    data[idx+2] = B;
                    data[idx+3] = 255;
                }
            }
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

function checkGameOver(state) {
    const extinct = !state.humans || state.humans.length === 0 || state.game_over === true;
    const banner = document.getElementById('game-over-banner');
    if (extinct && !gameOver) {
        gameOver = true;
        if (banner) banner.style.display = 'flex';
    } else if (!extinct && gameOver) {
        gameOver = false;
        if (banner) banner.style.display = 'none';
    }
}

function sendCmd(cmd) {
    fetch(`/api/command/${cmd}`, { method: 'POST' }).catch(console.error);
}

// Event listeners
window.addEventListener('load', () => {
    initWebSocket();
    // Set up controls if buttons exist
    const btnPause = document.getElementById('btn-pause');
    const btnReset = document.getElementById('btn-reset');
    if (btnPause) btnPause.addEventListener('click', () => sendCmd('pause'));
    if (btnReset) btnReset.addEventListener('click', () => sendCmd('reset'));
    // Also start button if exists
    const btnStart = document.getElementById('btn-start');
    if (btnStart) btnStart.addEventListener('click', () => sendCmd('start'));
});

window.addEventListener('resize', () => {
    if (lastState && lastState.map) drawMap(lastState.map);
});