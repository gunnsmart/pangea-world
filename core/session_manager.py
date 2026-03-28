# core/session_manager.py
import uuid
import threading
from typing import Dict, Optional
from core.world import World

class SessionManager:
    def __init__(self):
        self._worlds: Dict[str, World] = {}
        self._lock = threading.Lock()

    def create_session(self) -> str:
        """Create a new simulation session, return session ID."""
        session_id = str(uuid.uuid4())
        world = World()
        world.start()
        with self._lock:
            self._worlds[session_id] = world
        return session_id

    def get_world(self, session_id: str) -> Optional[World]:
        with self._lock:
            return self._worlds.get(session_id)

    def remove_session(self, session_id: str):
        with self._lock:
            world = self._worlds.pop(session_id, None)
            if world:
                world.running = False  # stop simulation

# Global instance
session_manager = SessionManager()
