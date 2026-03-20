// main.js — WebSocket client + Canvas renderer

const canvas  = document.getElementById('map-canvas');
const ctx     = canvas.getContext('2d');
const CELL    = 10;   // px per cell (50x50 map → 500x500 canvas)
const SIZE    = 50;

let ws        = null;
let lastState = null;
let popHistory= [];

// ── WebSocket ────────────────────────────────────────────────────────────────
function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.onopen    = () => { console.log('WS connected'); updateDot(true); };
  ws.onclose   = () => { updateDot(false); setTimeout(connect, 3000); };
  ws.onerror   = (e) => console.error('WS error', e);
  ws.onmessage = (e) => {
    try {
      const state = JSON.parse(e.data);
      lastState = state;
      render(state);
    } catch(err) { console.error('parse error', err); }
  };
}

function sendCmd(cmd) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ cmd }));
  }
}

function updateDot(running) {
  const dot = document.getElementById('status-dot');
  dot.classList.toggle('running', running);
}

// ── Canvas Map ────────────────────────────────────────────────────────────────
function drawMap(mapData) {
  if (!mapData || mapData.length === 0) return;
  const imgData = ctx.createImageData(SIZE * CELL, SIZE * CELL);
  const d = imgData.data;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const [R, G, B] = mapData[r][c];
      // fill CELL×CELL block
      for (let dy = 0; dy < CELL; dy++) {
        for (let dx = 0; dx < CELL; dx++) {
          const idx = ((r * CELL + dy) * SIZE * CELL + (c * CELL + dx)) * 4;
          d[idx]   = R;
          d[idx+1] = G;
          d[idx+2] = B;
          d[idx+3] = 255;
        }
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // grid overlay (subtle)
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= SIZE; i++) {
    ctx.beginPath(); ctx.moveTo(i*CELL, 0); ctx.lineTo(i*CELL, SIZE*CELL); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i*CELL); ctx.lineTo(SIZE*CELL, i*CELL); ctx.stroke();
  }
}

// ── Stats Panel ───────────────────────────────────────────────────────────────
function updateStats(s) {
  setText('s-temp',     `${s.temp}°C`);
  setText('s-moisture', `${s.moisture}`);
  setText('s-weather',  s.weather);
  setText('s-biomass',  s.biomass);
  setText('s-rabbit',   s.fauna.rabbit);
  setText('s-deer',     s.fauna.deer);
  setText('s-tiger',    s.fauna.tiger);
  setText('s-eagle',    s.fauna.eagle);

  // disasters
  const dsec = document.getElementById('disaster-section');
  if (s.disasters && s.disasters.length > 0) {
    dsec.innerHTML = s.disasters.map(d =>
      `<div class="alert">⚠️ ${d.label} — ${(d.severity*100).toFixed(0)}% | เหลือ ${d.days_left} วัน</div>`
    ).join('');
  } else {
    dsec.innerHTML = '';
  }
}

// ── Mini Chart ────────────────────────────────────────────────────────────────
function drawChart(popData) {
  const c   = document.getElementById('chart-canvas');
  const cx  = c.getContext('2d');
  const W   = c.offsetWidth || 280;
  const H   = c.height = 80;
  c.width   = W;
  cx.clearRect(0, 0, W, H);
  if (!popData || popData.length < 2) return;

  const max = Math.max(...popData, 1);
  const pts = popData.map((v, i) => [i * W / (popData.length-1), H - (v/max)*H*0.9 - 4]);

  cx.strokeStyle = '#00d4ff';
  cx.lineWidth   = 1.5;
  cx.shadowColor = '#00d4ff';
  cx.shadowBlur  = 6;
  cx.beginPath();
  pts.forEach(([x,y],i) => i===0 ? cx.moveTo(x,y) : cx.lineTo(x,y));
  cx.stroke();
  cx.shadowBlur = 0;

  // fill
  cx.fillStyle = 'rgba(0,212,255,0.08)';
  cx.beginPath();
  cx.moveTo(pts[0][0], H);
  pts.forEach(([x,y]) => cx.lineTo(x,y));
  cx.lineTo(pts[pts.length-1][0], H);
  cx.closePath();
  cx.fill();
}

// ── Humans Panel ──────────────────────────────────────────────────────────────
function updateHumans(humans, rel) {
  const container = document.getElementById('humans-container');
  container.innerHTML = humans.map(h => humanCard(h)).join('');

  // relationship
  document.getElementById('rel-stage').textContent = rel.stage;
  setBar('rel-bond',    'rel-bond-val',    rel.bond,    100, '#ff6b9d');
  setBar('rel-trust',   'rel-trust-val',   rel.trust,   100, '#00d4ff');
  setBar('rel-conflict','rel-conflict-val',rel.conflict,100, '#ff2d55');
}

function humanCard(h) {
  const drives = h.drives;
  const driveRows = [
    ['🍖 หิว',   drives.hunger,  '#ff6b2b'],
    ['💧 กระหาย',0,             '#00d4ff'],
    ['💤 ง่วง',  drives.tired,   '#9b59b6'],
    ['❄️ หนาว',  drives.cold,    '#5dade2'],
    ['😱 กลัว',  drives.fear,    '#ff2d55'],
    ['💕 โดดเดี่ยว',drives.lonely,'#ff6b9d'],
  ].map(([label,val,color]) => driveRow(label,val,color)).join('');

  const knownBadges = h.knows.map(k => `<span class="badge green">${k}</span>`).join(' ');
  const topActs = h.top_actions.map(([a,w]) =>
    `<div class="skill-row"><span class="skill-name">${a}</span><span class="skill-val">${w.toFixed(2)}</span></div>`
  ).join('');
  const pregnant = h.sex==='F' && h.pregnant
    ? `<span class="badge green">🤰 วัน ${h.days_preg}/280</span>` : '';

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
      ${pregnant}
    </div>
    <div style="font-size:11px;color:#4a6080;margin-bottom:6px">${h.emotion}</div>
    ${driveRows}
    <div style="margin-top:6px;font-size:10px;color:#4a6080">Skills</div>
    <div style="display:flex;gap:4px;margin:4px 0;flex-wrap:wrap">
      <span class="badge">🏹 ${h.skills.hunt.toFixed(0)}</span>
      <span class="badge">🔥 ${h.skills.fire.toFixed(0)}</span>
      <span class="badge">🍖 ${h.skills.cook.toFixed(0)}</span>
      <span class="badge">🔨 ${h.skills.craft.toFixed(0)}</span>
    </div>
    ${knownBadges ? `<div style="margin-top:4px">${knownBadges}</div>` : ''}
    ${visItems ? `<div style="margin-top:6px"><span style="font-size:10px;color:#4a6080">👁 เห็น: </span>${visItems}</div>` : ''}
    ${soundItems ? `<div style="margin-top:4px">${soundItems}</div>` : ''}
    ${factBadges ? `<div style="margin-top:4px"><span style="font-size:10px;color:#4a6080">📚 รู้: </span>${factBadges}</div>` : ''}
    <details style="margin-top:6px">
      <summary style="font-size:10px;color:#4a6080;cursor:pointer">🧠 ความทรงจำ (${h.memory_size||0})</summary>
      <div style="margin-top:4px">${memNarr || '<span style="color:#4a6080;font-size:10px">ยังไม่มีความทรงจำ</span>'}</div>
    </details>
    <details style="margin-top:4px">
      <summary style="font-size:10px;color:#4a6080;cursor:pointer">📈 Top learned actions</summary>
      <div style="margin-top:4px">${topActs}</div>
    </details>
  </div>\`;
}

function driveRow(label, val, color) {
  const pct = Math.min(100, val);
  return `<div class="drive-row">
    <div class="drive-label">${label}</div>
    <div class="drive-bar-wrap"><div class="drive-bar" style="width:${pct}%;background:${color}"></div></div>
    <div class="drive-val">${val.toFixed(0)}</div>
  </div>`;
}

// ── Eco Panel ─────────────────────────────────────────────────────────────────
function updateEco(s) {
  const atmo = s.atmosphere;
  const grid = document.getElementById('atmo-grid');
  if (atmo) {
    grid.innerHTML = Object.entries(atmo).map(([k,v]) =>
      `<div class="metric"><div class="metric-label">${k}</div><div class="metric-value">${v}</div></div>`
    ).join('');
  }

  const fireEl = document.getElementById('fire-info');
  const fires  = s.animals ? [] : [];
  fireEl.textContent = 'ดูใน map — 🟠 = กองไฟ';
}

// ── Log Panel ─────────────────────────────────────────────────────────────────
function updateLog(history) {
  const el = document.getElementById('log-list');
  el.innerHTML = [...history].reverse().slice(0,50).map(e =>
    `<div class="log-entry">${e}</div>`
  ).join('');
}

// ── Header ────────────────────────────────────────────────────────────────────
function updateHeader(s) {
  setText('clock',      `${s.date} ${s.time}`);
  setText('phase',      s.phase);
  setText('day-badge',  `Day ${s.day}`);
  setText('season-badge',s.season);
  document.getElementById('status-dot').classList.toggle('running', s.running);

  // game over
  const banner = document.getElementById('game-over-banner');
  banner.classList.toggle('show', s.game_over);
}

// ── Main render ───────────────────────────────────────────────────────────────
function render(s) {
  drawMap(s.map);
  updateHeader(s);
  updateStats(s);
  updateHumans(s.humans, s.relationship);
  updateEco(s);
  updateLog(s.history);
  drawChart(s.pop_history);
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t,i) => {
    const names = ['stats','humans','eco','log'];
    t.classList.toggle('active', names[i] === name);
  });
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('active', c.id === `tab-${name}`);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setBar(barId, valId, val, max, color) {
  const bar = document.getElementById(barId);
  const txt = document.getElementById(valId);
  if (bar) bar.style.width = `${Math.min(100, (val/max)*100)}%`;
  if (bar) bar.style.background = color;
  if (txt) txt.textContent = val;
}

// ── Start ─────────────────────────────────────────────────────────────────────
connect();
