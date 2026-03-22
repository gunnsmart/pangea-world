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

# Register world snapshot listener
def on_world_update(snapshot):
    ws_manager.broadcast(snapshot)
world.listeners.append(on_world_update)

world.start()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
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
        # Implement reset (reinitialize world)
        pass
    return {"ok": True}

app.mount("/static", StaticFiles(directory="ui/static"), name="static")
@app.get("/")
async def index():
    return FileResponse("ui/static/index.html")