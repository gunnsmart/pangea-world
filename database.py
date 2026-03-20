"""
database.py — PostgreSQL persistence layer
══════════════════════════════════════════
Tables:
  sim_snapshots  — world state snapshot ทุก 5 นาที
  human_memory   — LTM episodes + spatial memory ถาวร
  event_log      — ทุก event ไม่จำกัด
  time_series    — population/biomass ทุก sim step
"""

import os
import json
import pickle
import threading
from datetime import datetime, timezone, timedelta
from typing import Optional

try:
    import psycopg2
    import psycopg2.extras
    HAS_PG = True
except ImportError:
    HAS_PG = False

TZ_THAI = timezone(timedelta(hours=7))
DATABASE_URL = os.environ.get("DATABASE_URL", "")


# ══════════════════════════════════════════════════════
# Connection Pool (thread-safe)
# ══════════════════════════════════════════════════════
_conn_lock = threading.Lock()
_conn      = None

def get_conn():
    global _conn
    if not HAS_PG or not DATABASE_URL:
        return None
    with _conn_lock:
        try:
            if _conn is None or _conn.closed:
                _conn = psycopg2.connect(DATABASE_URL, sslmode="require")
                _conn.autocommit = False
            return _conn
        except Exception as e:
            print(f"[DB] Connection error: {e}")
            return None


# ══════════════════════════════════════════════════════
# Schema Setup
# ══════════════════════════════════════════════════════
SCHEMA = """
CREATE TABLE IF NOT EXISTS sim_snapshots (
    id          SERIAL PRIMARY KEY,
    saved_at    TIMESTAMPTZ DEFAULT NOW(),
    sim_day     INTEGER NOT NULL,
    state_json  TEXT NOT NULL,          -- JSON ของ world state หลัก
    human_pkl   BYTEA                   -- pickle ของ Adam/Eve objects
);

CREATE TABLE IF NOT EXISTS human_memory (
    id          SERIAL PRIMARY KEY,
    human_name  VARCHAR(10) NOT NULL,
    sim_day     INTEGER NOT NULL,
    mem_type    VARCHAR(20) NOT NULL,   -- 'episode','spatial','semantic'
    data_json   TEXT NOT NULL,
    importance  FLOAT DEFAULT 0.5,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_log (
    id          SERIAL PRIMARY KEY,
    sim_day     INTEGER NOT NULL,
    sim_hour    INTEGER DEFAULT 0,
    event_text  TEXT NOT NULL,
    event_type  VARCHAR(30) DEFAULT 'general',
    logged_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_series (
    id           SERIAL PRIMARY KEY,
    sim_day      INTEGER NOT NULL,
    rabbit_pop   INTEGER DEFAULT 0,
    deer_pop     INTEGER DEFAULT 0,
    tiger_pop    INTEGER DEFAULT 0,
    human_pop    INTEGER DEFAULT 0,
    biomass      FLOAT DEFAULT 0,
    co2_ppm      FLOAT DEFAULT 280,
    temperature  FLOAT DEFAULT 28,
    recorded_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_day  ON event_log(sim_day);
CREATE INDEX IF NOT EXISTS idx_ts_day     ON time_series(sim_day);
CREATE INDEX IF NOT EXISTS idx_mem_human  ON human_memory(human_name, mem_type);
"""

def init_db() -> bool:
    """สร้าง tables ถ้ายังไม่มี"""
    conn = get_conn()
    if not conn:
        print("[DB] No connection — running without persistence")
        return False
    try:
        with conn.cursor() as cur:
            cur.execute(SCHEMA)
        conn.commit()
        print("[DB] ✅ Tables ready")
        return True
    except Exception as e:
        print(f"[DB] Schema error: {e}")
        conn.rollback()
        return False


# ══════════════════════════════════════════════════════
# Sim Snapshots — Save & Load
# ══════════════════════════════════════════════════════
def save_snapshot(sim_day: int, state_dict: dict,
                  humans: list = None) -> bool:
    """
    บันทึก snapshot ของ world state
    state_dict — dict ที่ serialize ได้ (ไม่มี object ซับซ้อน)
    humans     — list ของ HumanAI objects (pickle)
    """
    conn = get_conn()
    if not conn:
        return False
    try:
        state_json = json.dumps(state_dict, ensure_ascii=False)
        human_pkl  = pickle.dumps(humans) if humans else None

        with conn.cursor() as cur:
            # เก็บแค่ snapshot ล่าสุด 100 อัน
            cur.execute("""
                INSERT INTO sim_snapshots (sim_day, state_json, human_pkl)
                VALUES (%s, %s, %s)
            """, (sim_day, state_json, psycopg2.Binary(human_pkl) if human_pkl else None))

            # ลบ snapshot เก่า เก็บแค่ 100
            cur.execute("""
                DELETE FROM sim_snapshots
                WHERE id NOT IN (
                    SELECT id FROM sim_snapshots
                    ORDER BY saved_at DESC LIMIT 100
                )
            """)
        conn.commit()
        return True
    except Exception as e:
        print(f"[DB] save_snapshot error: {e}")
        conn.rollback()
        return False


def load_latest_snapshot() -> Optional[dict]:
    """โหลด snapshot ล่าสุด — ใช้ resume หลัง restart"""
    conn = get_conn()
    if not conn:
        return None
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("""
                SELECT sim_day, state_json, human_pkl, saved_at
                FROM sim_snapshots
                ORDER BY saved_at DESC LIMIT 1
            """)
            row = cur.fetchone()
            if not row:
                return None
            result = {
                "sim_day":    row["sim_day"],
                "state":      json.loads(row["state_json"]),
                "humans":     pickle.loads(bytes(row["human_pkl"])) if row["human_pkl"] else None,
                "saved_at":   row["saved_at"],
            }
            print(f"[DB] ✅ Resumed from Day {result['sim_day']} (saved {result['saved_at']})")
            return result
    except Exception as e:
        print(f"[DB] load_snapshot error: {e}")
        return None


# ══════════════════════════════════════════════════════
# Human Memory — ถาวร
# ══════════════════════════════════════════════════════
def save_human_memory(human_name: str, sim_day: int, ltm) -> bool:
    """
    บันทึก LongTermMemory ของ Adam หรือ Eve ลง DB
    ltm — LongTermMemory object จาก senses.py
    """
    conn = get_conn()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            # Episodes — บันทึกเฉพาะที่สำคัญ (importance > 0.4)
            important_eps = [
                e for e in ltm.episodes if e.importance > 0.4
            ][-200:]  # เก็บแค่ 200 ล่าสุด

            eps_data = [
                {
                    "day":        e.day,
                    "hour":       e.hour,
                    "pos":        e.pos,
                    "action":     e.action,
                    "outcome":    e.outcome,
                    "emotion":    e.emotion,
                    "context":    e.context,
                    "importance": e.importance,
                }
                for e in important_eps
            ]

            # Spatial memories
            spatial_data = [
                {
                    "kind":        s.kind,
                    "pos":         s.pos,
                    "last_seen":   s.last_seen,
                    "visits":      s.visits,
                    "reliability": s.reliability,
                }
                for s in ltm.spatial
            ]

            # ลบของเก่าก่อน แล้ว insert ใหม่
            cur.execute(
                "DELETE FROM human_memory WHERE human_name = %s",
                (human_name,)
            )
            cur.execute("""
                INSERT INTO human_memory (human_name, sim_day, mem_type, data_json, importance)
                VALUES (%s, %s, %s, %s, %s)
            """, (human_name, sim_day, "episodes",
                  json.dumps(eps_data, ensure_ascii=False), 1.0))

            cur.execute("""
                INSERT INTO human_memory (human_name, sim_day, mem_type, data_json, importance)
                VALUES (%s, %s, %s, %s, %s)
            """, (human_name, sim_day, "spatial",
                  json.dumps(spatial_data, ensure_ascii=False), 1.0))

            cur.execute("""
                INSERT INTO human_memory (human_name, sim_day, mem_type, data_json, importance)
                VALUES (%s, %s, %s, %s, %s)
            """, (human_name, sim_day, "semantic",
                  json.dumps(ltm.semantic, ensure_ascii=False), 1.0))

        conn.commit()
        return True
    except Exception as e:
        print(f"[DB] save_memory error: {e}")
        conn.rollback()
        return False


def load_human_memory(human_name: str, ltm) -> bool:
    """
    โหลด LongTermMemory จาก DB ใส่กลับเข้า ltm object
    คืน True ถ้าโหลดได้
    """
    conn = get_conn()
    if not conn:
        return False
    try:
        from senses import EpisodicEvent, SpatialMemory

        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("""
                SELECT mem_type, data_json FROM human_memory
                WHERE human_name = %s
                ORDER BY sim_day DESC
            """, (human_name,))
            rows = {row["mem_type"]: json.loads(row["data_json"])
                    for row in cur.fetchall()}

        if not rows:
            return False

        # Restore episodes
        if "episodes" in rows:
            ltm.episodes = [
                EpisodicEvent(**ep) for ep in rows["episodes"]
            ]

        # Restore spatial
        if "spatial" in rows:
            ltm.spatial = [
                SpatialMemory(**s) for s in rows["spatial"]
            ]

        # Restore semantic
        if "semantic" in rows:
            ltm.semantic = rows["semantic"]

        print(f"[DB] ✅ Loaded memory for {human_name}: "
              f"{len(ltm.episodes)} episodes, {len(ltm.spatial)} places")
        return True
    except Exception as e:
        print(f"[DB] load_memory error: {e}")
        return False


# ══════════════════════════════════════════════════════
# Event Log
# ══════════════════════════════════════════════════════
def log_event(sim_day: int, text: str,
              event_type: str = "general", sim_hour: int = 0):
    """บันทึก event ลง DB — non-blocking"""
    conn = get_conn()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO event_log (sim_day, sim_hour, event_text, event_type)
                VALUES (%s, %s, %s, %s)
            """, (sim_day, sim_hour, text, event_type))
        conn.commit()
    except Exception as e:
        print(f"[DB] log_event error: {e}")
        conn.rollback()


def get_event_log(from_day: int = 0, limit: int = 200,
                  event_type: str = None) -> list[dict]:
    """ดึง event log ย้อนหลัง"""
    conn = get_conn()
    if not conn:
        return []
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            if event_type:
                cur.execute("""
                    SELECT sim_day, sim_hour, event_text, event_type, logged_at
                    FROM event_log
                    WHERE sim_day >= %s AND event_type = %s
                    ORDER BY sim_day DESC, id DESC LIMIT %s
                """, (from_day, event_type, limit))
            else:
                cur.execute("""
                    SELECT sim_day, sim_hour, event_text, event_type, logged_at
                    FROM event_log
                    WHERE sim_day >= %s
                    ORDER BY sim_day DESC, id DESC LIMIT %s
                """, (from_day, limit))
            return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"[DB] get_events error: {e}")
        return []


# ══════════════════════════════════════════════════════
# Time Series
# ══════════════════════════════════════════════════════
def record_timeseries(sim_day: int, fauna, biomass: float,
                      co2: float, temp: float, human_pop: int):
    """บันทึก time series ทุก sim step"""
    conn = get_conn()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO time_series
                  (sim_day, rabbit_pop, deer_pop, tiger_pop,
                   human_pop, biomass, co2_ppm, temperature)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """, (sim_day,
                  fauna.rabbit_pop, fauna.deer_pop, fauna.tiger_pop,
                  human_pop, biomass, co2, temp))
        conn.commit()
    except Exception as e:
        print(f"[DB] timeseries error: {e}")
        conn.rollback()


def get_timeseries(from_day: int = 0, limit: int = 500) -> list[dict]:
    """ดึง time series สำหรับ graph"""
    conn = get_conn()
    if not conn:
        return []
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("""
                SELECT sim_day, rabbit_pop, deer_pop, tiger_pop,
                       human_pop, biomass, co2_ppm, temperature
                FROM time_series
                WHERE sim_day >= %s
                ORDER BY sim_day ASC LIMIT %s
            """, (from_day, limit))
            return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"[DB] get_timeseries error: {e}")
        return []


# ══════════════════════════════════════════════════════
# Batch log buffer — ไม่ hit DB ทุก event
# ══════════════════════════════════════════════════════
class EventBuffer:
    """
    Buffer events ไว้แล้ว flush เป็น batch
    ป้องกัน DB hit บ่อยเกินไป
    """
    def __init__(self, flush_every: int = 50):
        self._buf        : list  = []
        self._lock       = threading.Lock()
        self._flush_every= flush_every

    def add(self, sim_day: int, text: str,
            event_type: str = "general", sim_hour: int = 0):
        with self._lock:
            self._buf.append((sim_day, text, event_type, sim_hour))
            if len(self._buf) >= self._flush_every:
                self._flush()

    def flush(self):
        with self._lock:
            self._flush()

    def _flush(self):
        if not self._buf:
            return
        conn = get_conn()
        if not conn:
            self._buf.clear()
            return
        try:
            with conn.cursor() as cur:
                psycopg2.extras.execute_values(cur, """
                    INSERT INTO event_log (sim_day, event_text, event_type, sim_hour)
                    VALUES %s
                """, self._buf)
            conn.commit()
            self._buf.clear()
        except Exception as e:
            print(f"[DB] flush error: {e}")
            conn.rollback()


# Singleton buffer
event_buffer = EventBuffer(flush_every=50)
