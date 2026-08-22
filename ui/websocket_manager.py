import asyncio
import json
from typing import Set
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        self.connections: Set[WebSocket] = set()
        try:
            self.loop = asyncio.get_event_loop()
        except RuntimeError:
            self.loop = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.connections.discard(websocket)

    def broadcast(self, snapshot: dict):
        """Thread-safe fire-and-forget broadcast; never blocks the sim thread."""
        if not self.loop or not self.connections:
            return
        message = json.dumps({"type": "full", "data": snapshot})

        for ws in list(self.connections):   # iterate over a copy
            future = asyncio.run_coroutine_threadsafe(ws.send_text(message), self.loop)

            def _done(fut, socket=ws):
                try:
                    fut.result()
                except Exception:
                    self.connections.discard(socket)

            future.add_done_callback(_done)
