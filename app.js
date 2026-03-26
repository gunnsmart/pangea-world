// app.js - 8-bit Isometric Pixel Art Edition
// สำหรับแสดงผลโลก Pangea ในรูปแบบ Isometric (45 องศา) พร้อมตัวละคร Pixel Art

let ws = null;
let canvas = document.getElementById('map-canvas');
let ctx = canvas.getContext('2d');
let lastState = null;
let gameOver = false;

// Configuration
const MAP_SIZE = 100;
let TILE_WIDTH = 32;
let TILE_HEIGHT = 16;
let zoom = 1.0;
let targetZoom = 1.0;
let cameraPos = { x: 50, y: 50 };
let targetCameraPos = { x: 50, y: 50 };
let cameraFocus = 'world';
let currentLang = 'th';

const translations = {
    en: {
        health: 'Health', hunger: 'Hunger', thirst: 'Thirst', tired: 'Energy',
        fear: 'Fear', action: 'Action', emotion: 'Emotion',
        actions: { sleep: 'Sleeping', eat_raw: 'Eating', eat_cooked: 'Cooking', drink: 'Drinking',
                   seek_food: 'Seeking Food', seek_water: 'Seeking Water', explore: 'Exploring',
                   rest: 'Resting', hunt: 'Hunting', mate: 'Mating', flee: 'Fleeing',
                   start_fire: 'Starting Fire', craft: 'Crafting', gather: 'Gathering',
                   comfort: 'Comforting', build_shelter: 'Building Shelter', rub: 'Rubbing',
                   share_food: 'Sharing Food', teach: 'Teaching', toilet: 'Toilet' }
    },
    th: {
        health: 'สุขภาพ', hunger: 'ความหิว', thirst: 'ความกระหาย', tired: 'พลังงาน',
        fear: 'ความกลัว', action: 'การกระทำ', emotion: 'อารมณ์',
        actions: { sleep: 'กำลังนอน', eat_raw: 'กินดิบ', eat_cooked: 'กินสุก', drink: 'ดื่มน้ำ',
                   seek_food: 'หาอาหาร', seek_water: 'หาแหล่งน้ำ', explore: 'สำรวจ',
                   rest: 'พักผ่อน', hunt: 'ล่าสัตว์', mate: 'สืบพันธุ์', flee: 'หนี',
                   start_fire: 'จุดไฟ', craft: 'ประดิษฐ์', gather: 'เก็บของ',
                   comfort: 'ปลอบโยน', build_shelter: 'สร้างที่พัก', rub: 'ขัดสีหิน',
                   share_food: 'แบ่งปันอาหาร', teach: 'สอนความรู้', toilet: 'ขับถ่าย' }
    }
};

// ---------- Pixel Art Sprites (Procedural Drawing) ----------
function drawHumanSprite(ctx, x, y, size, sex, name) {
    const s = size / 16; // base unit for pixel art
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y, size/2, size/4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (Shirt)
    ctx.fillStyle = (sex === 'M') ? '#4a6080' : '#ff6b9d';
    ctx.fillRect(x - 4*s, y - 10*s, 8*s, 6*s);
    
    // Head (Skin)
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(x - 3*s, y - 16*s, 6*s, 6*s);
    
    // Hair
    ctx.fillStyle = (sex === 'M') ? '#4b2e1e' : '#f9d71c';
    if (sex === 'M') {
        ctx.fillRect(x - 3*s, y - 17*s, 6*s, 2*s);
    } else {
        ctx.fillRect(x - 4*s, y - 17*s, 8*s, 3*s);
        ctx.fillRect(x - 4*s, y - 14*s, 1*s, 4*s);
        ctx.fillRect(x + 3*s, y - 14*s, 1*s, 4*s);
    }
    
    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 1.5*s, y - 13*s, 1*s, 1*s);
    ctx.fillRect(x + 0.5*s, y - 13*s, 1*s, 1*s);
    
    // Name Tag
    ctx.font = `bold ${10}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 2;
    ctx.fillText(name, x, y - 20*s);
    ctx.shadowBlur = 0;
}

function drawTreeSprite(ctx, x, y, size) {
    const s = size / 16;
    // Trunk
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x - 2*s, y - 4*s, 4*s, 6*s);
    // Leaves (Layers)
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.moveTo(x, y - 16*s);
    ctx.lineTo(x - 8*s, y - 4*s);
    ctx.lineTo(x + 8*s, y - 4*s);
    ctx.fill();
    
    ctx.fillStyle = '#388e3c';
    ctx.beginPath();
    ctx.moveTo(x, y - 22*s);
    ctx.lineTo(x - 6*s, y - 10*s);
    ctx.lineTo(x + 6*s, y - 10*s);
    ctx.fill();
}

function drawFireSprite(ctx, x, y, size, frame) {
    const s = size / 16;
    // Wood
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(x - 4*s, y - 1*s, 8*s, 2*s);
    // Fire (Animated)
    const offset = Math.sin(frame * 0.2) * 2;
    ctx.fillStyle = '#ffab00';
    ctx.beginPath();
    ctx.moveTo(x, y - (10+offset)*s);
    ctx.lineTo(x - 5*s, y - 2*s);
    ctx.lineTo(x + 5*s, y - 2*s);
    ctx.fill();
}

function drawShelterSprite(ctx, x, y, size) {
    const s = size / 16;
    ctx.fillStyle = '#795548';
    ctx.beginPath();
    ctx.moveTo(x, y - 12*s);
    ctx.lineTo(x - 10*s, y + 2*s);
    ctx.lineTo(x + 10*s, y + 2*s);
    ctx.closePath();
    ctx.fill();
    // Detail lines
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// ---------- Isometric Math ----------
function cartesianToIso(x, y) {
    return {
        x: (x - y) * (TILE_WIDTH / 2),
        y: (x + y) * (TILE_HEIGHT / 2)
    };
}

// ---------- WebSocket ----------
function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'full' || !data.type) {
                lastState = data.type === 'full' ? data.data : data;
                renderFull(lastState);
            } else if (data.type === 'log') {
                addLog(data.data);
            }
        } catch (e) { console.error('WS parse error', e); }
    };
    ws.onclose = () => setTimeout(initWebSocket, 3000);
}

// ---------- UI Rendering ----------
function getBarColor(val, inverse = false) {
    if (inverse) {
        if (val > 70) return '#ff3b30';
        if (val > 40) return '#ffcc00';
        return '#4cd964';
    }
    if (val > 70) return '#4cd964';
    if (val > 40) return '#ffcc00';
    return '#ff3b30';
}

function setBarWidth(id, val) {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.min(100, Math.max(0, val))}%`;
}

function renderFull(state) {
    if (!state) return;

    // Header Stats
    document.getElementById('day-display').innerText = `Day ${state.day}`;
    document.getElementById('temp-display').innerText = `${state.temp}°C`;
    document.getElementById('weather-display').innerText = state.weather;
    
    // Stats Tab
    document.getElementById('s-temp').innerText = state.temp;
    document.getElementById('s-moisture').innerText = state.moisture;
    document.getElementById('s-biomass').innerText = state.biomass.toFixed(1);
    document.getElementById('s-season').innerText = state.season || 'Spring';

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

    // Humans
    renderHumans(state.humans);

    // Camera
    if (cameraFocus !== 'world') {
        const target = state.humans.find(h => h.name === cameraFocus);
        if (target) {
            targetCameraPos = { 
                x: Array.isArray(target.pos) ? target.pos[1] : target.pos.x, 
                y: Array.isArray(target.pos) ? target.pos[0] : target.pos.y 
            };
            targetZoom = 2.0;
        }
    } else {
        targetCameraPos = { x: 50, y: 50 };
        targetZoom = 1.0;
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
        const d = h.drives || {};
        const actionKey = h.action?.toLowerCase().replace(/ /g, '_');
        const actionText = t.actions[actionKey] || h.action;
        
        // Mock hormone values based on drives for visual effect like the screenshot
        const cortisol = Math.round(d.fear * 0.8);
        const oxytocin = Math.round((100 - d.lonely) * 0.6);
        const atp = Math.round(100 - d.tired);

        return `
            <div class="human-card">
                <div class="human-header">
                    <span class="human-name">${h.name.toUpperCase()}</span>
                    <span class="human-action">${actionText.toUpperCase()}</span>
                </div>
                <div style="font-size:10px; color:#888; margin-bottom:10px;">${h.sex === 'M' ? 'ชาย' : 'หญิง'} — ${h.age.toFixed(0)}Y</div>
                
                <div class="drive-row"><span>${t.hunger}</span><div class="bar"><div class="bar-fill" style="width:${d.hunger}%; background:#e67e22"></div></div><span style="width:20px; text-align:right">${Math.round(d.hunger)}</span></div>
                <div class="drive-row"><span>${t.thirst}</span><div class="bar"><div class="bar-fill" style="width:${d.thirst || 0}%; background:#3498db"></div></div><span style="width:20px; text-align:right">${Math.round(d.thirst || 0)}</span></div>
                <div class="drive-row"><span>${t.tired}</span><div class="bar"><div class="bar-fill" style="width:${atp}%; background:#f1c40f"></div></div><span style="width:20px; text-align:right">${atp*5}</span></div>
                <div class="drive-row"><span>${t.health}</span><div class="bar"><div class="bar-fill" style="width:${h.health}%; background:#e74c3c"></div></div><span style="width:20px; text-align:right">${Math.round(h.health)}</span></div>
                
                <div class="human-stats-grid" style="margin-top:15px; text-align:center">
                    <div class="human-stat" style="flex-direction:column">
                        <span style="color:#e74c3c; font-size:9px">CORTISOL</span>
                        <strong style="font-size:14px">${cortisol}</strong>
                    </div>
                    <div class="human-stat" style="flex-direction:column">
                        <span style="color:#2ecc71; font-size:9px">OXYTOCIN</span>
                        <strong style="font-size:14px">${oxytocin}</strong>
                    </div>
                    <div class="human-stat" style="flex-direction:column">
                        <span style="color:#f1c40f; font-size:9px">ATP</span>
                        <strong style="font-size:14px">${atp}</strong>
                    </div>
                </div>

                <div style="font-size:10px; color:#888; margin-top:10px; border-top:1px solid #1e2d3d; padding-top:8px;">
                    🎒 กระเป๋า: ${h.inventory.join(', ') || 'ว่างเปล่า'}
                </div>
                ${h.last_speech ? `<div class="speech-bubble">💬 "${h.last_speech}"</div>` : ''}
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
    while (container.children.length > 50) container.removeChild(container.lastChild);
}

// ---------- Animation Loop ----------
let frame = 0;
function drawLoop() {
    frame++;
    if (!lastState || !lastState.map) {
        requestAnimationFrame(drawLoop);
        return;
    }

    // Smooth Camera
    cameraPos.x += (targetCameraPos.x - cameraPos.x) * 0.05;
    cameraPos.y += (targetCameraPos.y - cameraPos.y) * 0.05;
    zoom += (targetZoom - zoom) * 0.05;

    // Resize Canvas
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 3);
    ctx.scale(zoom, zoom);

    // Camera offset (Isometric)
    const camIso = cartesianToIso(cameraPos.x, cameraPos.y);
    ctx.translate(-camIso.x, -camIso.y);

    // Draw Map Tiles
    const map = lastState.map;
    const range = 25; // Render distance
    const startX = Math.max(0, Math.floor(cameraPos.x - range));
    const endX = Math.min(MAP_SIZE, Math.ceil(cameraPos.x + range));
    const startY = Math.max(0, Math.floor(cameraPos.y - range));
    const endY = Math.min(MAP_SIZE, Math.ceil(cameraPos.y + range));

    for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
            const [r, g, b] = map[y][x];
            const iso = cartesianToIso(x, y);
            
            // Draw Diamond Tile
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.beginPath();
            ctx.moveTo(iso.x, iso.y);
            ctx.lineTo(iso.x + TILE_WIDTH/2, iso.y + TILE_HEIGHT/2);
            ctx.lineTo(iso.x, iso.y + TILE_HEIGHT);
            ctx.lineTo(iso.x - TILE_WIDTH/2, iso.y + TILE_HEIGHT/2);
            ctx.closePath();
            ctx.fill();
            
            // Side shadows (pseudo-3D)
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.beginPath();
            ctx.moveTo(iso.x, iso.y + TILE_HEIGHT);
            ctx.lineTo(iso.x + TILE_WIDTH/2, iso.y + TILE_HEIGHT/2);
            ctx.lineTo(iso.x + TILE_WIDTH/2, iso.y + TILE_HEIGHT/2 + 4);
            ctx.lineTo(iso.x, iso.y + TILE_HEIGHT + 4);
            ctx.fill();

            // Draw Trees (If green enough)
            if (g > 100 && g > r && g > b && (x+y) % 7 === 0) {
                drawTreeSprite(ctx, iso.x, iso.y + TILE_HEIGHT/2, 16);
            }
        }
    }

    // Draw Fires
    if (lastState.fire_spots) {
        for (const f of lastState.fire_spots) {
            const iso = cartesianToIso(f.x, f.y);
            drawFireSprite(ctx, iso.x, iso.y + TILE_HEIGHT/2, 12, frame);
        }
    }

    // Draw Shelters
    if (lastState.shelters) {
        for (const s of lastState.shelters) {
            const iso = cartesianToIso(s.pos[1], s.pos[0]);
            drawShelterSprite(ctx, iso.x, iso.y + TILE_HEIGHT/2, 20);
        }
    }

    // Draw Humans
    if (lastState.humans) {
        for (const h of lastState.humans) {
            const hx = Array.isArray(h.pos) ? h.pos[1] : h.pos.x;
            const hy = Array.isArray(h.pos) ? h.pos[0] : h.pos.y;
            const iso = cartesianToIso(hx, hy);
            drawHumanSprite(ctx, iso.x, iso.y + TILE_HEIGHT/2, 16, h.sex, h.name);
            
            // Speech Bubble in Canvas
            if (h.last_speech) {
                ctx.font = '8px monospace';
                const tw = ctx.measureText(h.last_speech).width;
                ctx.fillStyle = 'rgba(0,0,0,0.8)';
                ctx.fillRect(iso.x - tw/2 - 2, iso.y - 30, tw + 4, 10);
                ctx.fillStyle = '#39ff14';
                ctx.fillText(h.last_speech, iso.x - tw/2, iso.y - 22);
            }
        }
    }

    ctx.restore();
    requestAnimationFrame(drawLoop);
}

// ---------- Controls ----------
function sendCmd(cmd) {
    fetch(`/api/command/${cmd}`, { method: 'POST' }).catch(e => console.error(e));
}

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
}

function setCameraFocus(focus) {
    cameraFocus = focus;
    document.querySelectorAll('.camera-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.camera-btn[data-focus="${focus}"]`).classList.add('active');
}

// ---------- Init ----------
window.addEventListener('load', () => {
    initWebSocket();
    document.querySelectorAll('.tab-btn').forEach(btn => btn.onclick = () => switchTab(btn.dataset.tab));
    document.querySelectorAll('.lang-btn').forEach(btn => btn.onclick = () => setLanguage(btn.dataset.lang));
    document.querySelectorAll('.camera-btn').forEach(btn => btn.onclick = () => setCameraFocus(btn.dataset.focus));
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.onclick = () => sendCmd('pause');
    
    requestAnimationFrame(drawLoop);
});
