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
        """Thread-safe broadcast with removal of dead connections"""
        message = json.dumps({"type": "full", "data": snapshot})
        to_remove = set()

        for ws in list(self.connections):   # iterate over a copy
            try:
                asyncio.run_coroutine_threadsafe(
                    ws.send_text(message),
                    self.loop
                ).result(timeout=1.0)
            except Exception:
                # Connection likely dead, mark for removal
                to_remove.add(ws)

        # Remove dead connections
        self.connections -= to_remove
