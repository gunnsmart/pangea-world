// main_responsive.js — Responsive UI with Canvas Scaling & Touch Support
// แก้ไขและเพิ่มฟังก์ชันให้สมบูรณ์

const canvas = document.getElementById('map-canvas');
const ctx    = canvas.getContext('2d');
const SIZE   = 100;

let CELL = 6;    // Default cell size (will be adjusted based on screen size)
let lastState = null;
let lastDay = -1;
let mapImageData = null;

// ── Real-time Interpolation ──────────────────────────────────────────────────
let lastUpdateTime = Date.now();
let entityInterpolationData = {}; // Store previous positions for interpolation

// ── Speech Bubbles ───────────────────────────────────────────────────────────
let activeSpeechBubbles = []; // Array of {speaker, text, startTime, duration}

// ── Game State ───────────────────────────────────────────────────────────────
let gameOver = false;   // ใช้เพื่อป้องกันการอัปเดตซ้ำเมื่อจบเกมแล้ว

// ── Detect screen size and adjust CELL size ──────────────────────────────────
function updateCanvasSize() {
  const container = document.getElementById('map-container');
  if (!container) return;

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const maxSize = Math.min(containerWidth, containerHeight) - 16;

  // Calculate cell size to fit the container
  CELL = Math.floor(maxSize / SIZE);
  CELL = Math.max(2, Math.min(CELL, 12)); // Clamp between 2 and 12

  const newWidth = SIZE * CELL;
  const newHeight = SIZE * CELL;

  canvas.width = newWidth;
  canvas.height = newHeight;
}

// ── Fetch state ทุก 3 วิ ──────────────────────────────────────────────────
async function fetchState() {
  try {
    const res  = await fetch(`/api/state/delta?last_day=${lastDay}`);
    const resp = await res.json();

    if (resp.type === 'full') {
      lastState = resp.data;
      lastDay   = resp.data.day;
      render(lastState);
    } else {
      if (lastState) {
        // Partial update: merge data
        Object.assign(lastState, resp.data);
        // อัปเดต lastDay ให้ตรงกับ state ปัจจุบัน (เผื่อ day มีการเปลี่ยนแปลง)
        if (resp.data.day !== undefined) lastDay = resp.data.day;
        renderPartial(resp.data);
      } else {
        const full = await fetch('/api/state');
        lastState  = await full.json();
        lastDay    = lastState.day;
        render(lastState);
      }
    }
    document.getElementById('status-dot').classList.add('running');
  } catch(e) {
    console.error('fetch error', e);
    document.getElementById('status-dot').classList.remove('running');
    // แสดงข้อความแจ้งเตือนใน log ถ้าต้องการ
    addSystemLog('⚠️ ไม่สามารถติดต่อเซิร์ฟเวอร์ได้');
  }
}

// Partial render — ไม่ redraw map ใหม่ทั้งหมด (แต่จะอัปเดตส่วนที่จำเป็น)
function renderPartial(data) {
  updateHeader(data);
  if (data.humans)  updateHumans(data.humans, lastState.relationship);
  if (data.fauna)   updateStats(lastState);
  if (data.history) updateLog(data.history);
  if (data.atmosphere) updateEco(lastState);
  if (data.disasters) updateDisasters(lastState);
  if (data.fire_spots) updateFireInfo(lastState);
  if (data.dialogues) updateDialoguePanel(lastState);
  
  // วาด entities (humans + animals) บน canvas ที่มี map อยู่แล้ว
  if (lastState && lastState.map) {
    drawEntitiesOnly(lastState.humans, lastState.animals || []);
  }
}

// วาดเฉพาะ humans+animals บน canvas ที่มี map อยู่แล้ว
function drawEntitiesOnly(humans, animals) {
  if (!mapImageData) return;
  ctx.putImageData(mapImageData, 0, 0);
  drawEntities(humans, animals);
}

function drawEntities(humans, animals) {
  // วาดสัตว์ (ถ้ามี)
  if (animals && Array.isArray(animals)) {
    for (const a of animals) {
      if (!a.pos) continue;
      // กำหนดสี
      ctx.fillStyle = a.sleeping ? '#646478' :
                     (a.type === 'Carnivore' ? '#ff3232' : '#ffdc32');
      // ดึงตำแหน่ง x,y ปลอดภัย
      let x, y;
      if (Array.isArray(a.pos) && a.pos.length >= 2) {
        x = a.pos[1];  // สมมติโครงสร้าง [y, x]
        y = a.pos[0];
      } else if (typeof a.pos === 'object' && a.pos.x !== undefined && a.pos.y !== undefined) {
        x = a.pos.x;
        y = a.pos.y;
      } else {
        continue;
      }
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
  
  // วาดมนุษย์ (ถ้ามี)
  if (humans && Array.isArray(humans)) {
    for (const h of humans) {
      if (!h.pos) continue;
      ctx.fillStyle = '#ffffff';
      let x, y, z = 0;
      if (Array.isArray(h.pos) && h.pos.length >= 3) {
        y = h.pos[0];
        x = h.pos[1];
        z = h.pos[2];
      } else if (typeof h.pos === 'object' && h.pos.x !== undefined && h.pos.y !== undefined) {
        x = h.pos.x;
        y = h.pos.y;
        z = h.pos.z || 0;
      } else {
        continue;
      }
      const heightOffset = z * 2; // Scale z-height for visual effect
      ctx.fillRect(x * CELL, y * CELL - heightOffset, CELL, CELL);
    }
  }
}

function sendCmd(cmd) {
  fetch(`/api/command/${cmd}`, { method: 'POST' })
    .then(() => fetchState())
    .catch(e => console.error('Command error:', e));
}

// ── Canvas Map ───────────────────────────────────────────────────────────
function drawMap(mapData) {
  if (!mapData || mapData.length === 0) return;

  const imgData = ctx.createImageData(SIZE * CELL, SIZE * CELL);
  const d = imgData.data;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const [R, G, B] = mapData[r][c];
      for (let dy = 0; dy < CELL; dy++) {
        for (let dx = 0; dx < CELL; dx++) {
          const idx = ((r*CELL+dy)*SIZE*CELL + (c*CELL+dx)) * 4;
          d[idx]=R; d[idx+1]=G; d[idx+2]=B; d[idx+3]=255;
        }
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  mapImageData = ctx.getImageData(0, 0, SIZE*CELL, SIZE*CELL);
}

// ── Stats ────────────────────────────────────────────────────────────────
function updateStats(s) {
  setText('s-temp',     `${s.temp}°C`);
  setText('s-moisture', `${s.moisture}`);
  setText('s-weather',  s.weather);
  setText('s-biomass',  s.biomass);
  setText('s-rabbit',   s.fauna.rabbit);
  setText('s-deer',     s.fauna.deer);
  setText('s-tiger',    s.fauna.tiger);
  setText('s-eagle',    s.fauna.eagle);
  updateDisasters(s);
}

function updateDisasters(s) {
  const dsec = document.getElementById('disaster-section');
  if (s.disasters && s.disasters.length > 0) {
    dsec.innerHTML = s.disasters.map(d =>
      `<div class="alert">⚠️ ${d.label} — ${(d.severity*100).toFixed(0)}% | เหลือ ${d.days_left} วัน</div>`
    ).join('');
  } else {
    dsec.innerHTML = '';
  }
}

// ── Fire Info ───────────────────────────────────────────────────────────
function updateFireInfo(s) {
  const fireDiv = document.getElementById('fire-info');
  if (!fireDiv) return;
  if (s.fire_spots && s.fire_spots.length > 0) {
    fireDiv.innerHTML = s.fire_spots.map(f => 
      `<div style="margin-bottom:4px">🔥 ที่ (${f.x},${f.y}) | ความรุนแรง ${f.intensity}</div>`
    ).join('');
  } else {
    fireDiv.innerHTML = 'ไม่มีกองไฟ';
  }
}

// ── Dialogue Panel ──────────────────────────────────────────────────────
function updateDialoguePanel(s) {
  const panel = document.getElementById('dialogue-panel');
  if (!panel) return;
  if (s.dialogues && s.dialogues.length > 0) {
    // สมมติ dialogues เป็น array ของ object {speaker, text, time}
    panel.innerHTML = s.dialogues.map(d => `
      <div class="dialogue-entry">
        <strong>${d.speaker}</strong> <span style="color:#4a6080; font-size:10px">${d.time || ''}</span><br>
        ${d.text}
      </div>
    `).join('');
  } else {
    panel.innerHTML = '<div class="dialogue-entry">ยังไม่มีบทสนทนา</div>';
  }
}

// ── Chart ────────────────────────────────────────────────────────────────
function drawChart(popData) {
  const c  = document.getElementById('chart-canvas');
  if (!c) return;
  const container = c.parentElement;
  const W  = container.clientWidth || 280;
  const H  = 80;
  c.width  = W;
  c.height = H;
  const cx = c.getContext('2d');
  cx.clearRect(0, 0, W, H);
  if (!popData || popData.length < 2) return;
  const max = Math.max(...popData, 1);
  const pts = popData.map((v,i) => [i*W/(popData.length-1), H-(v/max)*H*0.9-4]);
  cx.strokeStyle='#00d4ff'; cx.lineWidth=1.5;
  cx.beginPath();
  pts.forEach(([x,y],i) => i===0 ? cx.moveTo(x,y) : cx.lineTo(x,y));
  cx.stroke();
}

// ── Humans ───────────────────────────────────────────────────────────────
function updateHumans(humans, rel) {
  const container = document.getElementById('humans-container');
  if (!container) return;
  container.innerHTML = humans.map(h => humanCard(h)).join('');
  document.getElementById('rel-stage').textContent = rel.stage;
  setBar('rel-bond',    'rel-bond-val',    rel.bond,    100, '#ff6b9d');
  setBar('rel-trust',   'rel-trust-val',   rel.trust,   100, '#00d4ff');
  setBar('rel-conflict','rel-conflict-val',rel.conflict,100, '#ff2d55');
}

function humanCard(h) {
  const d = h.drives;
  const driveRows = [
    ['🍖 หิว',  d.hunger,  '#ff6b2b'],
    ['💤 ง่วง',  d.tired,   '#9b59b6'],
    ['❄️ หนาว', d.cold,    '#5dade2'],
    ['😱 กลัว', d.fear,    '#ff2d55'],
    ['💕 โดดเดี่ยว',d.lonely,'#ff6b9d'],
  ].map(([label,val,color]) => driveRow(label,val,color)).join('');

  // language info ปลอดภัย
  let langHtml = '';
  if (h.language) {
    const topWords = h.language.top_words || [];
    langHtml = `
    <div style="margin-top:4px;font-size:10px;color:#4a6080">
      📚 คำศัพท์ ${h.language.vocab_size} คำ | พูดไป ${h.language.total_utterances} ครั้ง
    </div>
    ${topWords.map(w => `
      <span class="badge" style="font-size:9px" title="${w.meaning || ''}">${w.form || w.word || '?'}(${w.uses ?? 0})</span>
    `).join(' ')}`;
  }

  return `
  <div class="human-card">
    <div class="human-header">
      <span class="human-name">${h.sex==='M'?'♂️':'♀️'} ${h.name}</span>
      <span class="human-action">${h.action}</span>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">
      <span class="badge">❤️ ${h.health.toFixed(0)}</span>
      <span class="badge">👤 ${h.age.toFixed(1)}y</span>
      <span class="badge ${h.sleeping?'':'green'}">${h.sleeping?'😴 หลับ':'✅ ตื่น'}</span>
    </div>
    <div style="font-size:11px;color:#4a6080;margin-bottom:6px">${h.emotion}</div>
    ${driveRows}
    <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
      <span class="badge">🏹 ${h.skills.hunt.toFixed(0)}</span>
      <span class="badge">🔥 ${h.skills.fire.toFixed(0)}</span>
      <span class="badge">🍖 ${h.skills.cook.toFixed(0)}</span>
      <span class="badge">🔨 ${h.skills.craft.toFixed(0)}</span>
    </div>
    ${h.last_speech ? `
    <div style="margin-top:8px;background:#1a2a1a;border:1px solid #39ff14;border-radius:8px;padding:6px 10px;font-size:13px;color:#39ff14">
      💬 "${h.last_speech}"
    </div>` : ''}
    ${langHtml}
  </div>`;
}

function driveRow(label, val, color) {
  return `<div class="drive-row">
    <div class="drive-label">${label}</div>
    <div class="drive-bar-wrap"><div class="drive-bar" style="width:${Math.min(100,val)}%;background:${color}"></div></div>
    <div class="drive-val">${val.toFixed(0)}</div>
  </div>`;
}

// ── Eco ───────────────────────────────────────────────────────────────────
function updateEco(s) {
  const atmo = s.atmosphere;
  const grid = document.getElementById('atmo-grid');
  if (atmo && grid) {
    grid.innerHTML = Object.entries(atmo).map(([k,v]) =>
      `<div class="metric"><div class="metric-label">${k}</div><div class="metric-value">${v}</div></div>`
    ).join('');
  }
  updateFireInfo(s);
}

// ── Log ───────────────────────────────────────────────────────────────────
function updateLog(history) {
  const el = document.getElementById('log-list');
  if (!el) return;
  // สมมติ history เป็น array ของ string หรือ object
  const items = history.map(e => {
    if (typeof e === 'string') return `<div class="log-entry">${e}</div>`;
    // ถ้าเป็น object อาจมี time และ message
    if (e.time && e.message) return `<div class="log-entry"><span class="log-time">${e.time}</span><span class="log-msg">${e.message}</span></div>`;
    return `<div class="log-entry">${JSON.stringify(e)}</div>`;
  }).reverse().slice(0,50);
  el.innerHTML = items.join('');
}

// เพิ่ม log ระบบ (สำหรับ error)
function addSystemLog(msg) {
  const el = document.getElementById('log-list');
  if (el) {
    const entry = `<div class="log-entry" style="color:#ff6b2b">⚠️ ${msg}</div>`;
    el.innerHTML = entry + el.innerHTML;
  }
}

// ── Header ────────────────────────────────────────────────────────────────
function updateHeader(s) {
  setText('clock',       `${s.date} ${s.time}`);
  setText('phase',       s.phase);
  setText('day-badge',   `Day ${s.day}`);
  setText('season-badge',s.season);

  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  if (btnStart && btnPause) {
    btnStart.classList.toggle('active', s.running);
    btnPause.classList.toggle('active', !s.running);
  }
}

// ── Game Over Logic ───────────────────────────────────────────────────────
function checkGameOver(state) {
  if (!state || !state.humans) return;
  const extinct = state.humans.length === 0;
  if (extinct && !gameOver) {
    gameOver = true;
    const banner = document.getElementById('game-over-banner');
    if (banner) banner.classList.add('show');
  } else if (!extinct && gameOver) {
    gameOver = false;
    const banner = document.getElementById('game-over-banner');
    if (banner) banner.classList.remove('show');
  }
}

// ── Render Full State ────────────────────────────────────────────────────
function render(s) {
  drawMap(s.map);
  updateHeader(s);
  updateStats(s);
  if (s.humans) updateHumans(s.humans, s.relationship);
  updateEco(s);
  updateLog(s.history || []);
  updateDialoguePanel(s);
  drawChart(s.pop_history || []);
  checkGameOver(s);
}

// ── Tabs (support 5 tabs) ─────────────────────────────────────────────────
function switchTab(tabName) {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  const tabMap = ['stats', 'humans', 'eco', 'dialogue', 'log'];
  
  tabs.forEach((tab, idx) => {
    const t = tabMap[idx];
    if (t === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  contents.forEach(content => {
    if (content.id === `tab-${tabName}`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setBar(barId, valId, val, max, color) {
  const bar = document.getElementById(barId);
  const txt = document.getElementById(valId);
  if (bar) { bar.style.width=`${Math.min(100,(val/max)*100)}%`; bar.style.background=color; }
  if (txt) txt.textContent = val;
}

// ── Responsive Handler ────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  updateCanvasSize();
  if (lastState && lastState.map) {
    drawMap(lastState.map);
    drawEntities(lastState.humans, lastState.animals || []);
  }
});

// ── Prevent default touch behaviors ───────────────────────────────────────
document.addEventListener('touchmove', (e) => {
  if (e.target === canvas) {
    e.preventDefault();
  }
}, { passive: false });

// ── Initialize UI and event listeners ────────────────────────────────────
window.addEventListener('load', () => {
  updateCanvasSize();
  fetchState();
  
  // ตั้งค่า event listeners สำหรับ tabs
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab, idx) => {
    const tabNames = ['stats', 'humans', 'eco', 'dialogue', 'log'];
    tab.addEventListener('click', () => switchTab(tabNames[idx]));
  });
  
  // ตรวจสอบว่าปุ่มควบคุมมีอยู่หรือไม่ ถ้าไม่มีให้สร้าง (ป้องกันกรณี HTML ไม่มี)
  const controlsDiv = document.querySelector('.controls');
  if (controlsDiv && controlsDiv.children.length === 0) {
    controlsDiv.innerHTML = `
      <button id="btn-start" onclick="sendCmd('start')">▶️ เริ่ม</button>
      <button id="btn-pause" onclick="sendCmd('pause')">⏸️ หยุด</button>
      <button onclick="sendCmd('reset')">⟳ รีเซ็ต</button>
    `;
  }
});

setInterval(fetchState, 3000); // ทุก 3 วินาที
