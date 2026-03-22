# ui/websocket_manager.py
import asyncio
import json
from typing import Set
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        self.connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.connections.discard(websocket)

    async def broadcast(self, snapshot: dict):
        message = json.dumps({"type": "full", "data": snapshot})
        for ws in self.connections:
            try:
                await ws.send_text(message)
            except:
                pass