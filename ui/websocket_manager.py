# ui/websocket_manager.py
import asyncio
import json
from typing import Set
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        self.connections: Set[WebSocket] = set()
        self.loop = asyncio.get_event_loop()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.connections.discard(websocket)

    def broadcast(self, snapshot: dict):
        """Thread-safe broadcast from any thread."""
        message = json.dumps({"type": "full", "data": snapshot})
        for ws in self.connections:
            asyncio.run_coroutine_threadsafe(ws.send_text(message), self.loop)