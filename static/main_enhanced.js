// Enhanced main.js with real-time interpolation and speech bubbles

const canvas = document.getElementById('map-canvas');
const ctx    = canvas.getContext('2d');
const SIZE   = 100;

let CELL = 6;
let lastState = null;
let lastDay = -1;
let mapImageData = null;

// Real-time Interpolation
let lastUpdateTime = Date.now();
let entityInterpolationData = {};

// Speech Bubbles
let activeSpeechBubbles = [];

// Detect screen size and adjust CELL size
function updateCanvasSize() {
  const container = document.getElementById('map-container');
  if (!container) return;

  const containerWidth = container.offsetWidth;
  const containerHeight = container.offsetHeight;
  const maxSize = Math.min(containerWidth, containerHeight) - 16;

  CELL = Math.floor(maxSize / SIZE);
  CELL = Math.max(2, Math.min(CELL, 12));

  const newWidth = SIZE * CELL;
  const newHeight = SIZE * CELL;

  canvas.width = newWidth;
  canvas.height = newHeight;
}

// Fetch state
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

// Update dialogue history panel
function updateDialogue(dialogueEvents) {
  const dialoguePanel = document.getElementById('dialogue-panel');
  if (!dialoguePanel) return;
  
  for (const event of dialogueEvents) {
    const entry = document.createElement('div');
    entry.className = 'dialogue-entry';
    entry.innerHTML = `<strong>${event.speaker}:</strong> ${event.words}`;
    dialoguePanel.appendChild(entry);
  }
  
  // Keep only last 20 entries
  while (dialoguePanel.children.length > 20) {
    dialoguePanel.removeChild(dialoguePanel.firstChild);
  }
  
  // Auto-scroll to bottom
  dialoguePanel.scrollTop = dialoguePanel.scrollHeight;
  
  // Add to active speech bubbles for canvas rendering
  for (const event of dialogueEvents) {
    activeSpeechBubbles.push({
      speaker: event.speaker,
      text: event.words,
      startTime: Date.now(),
      duration: 3000
    });
  }
}

// Partial render
function renderPartial(data) {
  updateHeader(data);
  if (data.humans)  updateHumans(data.humans, lastState.relationship);
  if (data.fauna)   updateStats(lastState);
  if (data.history) updateLog(data.history);
  if (data.dialogue) updateDialogue(data.dialogue);
  if (lastState && lastState.map) {
    drawEntitiesOnly(data.humans, data.animals || []);
  }
}

// Draw entities only
function drawEntitiesOnly(humans, animals) {
  if (!mapImageData) return;
  ctx.putImageData(mapImageData, 0, 0);
  drawEntities(humans, animals);
}

// Draw entities with speech bubbles
function drawEntities(humans, animals) {
  if (!humans || !animals) return;
  
  const now = Date.now();
  
  // Draw animals
  for (const a of animals) {
    ctx.fillStyle = a.sleeping ? '#646478' :
                   (a.type==='Carnivore' ? '#ff3232' : '#ffdc32');
    const posX = Array.isArray(a.pos) && a.pos.length >= 2 ? a.pos[1] : a.pos[1];
    const posY = Array.isArray(a.pos) && a.pos.length >= 2 ? a.pos[0] : a.pos[0];
    ctx.fillRect(posX*CELL, posY*CELL, CELL, CELL);
  }
  
  // Draw humans with speech bubbles
  for (const h of humans) {
    ctx.fillStyle = '#ffffff';
    const posX = Array.isArray(h.pos) && h.pos.length >= 3 ? h.pos[1] : h.pos[1];
    const posY = Array.isArray(h.pos) && h.pos.length >= 3 ? h.pos[0] : h.pos[0];
    const posZ = Array.isArray(h.pos) && h.pos.length >= 3 ? h.pos[2] : 0;
    
    const heightOffset = posZ * 2;
    ctx.fillRect(posX*CELL, posY*CELL - heightOffset, CELL, CELL);
    
    // Draw speech bubble if active
    for (const bubble of activeSpeechBubbles) {
      if (bubble.speaker === h.name && now - bubble.startTime < bubble.duration) {
        drawSpeechBubble(posX*CELL, posY*CELL - heightOffset - 20, bubble.text);
      }
    }
  }
  
  // Clean up expired speech bubbles
  activeSpeechBubbles = activeSpeechBubbles.filter(b => now - b.startTime < b.duration);
}

// Draw speech bubble above character
function drawSpeechBubble(x, y, text) {
  const padding = 5;
  const fontSize = 10;
  ctx.font = `${fontSize}px Arial`;
  const metrics = ctx.measureText(text);
  const width = metrics.width + padding * 2;
  const height = fontSize + padding * 2;
  
  // Draw bubble background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(x - width/2, y - height, width, height);
  
  // Draw bubble border
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - width/2, y - height, width, height);
  
  // Draw text
  ctx.fillStyle = '#000';
  ctx.fillText(text, x - metrics.width/2, y - padding - 2);
}

// Animation loop for smooth rendering
function animationLoop() {
  if (lastState && lastState.map) {
    drawEntitiesOnly(lastState.humans || [], lastState.animals || []);
  }
  requestAnimationFrame(animationLoop);
}

function sendCmd(cmd) {
  fetch(`/api/command/${cmd}`, { method: 'POST' })
    .then(() => fetchState());
}

// Draw map
function drawMap(mapData) {
  if (!mapData || mapData.length === 0) return;

  const imgData = ctx.createImageData(SIZE * CELL, SIZE * CELL);
  const data = imgData.data;

  for (let i = 0; i < mapData.length; i++) {
    const pixel = mapData[i];
    const idx = i * 4;
    data[idx]     = pixel[0];
    data[idx + 1] = pixel[1];
    data[idx + 2] = pixel[2];
    data[idx + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  mapImageData = imgData;
}

// Full render
function render(state) {
  if (!state) return;
  updateHeader(state);
  updateHumans(state.humans || [], state.relationship);
  updateStats(state);
  updateLog(state.history || []);
  updateDialogue(state.dialogue || []);
  drawMap(state.map);
  drawEntities(state.humans || [], state.animals || []);
}

// Update header
function updateHeader(state) {
  if (!state) return;
  const h = document.getElementById('header');
  if (!h) return;
  h.innerHTML = `
    <div class="header-content">
      <div class="time-info">
        <span>Day ${state.day}</span>
        <span>${state.time}</span>
        <span>${state.season}</span>
      </div>
      <div class="weather-info">
        <span>🌡️ ${state.temp}°C</span>
        <span>💧 ${state.moisture}%</span>
      </div>
    </div>
  `;
}

// Update humans
function updateHumans(humans, relationship) {
  const panel = document.getElementById('humans-panel');
  if (!panel) return;
  panel.innerHTML = '';
  
  for (const h of humans) {
    const div = document.createElement('div');
    div.className = 'human-card';
    div.innerHTML = `
      <h3>${h.name}</h3>
      <p>Age: ${h.age.toFixed(1)} | Health: ${h.health.toFixed(1)}</p>
      <p>Hunger: ${h.drives.hunger.toFixed(0)} | Energy: ${h.u_energy.toFixed(0)}</p>
      <p>Action: ${h.action}</p>
    `;
    panel.appendChild(div);
  }
}

// Update stats
function updateStats(state) {
  const panel = document.getElementById('stats-panel');
  if (!panel) return;
  panel.innerHTML = `
    <h3>Ecosystem</h3>
    <p>Rabbits: ${state.fauna?.rabbit || 0}</p>
    <p>Deer: ${state.fauna?.deer || 0}</p>
    <p>Tigers: ${state.fauna?.tiger || 0}</p>
    <p>Biomass: ${state.biomass || 0}</p>
  `;
}

// Update log
function updateLog(history) {
  const log = document.getElementById('log-panel');
  if (!log) return;
  log.innerHTML = '';
  
  for (const entry of history.slice(-10)) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.textContent = entry;
    log.appendChild(div);
  }
}

// Initialize
window.addEventListener('load', () => {
  updateCanvasSize();
  window.addEventListener('resize', updateCanvasSize);
  
  // Start animation loop
  animationLoop();
  
  // Fetch state periodically
  setInterval(fetchState, 2500);
  fetchState();
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
  if (e.key === ' ') {
    sendCmd('start');
  } else if (e.key === 'p') {
    sendCmd('pause');
  } else if (e.key === 's') {
    sendCmd('step');
  }
});
