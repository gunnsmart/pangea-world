import asyncio
import os
import random
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from core.session_manager import session_manager
from ui.websocket_manager import WebSocketManager
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_CONSOLE_DIST = os.path.join(_BASE_DIR, "ui", "console-dist")
_CLASSIC_DIR = os.path.join(_BASE_DIR, "ui", "static")

@app.on_event("startup")
async def startup_event():
    from persistence.database import init_db
    init_db()

@app.get("/api/health")
async def health():
    return {"ok": True}

@app.post("/api/session")
async def create_session():
    """Create a new simulation session."""
    session_id = session_manager.create_session()
    return {"session_id": session_id}

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    world = session_manager.get_world(session_id)
    if not world:
        await websocket.close(code=1008, reason="Invalid session")
        return

    ws_mgr = WebSocketManager()
    await ws_mgr.connect(websocket)

    def on_snapshot(snapshot):
        ws_mgr.broadcast(snapshot)

    world.listeners.append(on_snapshot)

    try:
        while True:
            data = await websocket.receive_text()
    except Exception:
        pass
    finally:
        if on_snapshot in world.listeners:
            world.listeners.remove(on_snapshot)
        ws_mgr.disconnect(websocket)
        if not world.listeners:
            session_manager.remove_session(session_id)

@app.get("/api/state/{session_id}")
async def get_state(session_id: str):
    world = session_manager.get_world(session_id)
    if not world:
        raise HTTPException(status_code=404, detail="Invalid session")
    return world.to_dict()

INTERVENTIONS = {"SOLAR_FLARE", "AERO_BLOOM", "STASIS_PROTOCOL", "RESOURCE_INJECTION"}

def _apply_intervention(world, itype: str):
    logs = []
    if itype == "SOLAR_FLARE":
        world.weather.global_temperature = min(42.0, world.weather.global_temperature + 15)
        world.weather.global_moisture = max(10.0, world.weather.global_moisture - 10)
        for _ in range(5):
            pos = [random.randint(5, world.terrain.size - 6), random.randint(5, world.terrain.size - 6)]
            fire = world.fires.start_fire(pos, fuel_kg=4.0)
            fire.ignite(0.3, True)
        logs.append("☄️ SOLAR_FLARE: อุณหภูมิพุ่ง กองไฟเกิดทั่วเกาะ")
    elif itype == "AERO_BLOOM":
        world.weather.global_moisture = min(95.0, world.weather.global_moisture + 25)
        world.weather.global_temperature = max(12.0, world.weather.global_temperature - 5)
        world.plants.global_biomass = min(1000, world.plants.global_biomass * 1.2)
        for row in world.terrain.vegetation:
            for i, v in enumerate(row):
                row[i] = min(100, v + 20)
        logs.append("🌱 AERO_BLOOM: ความชื้นสูง พืชเบ่งบานทั่วเกาะ")
    elif itype == "STASIS_PROTOCOL":
        for h in world.humans:
            h.body.hormone.cortisol = 0
            h.body.hormone.oxytocin = min(100, h.body.hormone.oxytocin + 80)
            h.body.health = min(100, h.body.health + 10)
            h.brain.drives.relieve("fear", 100)
        logs.append("🧘 STASIS_PROTOCOL: ฮอร์โมนนิ่ง บาดแผลฟื้นตัว")
    elif itype == "RESOURCE_INJECTION":
        veg = world.terrain.vegetation
        n = len(veg)
        for _ in range(20):
            r = random.randint(0, n - 1); c = random.randint(0, n - 1)
            veg[r][c] = min(100, veg[r][c] + 50)
        logs.append("💎 RESOURCE_INJECTION: แร่ธาตุหล่อเลี้ยงดิน 20 จุด")
    for msg in logs:
        world.event_bus.emit("log", msg)

@app.post("/api/command/{session_id}/{cmd:path}")
async def command(session_id: str, cmd: str):
    world = session_manager.get_world(session_id)
    if not world:
        raise HTTPException(status_code=404, detail="Invalid session")

    if cmd == "pause":
        world.paused = True
    elif cmd == "start":
        world.paused = False
    elif cmd == "reset":
        world.reset()
    elif cmd.startswith("intervene/"):
        itype = cmd.split("/", 1)[1].upper()
        if itype not in INTERVENTIONS:
            raise HTTPException(status_code=400, detail=f"Unknown intervention: {itype}")
        _apply_intervention(world, itype)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown command: {cmd}")
    return {"ok": True}

# ---- Static frontends (mounted last so API/WS routes win) ----
if os.path.isdir(_CLASSIC_DIR):
    app.mount("/classic", StaticFiles(directory=_CLASSIC_DIR, html=True), name="classic")

if os.path.isdir(_CONSOLE_DIST):
    app.mount("/", StaticFiles(directory=_CONSOLE_DIST, html=True), name="console")
else:
    @app.get("/")
    async def fallback_index():
        return JSONResponse({"error": "console not built. Run: cd console && npm install && npm run build"}, status_code=503)
