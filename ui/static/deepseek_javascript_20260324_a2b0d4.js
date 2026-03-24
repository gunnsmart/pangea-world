// ui/static/app.js
// ตัวรับข้อมูล WebSocket และแสดงผลแผนที่ + สถิติ

let ws = null;
let canvas = document.getElementById('map-canvas');
let ctx = canvas.getContext('2d');
let CELL_SIZE = 6;
const MAP_SIZE = 100;
let lastState = null;
let gameOver = false;

// ตัวแปรสำหรับกล้องเคลื่อนที่ (smooth)
let cameraPos = { x: 50, y: 50 };
let targetCameraPos = { x: 50, y: 50 };
let zoom = 1.0;
let targetZoom = 1.0;
let cameraFocus = 'world'; // 'world', 'Adam', 'Eve'

// ภาษา
let currentLang = 'th';
const translations = {
    en: {
        health: 'Health', hunger: 'Hunger', tired: 'Tired', cold: 'Cold',
        fear: 'Fear', action: 'Action', emotion: 'Emotion',
        actions: { sleep: 'Sleeping', eat_raw: 'Eating', eat_cooked: 'Cooking', drink: 'Drinking',
                   seek_food: 'Seeking Food', seek_water: 'Seeking Water', explore: 'Exploring',
                   rest: 'Resting', hunt: 'Hunting', mate: 'Mating', flee: 'Fleeing',
                   start_fire: 'Starting Fire', craft: 'Crafting', gather: 'Gathering' }
    },
    th: {
        health: 'สุขภาพ', hunger: 'ความหิว', tired: 'ความเหนื่อย', cold: 'ความหนาว',
        fear: 'ความกลัว', action: 'การกระทำ', emotion: 'อารมณ์',
        actions: { sleep: 'กำลังนอน', eat_raw: 'กินดิบ', eat_cooked: 'กินสุก', drink: 'ดื่มน้ำ',
                   seek_food: 'หาอาหาร', seek_water: 'หาแหล่งน้ำ', explore: 'สำรวจ',
                   rest: 'พักผ่อน', hunt: 'ล่าสัตว์', mate: 'สืบพันธุ์', flee: 'หนี',
                   start_fire: 'จุดไฟ', craft: 'ประดิษฐ์', gather: 'เก็บของ' }
    }
};

// ---------- WebSocket ----------
function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    ws.onopen = () => console.log('WebSocket connected');
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'full') {
                lastState = data.data;
                renderFull(lastState);
            } else if (data.type === 'log') {
                addLog(data.data);
            } else if (data.type === 'dialogue') {
                addDialogue(data.data);
            } else {
                // ถ้าไม่มี type ให้ถือว่าเป็น snapshot โดยตรง
                lastState = data;
                renderFull(lastState);
            }
        } catch (e) {
            console.error('WS parse error', e);
        }
    };
    ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting in 3s');
        setTimeout(initWebSocket, 3000);
    };
}

// ---------- UI Updates ----------
function renderFull(state) {
    if (!state) return;

    // Header
    document.getElementById('day-display').innerText = `Day ${state.day}`;
    document.getElementById('temp-display').innerText = `${state.temp}°C`;
    document.getElementById('weather-display').innerText = state.weather;
    document.getElementById('s-temp').innerText = state.temp;
    document.getElementById('s-moisture').innerText = state.moisture;
    document.getElementById('s-biomass').innerText = state.biomass.toFixed(1);
    document.getElementById('s-season').innerText = state.season;

    // Stats
    if (state.fauna) {
        document.getElementById('s-rabbit').innerText = state.fauna.rabbit;
        document.getElementById('s-deer').innerText = state.fauna.deer;
        document.getElementById('s-tiger').innerText = state.fauna.tiger;
        document.getElementById('s-eagle').innerText = state.fauna.eagle;
    }

    // Relationship
    if (state.relationship) {
        const rel = state.relationship;
        document.getElementById('rel-stage').innerText = rel.stage;
        setBarWidth('rel-bond-bar', rel.bond);
        setBarWidth('rel-trust-bar', rel.trust);
        setBarWidth('rel-conflict-bar', rel.conflict);
        document.getElementById('rel-bond-val').innerText = rel.bond;
        document.getElementById('rel-trust-val').innerText = rel.trust;
        document.getElementById('rel-conflict-val').innerText = rel.conflict;
    }

    // Disasters
    const disasterDiv = document.getElementById('disaster-section');
    if (state.disasters && state.disasters.length) {
        disasterDiv.innerHTML = state.disasters.map(d => `
            <div class="stat-card" style="border-color:#ff2d55;">
                <div>⚠️ ${d.label} — ${(d.severity*100).toFixed(0)}% | เหลือ ${d.days_left} วัน</div>
            </div>
        `).join('');
    } else {
        disasterDiv.innerHTML = '';
    }

    // Fire spots
    const fireDiv = document.getElementById('fire-info');
    if (state.fire_spots && state.fire_spots.length) {
        fireDiv.innerHTML = state.fire_spots.map(f => `<div>🔥 ที่ (${f.x},${f.y}) | ความรุนแรง ${f.intensity}</div>`).join('');
    } else {
        fireDiv.innerHTML = 'ไม่มีกองไฟ';
    }

    // Atmosphere
    const atmoDiv = document.getElementById('atmo-grid');
    if (state.atmosphere) {
        atmoDiv.innerHTML = Object.entries(state.atmosphere).map(([k,v]) => `<div class="metric"><span>${k}</span><strong>${v}</strong></div>`).join('');
    }

    // Humans
    renderHumans(state.humans);

    // Logs (history)
    if (state.history && state.history.length) {
        const logContainer = document.getElementById('log-list');
        logContainer.innerHTML = '';
        state.history.slice().reverse().slice(0, 50).forEach(msg => addLog(msg));
    }

    // ตั้งค่าเป้าหมายกล้องตาม focus
    if (cameraFocus !== 'world') {
        const targetHuman = state.humans.find(h => h.name === cameraFocus);
        if (targetHuman) {
            let x = Array.isArray(targetHuman.pos) ? targetHuman.pos[1] : targetHuman.pos.x;
            let y = Array.isArray(targetHuman.pos) ? targetHuman.pos[0] : targetHuman.pos.y;
            targetCameraPos = { x, y };
            targetZoom = 3.0;
        } else {
            targetCameraPos = { x: 50, y: 50 };
            targetZoom = 1.0;
        }
    } else {
        targetCameraPos = { x: 50, y: 50 };
        targetZoom = 1.0;
    }

    // Game over
    const extinct = state.humans.length === 0 || state.game_over === true;
    const banner = document.getElementById('game-over-banner');
    if (extinct && !gameOver) {
        gameOver = true;
        banner.classList.add('show');
    } else if (!extinct && gameOver) {
        gameOver = false;
        banner.classList.remove('show');
    }
}

function renderHumans(humans) {
    const container = document.getElementById('humans-container');
    if (!humans || !humans.length) {
        container.innerHTML = '<div class="stat-card">ไม่มีมนุษย์</div>';
        return;
    }
    const t = translations[currentLang];
    container.innerHTML = humans.map(h => {
        const drives = h.drives || {};
        const skill = h.skills || {};
        const actionKey = h.action?.toLowerCase().replace(/ /g, '_');
        const actionText = t.actions[actionKey] || h.action;
        const langInfo = h.language || {};
        const topWords = langInfo.top_words || [];
        return `
            <div class="human-card">
                <div class="human-header">
                    <span class="human-name">${h.name} (${h.sex === 'M' ? '♂' : '♀'})</span>
                    <span class="human-action">${actionText}</span>
                </div>
                <div class="human-stats-grid">
                    <div class="human-stat"><span class="human-stat-label">❤️ ${t.health}:</span> <span>${(h.health || 0).toFixed(0)}</span></div>
                    <div class="human-stat"><span class="human-stat-label">👤 อายุ:</span> <span>${(h.age || 0).toFixed(1)}y</span></div>
                    <div class="human-stat"><span class="human-stat-label">🍖 ${t.hunger}:</span> <span>${(drives.hunger || 0).toFixed(0)}</span></div>
                    <div class="human-stat"><span class="human-stat-label">💤 ${t.tired}:</span> <span>${(drives.tired || 0).toFixed(0)}</span></div>
                    <div class="human-stat"><span class="human-stat-label">❄️ ${t.cold}:</span> <span>${(drives.cold || 0).toFixed(0)}</span></div>
                    <div class="human-stat"><span class="human-stat-label">😱 ${t.fear}:</span> <span>${(drives.fear || 0).toFixed(0)}</span></div>
                </div>
                <div class="human-stats-grid">
                    <div class="human-stat"><span class="human-stat-label">🏹 ล่า:</span> <span>${(skill.hunt || 0).toFixed(0)}</span></div>
                    <div class="human-stat"><span class="human-stat-label">🔥 ไฟ:</span> <span>${(skill.fire || 0).toFixed(0)}</span></div>
                    <div class="human-stat"><span class="human-stat-label">🍳 ปรุง:</span> <span>${(skill.cook || 0).toFixed(0)}</span></div>
                    <div class="human-stat"><span class="human-stat-label">🔨 ประดิษฐ์:</span> <span>${(skill.craft || 0).toFixed(0)}</span></div>
                </div>
                <div class="human-stat"><span class="human-stat-label">${t.emotion}:</span> <span>${h.emotion || '😐'}</span></div>
                ${h.last_speech ? `<div class="speech-bubble">💬 "${h.last_speech}"</div>` : ''}
                ${langInfo.vocab_size ? `<div style="margin-top:6px; font-size:10px; color:#4a6080;">📚 คำศัพท์ ${langInfo.vocab_size} คำ | พูด ${langInfo.total_utterances} ครั้ง</div>` : ''}
                ${topWords.length ? `<div style="margin-top:4px;">${topWords.map(w => `<span class="badge" style="background:#1e2d3d; padding:2px 6px; border-radius:12px; font-size:9px;">${w.form}(${w.uses})</span>`).join(' ')}</div>` : ''}
            </div>
        `;
    }).join('');
}

function addLog(msg) {
    const container = document.getElementById('log-list');
    if (!container) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = msg;
    container.prepend(entry);
    while (container.children.length > 100) container.removeChild(container.lastChild);
}

function addDialogue(utt) {
    const panel = document.getElementById('dialogue-panel');
    if (panel) {
        const div = document.createElement('div');
        div.className = 'dialogue-entry';
        div.innerHTML = `<strong>${utt.speaker}</strong> ${utt.words}`;
        panel.prepend(div);
        while (panel.children.length > 30) panel.removeChild(panel.lastChild);
    } else {
        addLog(`💬 ${utt.speaker}: ${utt.words}`);
    }
}

// ---------- Canvas Drawing with Smooth Camera ----------
function drawMapAnimated() {
    if (!lastState || !lastState.map) return;
    // Smooth interpolation
    cameraPos.x += (targetCameraPos.x - cameraPos.x) * 0.08;
    cameraPos.y += (targetCameraPos.y - cameraPos.y) * 0.08;
    zoom += (targetZoom - zoom) * 0.08;

    const container = document.querySelector('.canvas-wrapper');
    if (!container) return;
    const maxSize = Math.min(container.clientWidth, container.clientHeight) - 20;
    CELL_SIZE = Math.floor(maxSize / MAP_SIZE);
    if (CELL_SIZE < 2) CELL_SIZE = 2;
    canvas.width = MAP_SIZE * CELL_SIZE;
    canvas.height = MAP_SIZE * CELL_SIZE;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    // Translate to center, scale, then translate to camera position
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cameraPos.x * CELL_SIZE - CELL_SIZE/2, -cameraPos.y * CELL_SIZE - CELL_SIZE/2);

    // Draw map (RGB grid)
    const mapData = lastState.map;
    for (let r = 0; r < MAP_SIZE; r++) {
        for (let c = 0; c < MAP_SIZE; c++) {
            const [R, G, B] = mapData[r][c];
            ctx.fillStyle = `rgb(${R},${G},${B})`;
            ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }

    // Draw animals
    if (lastState.animals) {
        for (const a of lastState.animals) {
            if (!a.alive) continue;
            let x = Array.isArray(a.pos) ? a.pos[1] : a.pos.x;
            let y = Array.isArray(a.pos) ? a.pos[0] : a.pos.y;
            ctx.font = `${CELL_SIZE * 0.7}px "Segoe UI Emoji"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(a.icon || (a.type === 'Carnivore' ? '🐯' : '🦌'), x*CELL_SIZE + CELL_SIZE/2, y*CELL_SIZE + CELL_SIZE/2);
        }
    }

    // Draw humans
    if (lastState.humans) {
        for (const h of lastState.humans) {
            let x = Array.isArray(h.pos) ? h.pos[1] : h.pos.x;
            let y = Array.isArray(h.pos) ? h.pos[0] : h.pos.y;
            // วงกลมมนุษย์
            ctx.beginPath();
            ctx.arc(x*CELL_SIZE + CELL_SIZE/2, y*CELL_SIZE + CELL_SIZE/2, CELL_SIZE/2.2, 0, 2*Math.PI);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.fillStyle = '#111720';
            ctx.font = `bold ${CELL_SIZE * 0.5}px sans-serif`;
            ctx.fillText(h.name, x*CELL_SIZE + CELL_SIZE/2, y*CELL_SIZE + CELL_SIZE/2 - CELL_SIZE/3);
            // Speech bubble
            if (h.last_speech) {
                const words = h.last_speech;
                ctx.font = `${CELL_SIZE * 0.4}px monospace`;
                const metrics = ctx.measureText(words);
                const textWidth = metrics.width;
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(x*CELL_SIZE + CELL_SIZE/2 - textWidth/2 - 4, y*CELL_SIZE + CELL_SIZE/2 - CELL_SIZE/1.5, textWidth + 8, CELL_SIZE/1.8);
                ctx.fillStyle = '#39ff14';
                ctx.fillText(words, x*CELL_SIZE + CELL_SIZE/2, y*CELL_SIZE + CELL_SIZE/2 - CELL_SIZE/1.8);
            }
        }
    }

    ctx.restore();
    requestAnimationFrame(drawMapAnimated);
}

// ---------- Helper ----------
function setBarWidth(id, value) {
    const bar = document.getElementById(id);
    if (bar) bar.style.width = `${Math.min(100, value)}%`;
}

function sendCmd(cmd) {
    fetch(`/api/command/${cmd}`, { method: 'POST' }).catch(e => console.error(e));
}

// ---------- Event Listeners ----------
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

function setLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.lang-btn[data-lang="${lang}"]`).classList.add('active');
    if (lastState) renderHumans(lastState.humans);
}

function setCameraFocus(focus) {
    cameraFocus = focus;
    document.querySelectorAll('.camera-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.camera-btn[data-focus="${focus}"]`).classList.add('active');
    if (focus === 'world') {
        targetCameraPos = { x: 50, y: 50 };
        targetZoom = 1.0;
    } else if (lastState) {
        const targetHuman = lastState.humans.find(h => h.name === focus);
        if (targetHuman) {
            let x = Array.isArray(targetHuman.pos) ? targetHuman.pos[1] : targetHuman.pos.x;
            let y = Array.isArray(targetHuman.pos) ? targetHuman.pos[0] : targetHuman.pos.y;
            targetCameraPos = { x, y };
            targetZoom = 3.0;
        } else {
            targetCameraPos = { x: 50, y: 50 };
            targetZoom = 1.0;
        }
    }
}

// ---------- Initialization ----------
window.addEventListener('load', () => {
    initWebSocket();

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    // Language
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });
    // Camera focus
    document.querySelectorAll('.camera-btn').forEach(btn => {
        btn.addEventListener('click', () => setCameraFocus(btn.dataset.focus));
    });
    // Pause button
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.addEventListener('click', () => sendCmd('pause'));

    // Start animation loop
    requestAnimationFrame(drawMapAnimated);
});