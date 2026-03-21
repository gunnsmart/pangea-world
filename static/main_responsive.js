// main_responsive.js — Responsive UI with Canvas Scaling & Touch Support

const canvas = document.getElementById('map-canvas');
const ctx    = canvas.getContext('2d');
const SIZE   = 100;

let CELL = 6;    // Default cell size (will be adjusted based on screen size)
let lastState = null;
let lastDay = -1;
let mapImageData = null;

// ── Detect screen size and adjust CELL size ──────────────────────────────────
function updateCanvasSize() {
  const container = document.getElementById('map-container');
  if (!container) return;

  const containerWidth = container.offsetWidth;
  const containerHeight = container.offsetHeight;
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
        Object.assign(lastState, resp.data);
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
  }
}

// Update dialogue panel
function updateDialoguePanel(dialogueEvents) {
  const dialoguePanel = document.getElementById('dialogue-panel');
  if (!dialoguePanel) return;
  
  for (const event of dialogueEvents) {
    const entry = document.createElement('div');
    entry.className = 'dialogue-entry';
    entry.innerHTML = '<strong>' + event.speaker + ':</strong> ' + event.words;
    dialoguePanel.appendChild(entry);
  }
  
  while (dialoguePanel.children.length > 20) {
    dialoguePanel.removeChild(dialoguePanel.firstChild);
  }
  
  dialoguePanel.scrollTop = dialoguePanel.scrollHeight;
}

// Partial render — ไม่ redraw map (เร็วมาก)
function renderPartial(data) {
  updateHeader(data);
  if (data.humans)  updateHumans(data.humans, lastState.relationship);
  if (data.fauna)   updateStats(lastState);
  if (data.history) updateLog(data.history);
  if (data.dialogue) updateDialoguePanel(data.dialogue);
  if (lastState && lastState.map) {
    drawEntitiesOnly(data.humans, data.animals || []);
  }
}

// วาดเฉพาะ humans+animals บน canvas ที่มี map อยู่แล้ว
function drawEntitiesOnly(humans, animals) {
  if (!mapImageData) return;
  ctx.putImageData(mapImageData, 0, 0);
  drawEntities(humans, animals);
}

function drawEntities(humans, animals) {
  if (!humans || !animals) return;
  for (const a of animals) {
    ctx.fillStyle = a.sleeping ? '#646478' :
                   (a.type==='Carnivore' ? '#ff3232' : '#ffdc32');
    ctx.fillRect(a.pos[1]*CELL, a.pos[0]*CELL, CELL, CELL);
  }
  for (const h of humans) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(h.pos[1]*CELL, h.pos[0]*CELL, CELL, CELL);
  }
}

function sendCmd(cmd) {
  fetch(`/api/command/${cmd}`, { method: 'POST' })
    .then(() => fetchState());
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

  const dsec = document.getElementById('disaster-section');
  if (s.disasters && s.disasters.length > 0) {
    dsec.innerHTML = s.disasters.map(d =>
      `<div class="alert">⚠️ ${d.label} — ${(d.severity*100).toFixed(0)}% | เหลือ ${d.days_left} วัน</div>`
    ).join('');
  } else {
    dsec.innerHTML = '';
  }
}

// ── Chart ────────────────────────────────────────────────────────────────
function drawChart(popData) {
  const c  = document.getElementById('chart-canvas');
  const cx = c.getContext('2d');
  const W  = c.offsetWidth || 280;
  const H  = c.height = 80;
  c.width  = W;
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
    ${h.language ? `
    <div style="margin-top:4px;font-size:10px;color:#4a6080">
      📚 คำศัพท์ ${h.language.vocab_size} คำ | พูดไป ${h.language.total_utterances} ครั้ง
    </div>
    ${(h.language.top_words||[]).map(w =>
      `<span class="badge" style="font-size:9px" title="${w.meaning}">${w.form}(${w.uses})</span>`
    ).join(' ')}` : ''}
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
  if (atmo) {
    grid.innerHTML = Object.entries(atmo).map(([k,v]) =>
      `<div class="metric"><div class="metric-label">${k}</div><div class="metric-value">${v}</div></div>`
    ).join('');
  }
}

// ── Log ───────────────────────────────────────────────────────────────────
function updateLog(history) {
  const el = document.getElementById('log-list');
  el.innerHTML = [...history].reverse().slice(0,50).map(e =>
    `<div class="log-entry">${e}</div>`
  ).join('');
}

// ── Header ────────────────────────────────────────────────────────────────
function updateHeader(s) {
  setText('clock',       `${s.date} ${s.time}`);
  setText('phase',       s.phase);
  setText('day-badge',   `Day ${s.day}`);
  setText('season-badge',s.season);

  const btn = document.getElementById('btn-start');
  if (btn) btn.classList.toggle('active', s.running);
}

// ── Render ────────────────────────────────────────────────────────────────
function render(s) {
  drawMap(s.map);
  updateHeader(s);
  updateStats(s);
  if (s.humans) updateHumans(s.humans, s.relationship);
  updateEco(s);
  updateLog(s.history || []);
  drawChart(s.pop_history || []);
}

// ── Tabs ──────────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t,i) => {
    const names = ['stats','humans','eco','log'];
    t.classList.toggle('active', names[i]===name);
  });
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('active', c.id===`tab-${name}`);
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

// ── Initialize ────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  updateCanvasSize();
  fetchState();
});

setInterval(fetchState, 3000);
