// ui/static/app.js
let ws = null;
let canvas = document.getElementById('map-canvas');
let ctx = canvas.getContext('2d');
let CELL_SIZE = 6;
const MAP_SIZE = 100;

function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    ws.onopen = () => console.log('WebSocket connected');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'full') {
            renderFull(data.data);
        }
    };
    ws.onclose = () => setTimeout(initWebSocket, 3000);
}

function renderFull(state) {
    document.getElementById('day').innerText = state.day;
    document.getElementById('temp').innerText = state.temp;
    document.getElementById('biomass').innerText = state.biomass;
    renderHumans(state.humans);
    renderLog(state.history);
    drawMap(state.map);
}

function renderHumans(humans) {
    const container = document.getElementById('humans-panel');
    if (!humans || !humans.length) return;
    container.innerHTML = humans.map(h => `
        <div class="human-card">
            <div class="human-name">${h.name} (${h.sex === 'M' ? '♂' : '♀'})</div>
            <div class="human-stats">
                Health: ${h.health} | Age: ${h.age.toFixed(1)}<br>
                Action: ${h.action}<br>
                Emotion: ${h.emotion}<br>
                Hunger: ${h.drives.hunger.toFixed(0)} | Tired: ${h.drives.tired.toFixed(0)}
            </div>
        </div>
    `).join('');
}

function renderLog(history) {
    const container = document.getElementById('log-panel');
    if (!history) return;
    container.innerHTML = history.slice(-20).map(entry => `<div class="log-entry">${entry}</div>`).join('');
    container.scrollTop = container.scrollHeight;
}

function drawMap(mapData) {
    if (!mapData || mapData.length !== MAP_SIZE) return;
    const container = document.getElementById('map-container');
    const maxSize = Math.min(container.clientWidth, container.clientHeight) - 20;
    CELL_SIZE = Math.floor(maxSize / MAP_SIZE);
    if (CELL_SIZE < 2) CELL_SIZE = 2;
    canvas.width = MAP_SIZE * CELL_SIZE;
    canvas.height = MAP_SIZE * CELL_SIZE;

    const imgData = ctx.createImageData(canvas.width, canvas.height);
    const data = imgData.data;
    for (let r = 0; r < MAP_SIZE; r++) {
        for (let c = 0; c < MAP_SIZE; c++) {
            const [R,G,B] = mapData[r][c];
            for (let dy = 0; dy < CELL_SIZE; dy++) {
                for (let dx = 0; dx < CELL_SIZE; dx++) {
                    const idx = ((r*CELL_SIZE+dy)*canvas.width + (c*CELL_SIZE+dx)) * 4;
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

window.addEventListener('resize', () => {
    if (window.lastState) drawMap(window.lastState.map);
});

initWebSocket();