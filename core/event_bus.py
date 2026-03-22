# core/event_bus.py
from typing import List, Dict, Any, Callable
from collections import deque

class EventBus:
    def __init__(self, max_logs=500):
        self._listeners: Dict[str, List[Callable]] = {}
        self._log: deque = deque(maxlen=max_logs)

    def on(self, event_type: str, callback: Callable):
        if event_type not in self._listeners:
            self._listeners[event_type] = []
        self._listeners[event_type].append(callback)

    def emit(self, event_type: str, data: Any):
        if event_type == "log":
            self._log.append(data)
        if event_type in self._listeners:
            for cb in self._listeners[event_type]:
                cb(data)

    def get_logs(self, n: int = 30) -> List[str]:
        return list(self._log)[-n:]