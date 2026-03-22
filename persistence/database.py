# persistence/database.py
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

_conn_lock = threading.Lock()
_conn = None

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

def init_db() -> bool:
    conn = get_conn()
    if not conn:
        print("[DB] No connection — running without persistence")
        return False
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS sim_snapshots (
                    id SERIAL PRIMARY KEY,
                    saved_at TIMESTAMPTZ DEFAULT NOW(),
                    sim_day INTEGER NOT NULL,
                    state_json TEXT NOT NULL,
                    human_pkl BYTEA
                );
                CREATE TABLE IF NOT EXISTS event_log (
                    id SERIAL PRIMARY KEY,
                    sim_day INTEGER NOT NULL,
                    sim_hour INTEGER DEFAULT 0,
                    event_text TEXT NOT NULL,
                    event_type VARCHAR(30) DEFAULT 'general',
                    logged_at TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS time_series (
                    id SERIAL PRIMARY KEY,
                    sim_day INTEGER NOT NULL,
                    rabbit_pop INTEGER DEFAULT 0,
                    deer_pop INTEGER DEFAULT 0,
                    tiger_pop INTEGER DEFAULT 0,
                    human_pop INTEGER DEFAULT 0,
                    biomass FLOAT DEFAULT 0,
                    co2_ppm FLOAT DEFAULT 280,
                    temperature FLOAT DEFAULT 28,
                    recorded_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)
        conn.commit()
        print("[DB] ✅ Tables ready")
        return True
    except Exception as e:
        print(f"[DB] Schema error: {e}")
        conn.rollback()
        return False

def save_snapshot(sim_day: int, state_dict: dict, humans: list = None) -> bool:
    conn = get_conn()
    if not conn:
        return False
    try:
        state_json = json.dumps(state_dict, ensure_ascii=False)
        human_pkl = pickle.dumps(humans) if humans else None
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO sim_snapshots (sim_day, state_json, human_pkl)
                VALUES (%s, %s, %s)
            """, (sim_day, state_json, psycopg2.Binary(human_pkl) if human_pkl else None))
            cur.execute("""
                DELETE FROM sim_snapshots WHERE id NOT IN (
                    SELECT id FROM sim_snapshots ORDER BY saved_at DESC LIMIT 100
                )
            """)
        conn.commit()
        return True
    except Exception as e:
        print(f"[DB] save_snapshot error: {e}")
        conn.rollback()
        return False

def load_latest_snapshot() -> Optional[dict]:
    conn = get_conn()
    if not conn:
        return None
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("""
                SELECT sim_day, state_json, human_pkl, saved_at
                FROM sim_snapshots ORDER BY saved_at DESC LIMIT 1
            """)
            row = cur.fetchone()
            if not row:
                return None
            return {
                "sim_day": row["sim_day"],
                "state": json.loads(row["state_json"]),
                "humans": pickle.loads(bytes(row["human_pkl"])) if row["human_pkl"] else None,
                "saved_at": row["saved_at"],
            }
    except Exception as e:
        print(f"[DB] load_snapshot error: {e}")
        return None

def record_timeseries(sim_day: int, fauna, biomass: float, co2: float, temp: float, human_pop: int):
    conn = get_conn()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO time_series (sim_day, rabbit_pop, deer_pop, tiger_pop,
                                         human_pop, biomass, co2_ppm, temperature)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """, (sim_day, fauna.rabbit_pop, fauna.deer_pop, fauna.tiger_pop,
                  human_pop, biomass, co2, temp))
        conn.commit()
    except Exception as e:
        print(f"[DB] timeseries error: {e}")
        conn.rollback()