# 🧬 Pangea Simulation

Pangea is a realistic ecosystem simulation where Adam and Eve live autonomously, driven by pain and pleasure signals.

## Features
- Pure autonomous AI (no hardcoded behavior)
- Realistic biology (gender differences, pregnancy, aging)
- Physics & chemistry (thermodynamics, photosynthesis, fire)
- Dynamic environment (weather, seasons, disasters)
- Wildlife with drives and reproduction
- Language emergence

## Installation
```bash
pip install -r requirements.txt
```

## Run (Unified: Python engine + PANGEA_OS console)
```bash
cd console && npm install && npm run build && cd ..
uvicorn server:app --reload
```
Open http://127.0.0.1:8000 — PANGEA_OS Console UI on the Python world engine.
- `/classic` — original lightweight UI
- `POST /api/command/{sid}/intervene/{SOLAR_FLARE|AERO_BLOOM|STASIS_PROTOCOL|RESOURCE_INJECTION}`

The console auto-rebuilds only when you rerun `npm run build` inside `console/`.

## Tests
```bash
python -m pytest test_crafting.py -v
```

## Optional persistence (PostgreSQL)
Set `DATABASE_URL` before starting; tables (`sim_snapshots`, `time_series`, `event_log`, `language_lexicon`) are created automatically. The lexicon of invented words is saved daily and restored into new sessions. Without `DATABASE_URL` everything runs in-memory.
