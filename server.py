import asyncio
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from core.session_manager import session_manager
from ui.websocket_manager import WebSocketManager
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global static mount
app.mount("/static", StaticFiles(directory="ui/static"), name="static")

@app.get("/")
async def index():
    return FileResponse("ui/static/index.html")

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

    # Create a WebSocketManager for this session
    ws_mgr = WebSocketManager()
    await ws_mgr.connect(websocket)

    def on_snapshot(snapshot):
        ws_mgr.broadcast(snapshot)

    # Register listener to the world
    world.listeners.append(on_snapshot)

    try:
        # Keep connection alive, handle client commands if any
        while True:
            # We can receive commands from client via WebSocket
            data = await websocket.receive_text()
            # For now, we just keep it alive
    except Exception:
        # On disconnect, remove listener
        if on_snapshot in world.listeners:
            world.listeners.remove(on_snapshot)
        ws_mgr.disconnect(websocket)

@app.get("/api/state/{session_id}")
async def get_state(session_id: str):
    """Return full world snapshot for a specific session."""
    world = session_manager.get_world(session_id)
    if not world:
        return {"error": "Invalid session"}, 404
    return world.to_dict()

@app.post("/api/command/{session_id}/{cmd}")
async def command(session_id: str, cmd: str):
    world = session_manager.get_world(session_id)
    if not world:
        return {"error": "Invalid session"}, 404
        
    if cmd == "pause":
        world.paused = True
    elif cmd == "start":
        world.paused = False
    elif cmd == "reset":
        world.reset()
    return {"ok": True}
