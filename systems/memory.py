# systems/memory.py
from dataclasses import dataclass
from typing import List, Optional, Dict

@dataclass
class EpisodicEvent:
    day: int
    hour: int
    pos: List[int]
    action: str
    outcome: float
    emotion: str
    context: str
    importance: float = 0.5

@dataclass
class SpatialMemory:
    kind: str
    pos: List[int]
    last_seen: int
    visits: int = 1
    reliability: float = 1.0

class LongTermMemory:
    def __init__(self, capacity: int = 500):
        self.capacity = capacity
        self.episodes: List[EpisodicEvent] = []
        self.spatial: List[SpatialMemory] = []
        self.semantic: Dict[str, float] = {}

    def store_episode(self, day: int, hour: int, pos: List[int],
                      action: str, outcome: float, emotion: str,
                      context: str, importance: float = 0.5):
        ep = EpisodicEvent(day, hour, pos[:], action, outcome, emotion, context, importance)
        self.episodes.append(ep)
        if len(self.episodes) > self.capacity:
            self.episodes.sort(key=lambda e: e.importance * (1/(max(1, day-e.day+1))), reverse=True)
            self.episodes = self.episodes[:self.capacity]

    def recall_episodes(self, context: str = "", location: List[int] = None,
                        action: str = "", limit: int = 5) -> List[EpisodicEvent]:
        candidates = self.episodes
        if context:
            ctx_keys = set(context.lower().split())
            candidates = [e for e in candidates if any(k in e.context.lower() for k in ctx_keys)]
        if location:
            candidates = sorted(candidates, key=lambda e: abs(e.pos[0]-location[0])+abs(e.pos[1]-location[1]))
        if action:
            candidates = [e for e in candidates if e.action == action]
        return sorted(candidates, key=lambda e: (e.importance, e.day), reverse=True)[:limit]

    def remember_place(self, kind: str, pos: List[int], day: int):
        for sm in self.spatial:
            if sm.kind == kind and abs(sm.pos[0]-pos[0])+abs(sm.pos[1]-pos[1]) <= 2:
                sm.visits += 1
                sm.last_seen = day
                sm.reliability = min(1.0, sm.reliability + 0.1)
                return
        self.spatial.append(SpatialMemory(kind, pos[:], day))
        if len(self.spatial) > 100:
            self.spatial.sort(key=lambda s: s.reliability * s.visits, reverse=True)
            self.spatial = self.spatial[:80]

    def find_nearest(self, kind: str, pos: List[int], max_age: int = 30) -> Optional[SpatialMemory]:
        candidates = [s for s in self.spatial if s.kind == kind and s.reliability > 0.3]
        if not candidates:
            return None
        return min(candidates, key=lambda s: abs(s.pos[0]-pos[0])+abs(s.pos[1]-pos[1]))

    def decay(self, current_day: int):
        for sm in self.spatial:
            days_old = current_day - sm.last_seen
            sm.reliability = max(0.1, sm.reliability * (0.99 ** days_old))

    def learn_fact(self, fact: str, confidence: float = 1.0):
        existing = self.semantic.get(fact, 0.0)
        self.semantic[fact] = min(1.0, existing + confidence * 0.2)

    def knows(self, fact: str, threshold: float = 0.5) -> bool:
        return self.semantic.get(fact, 0.0) >= threshold