# server.py
import asyncio
import threading
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from core.world import World
from ui.websocket_manager import WebSocketManager

app = FastAPI()
world = World()
ws_manager = WebSocketManager()

# Register world listener to broadcast updates
def on_world_update(snapshot):
    asyncio.create_task(ws_manager.broadcast(snapshot))
world.listeners.append(on_world_update)

# Start simulation thread
world.start()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # keep connection alive
            await websocket.receive_text()
    except:
        ws_manager.disconnect(websocket)

@app.get("/api/state")
def get_state():
    return world.to_dict()

@app.post("/api/command/{cmd}")
def command(cmd: str):
    if cmd == "pause":
        world.paused = True
    elif cmd == "start":
        world.paused = False
    elif cmd == "reset":
        # TODO: reinitialize world
        pass
    return {"ok": True}

# Serve static files
app.mount("/static", StaticFiles(directory="ui/static"), name="static")
@app.get("/")
async def index():
    return FileResponse("ui/static/index.html")