import asyncio
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from core.world import World
from ui.websocket_manager import WebSocketManager

app = FastAPI()
world = World()
ws_manager = WebSocketManager()

# Subscribe to event bus for logs and dialogues
def on_log(msg: str):
    ws_manager.broadcast({"type": "log", "data": msg})
world.event_bus.on("log", on_log)

def on_dialogue(utterance):
    ws_manager.broadcast({"type": "dialogue", "data": utterance})
world.event_bus.on("dialogue", on_dialogue)

# Store last snapshot for delta endpoint
last_snapshot = None

# Register world snapshot listener (for full snapshot)
def on_world_update(snapshot):
    global last_snapshot
    last_snapshot = snapshot
    ws_manager.broadcast(snapshot)
world.listeners.append(on_world_update)

world.start()

# Background task to broadcast full state every 2 seconds (in case delta not used)
async def periodic_broadcast():
    while True:
        await asyncio.sleep(2.0)
        if last_snapshot:
            ws_manager.broadcast(last_snapshot)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(periodic_broadcast())

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, handle client messages if any
            data = await websocket.receive_text()
            # Optionally handle client commands via WebSocket
            # For now, ignore
    except Exception:
        ws_manager.disconnect(websocket)

@app.get("/api/state")
def get_state():
    """Return full world snapshot."""
    return world.to_dict()

@app.get("/api/state/delta")
def get_state_delta(last_day: int = -1):
    """Delta endpoint: returns full if day changed, else partial (currently just returns full for simplicity)."""
    # For simplicity, return full state. In a more advanced version, compute diff.
    # But we'll keep it simple; frontend can handle full updates.
    return {"type": "full", "data": world.to_dict()}

@app.post("/api/command/{cmd}")
def command(cmd: str):
    if cmd == "pause":
        world.paused = True
    elif cmd == "start":
        world.paused = False
    elif cmd == "reset":
        # Reinitialize world
        world.reset()  # Implement reset method in World class
    return {"ok": True}

app.mount("/static", StaticFiles(directory="ui/static"), name="static")
@app.get("/")
async def index():
    return FileResponse("ui/static/index.html")