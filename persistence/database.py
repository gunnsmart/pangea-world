# persistence/database.py
import os
import json
import pickle
import threading
from datetime import datetime, timezone, timedelta
from typing import Optional
import psycopg2
import psycopg2.extras
import psycopg2.pool

TZ_THAI = timezone(timedelta(hours=7))
DATABASE_URL = os.environ.get("DATABASE_URL", "")

_pool = None
_pool_lock = threading.Lock()

def _get_pool():
    global _pool
    if not DATABASE_URL:
        return None
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                try:
                    _pool = psycopg2.pool.ThreadedConnectionPool(
                        minconn=1,
                        maxconn=5,
                        dsn=DATABASE_URL,
                        sslmode="require"
                    )
                except Exception as e:
                    print(f"[DB] Failed to create connection pool: {e}")
                    return None
    return _pool

def get_conn():
    """Get a connection from pool (must call return_conn after use)"""
    pool = _get_pool()
    if pool is None:
        return None
    try:
        conn = pool.getconn()
        # Ensure autocommit is off for transaction control
        conn.autocommit = False
        return conn
    except Exception as e:
        print(f"[DB] get_conn error: {e}")
        return None

def return_conn(conn):
    """Return connection to pool"""
    pool = _get_pool()
    if pool and conn:
        pool.putconn(conn)

def execute_with_conn(func, *args, **kwargs):
    """
    Execute a function that uses a database connection.
    Automatically handles commit/rollback and returns connection to pool.
    """
    conn = get_conn()
    if not conn:
        return None
    try:
        result = func(conn, *args, **kwargs)
        conn.commit()
        return result
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"[DB] execute_with_conn error: {e}")
        raise
    finally:
        if conn:
            return_conn(conn)

def init_db() -> bool:
    """Create tables if not exist"""
    if not DATABASE_URL:
        print("[DB] No DATABASE_URL - persistence disabled")
        return False

    def _init(conn):
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
        return True

    try:
        return execute_with_conn(_init)
    except Exception as e:
        print(f"[DB] init_db error: {e}")
        return False

def save_snapshot(sim_day: int, state_dict: dict, humans: list = None) -> bool:
    if not DATABASE_URL:
        return False
    state_json = json.dumps(state_dict, ensure_ascii=False)
    human_pkl = pickle.dumps(humans) if humans else None

    def _save(conn):
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO sim_snapshots (sim_day, state_json, human_pkl)
                VALUES (%s, %s, %s)
            """, (sim_day, state_json, psycopg2.Binary(human_pkl) if human_pkl else None))
            # Keep only latest 100 snapshots
            cur.execute("""
                DELETE FROM sim_snapshots WHERE id NOT IN (
                    SELECT id FROM sim_snapshots ORDER BY saved_at DESC LIMIT 100
                )
            """)
        return True

    try:
        return execute_with_conn(_save)
    except Exception as e:
        print(f"[DB] save_snapshot error: {e}")
        return False

def load_latest_snapshot() -> Optional[dict]:
    if not DATABASE_URL:
        return None

    def _load(conn):
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

    try:
        return execute_with_conn(_load)
    except Exception as e:
        print(f"[DB] load_snapshot error: {e}")
        return None

def record_timeseries(sim_day: int, fauna, biomass: float, co2: float, temp: float, human_pop: int):
    if not DATABASE_URL:
        return

    def _record(conn):
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO time_series (sim_day, rabbit_pop, deer_pop, tiger_pop,
                                         human_pop, biomass, co2_ppm, temperature)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """, (sim_day, fauna.rabbit_pop, fauna.deer_pop, fauna.tiger_pop,
                  human_pop, biomass, co2, temp))
        return True

    try:
        execute_with_conn(_record)
    except Exception as e:
        print(f"[DB] timeseries error: {e}")
