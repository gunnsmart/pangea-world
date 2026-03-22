const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 50;

// ===== STATE =====
let agents = [];
let camera = { x: 0, y: 0, zoom: 1 };
let selected = null;
let paused = false;
let speed = 1;

// ===== WebSocket =====
const ws = new WebSocket("ws://localhost:8000/ws");

ws.onopen = () => {
  status("🟢 Connected");
};

ws.onmessage = (e) => {
  if (paused) return;

let humans = data.humans || [];
let animals = data.animals || [];
allAgents = [...humans.map(h => ({ x: h.pos[0], y: h.pos[1], type: 'human', ...h })),
              ...animals.map(a => ({ x: a.pos[0], y: a.pos[1], type: 'animal', ...a }))];
};

ws.onclose = () => status("🔴 Disconnected");

// ===== UI =====
function status(msg) {
  document.getElementById("status").innerText = msg;
}

function togglePause() {
  paused = !paused;
}

function speedUp() {
  speed *= 2;
  if (speed > 8) speed = 1;
}

function resetCamera() {
  camera = { x: 0, y: 0, zoom: 1 };
}

// ===== CAMERA CONTROL =====
let dragging = false;
let lastX, lastY;

canvas.addEventListener("mousedown", (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});

canvas.addEventListener("mouseup", () => dragging = false);

canvas.addEventListener("mousemove", (e) => {
  if (!dragging) return;

  camera.x += (e.clientX - lastX);
  camera.y += (e.clientY - lastY);

  lastX = e.clientX;
  lastY = e.clientY;

  render();
});

canvas.addEventListener("wheel", (e) => {
  camera.zoom *= e.deltaY > 0 ? 0.9 : 1.1;
  render();
});

// ===== CLICK SELECT =====
canvas.addEventListener("click", (e) => {
  const mx = (e.clientX - camera.x) / camera.zoom;
  const my = (e.clientY - camera.y) / camera.zoom;

  selected = null;

  for (let a of agents) {
    const dx = a.x - mx;
    const dy = a.y - my;

    if (Math.sqrt(dx*dx + dy*dy) < 6) {
      selected = a;
      break;
    }
  }

  updateInfo();
});

// ===== RENDER =====
function render() {
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(camera.zoom, 0, 0, camera.zoom, camera.x, camera.y);

  drawGrid();
  drawAgents();
}

// ===== GRID =====
function drawGrid() {
  ctx.strokeStyle = "#111";

  for (let x = 0; x < 2000; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 2000);
    ctx.stroke();
  }

  for (let y = 0; y < 2000; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(2000, y);
    ctx.stroke();
  }
}

// ===== AGENTS =====
function drawAgents() {
  for (let a of agents) {

    let color = "white";

    if (a.hunger > 70) color = "orange";
    if (a.energy < 30) color = "blue";
    if (a.anger > 50) color = "red";

    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.arc(a.x, a.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // selected highlight
    if (selected && selected.id === a.id) {
      ctx.strokeStyle = "yellow";
      ctx.stroke();
    }
  }
}

// ===== INFO PANEL =====
function updateInfo() {
  const el = document.getElementById("info");

  if (!selected) {
    el.innerHTML = "No agent selected";
    return;
  }

  el.innerHTML = `
    <b>ID:</b> ${selected.id}<br>
    <b>Hunger:</b> ${selected.hunger}<br>
    <b>Energy:</b> ${selected.energy}<br>
    <b>Emotion:</b> ${selected.emotion || "-"}<br>
    <b>Goal:</b> ${selected.goal || "-"}<br>

    <hr>

    <b>Memory:</b><br>
    ${formatList(selected.memory)}

    <hr>

    <b>Relations:</b><br>
    ${formatList(selected.relations)}
  `;
}

function formatList(list) {
  if (!list) return "-";
  return list.map(i => JSON.stringify(i)).join("<br>");
}

// ===== RESIZE =====
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 50;
  render();
});
