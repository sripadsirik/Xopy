# XOPY — Downtime Radar (Grainger-aligned real-time maintenance → purchasing)

XOPY is a real-time “Downtime Radar” dashboard that:
- simulates equipment telemetry (using the AI4I 2020 dataset),
- predicts near-term failure risk with an ML model,
- recommends what to buy now vs. monitor,
- streams live updates to a dashboard via WebSockets.

**One-liner:** “Buy before downtime buys you.”

---

## What this repo does (high level)

### Data → Prediction → Decision → Dashboard
1) **Telemetry stream** (simulated): AI4I rows sampled continuously to mimic live sensor readings  
2) **Model inference**: predicts failure probability + failure type  
3) **Decision engine**: chooses an action (BUY_NOW / BUY_SUBSTITUTE / MONITOR) + categories + substitutes  
4) **WebSocket broadcast**: backend pushes JSON events to all connected clients  
5) **Frontend dashboard**: equipment list + risk charts + purchase panel update in real-time

---

## Architecture

### Backend
- **FastAPI** server
- REST endpoints:
  - `/health`
  - `/predict`
  - `/ws/status`
- WebSocket:
  - `/ws/live` (server pushes live events)
- Telemetry simulator:
  - samples from `backend/data/ai4i2020.csv`
- Models:
  - trained via `backend/train/train_models.py`

### Frontend
- React + TypeScript + Vite
- `useLiveFeed` hook connects to WebSocket and updates UI state
- Dashboard renders:
  - Equipment list
  - RiskChart (72h curve + sensor sparkline)
  - PurchaseEngine (backend-driven purchase recommendation)
  - Alerts log

---

## Live event format (what the frontend receives)

Each message pushed from the backend looks like:

```json
{
  "machine_id": "M-01",
  "ts": "2026-02-07T10:12:33Z",
  "telemetry": {
    "type": "L",
    "air_temp_k": 300.1,
    "process_temp_k": 312.3,
    "rpm": 1500,
    "torque_nm": 45.0,
    "tool_wear_min": 120
  },
  "prediction": {
    "failure_prob": 0.82,
    "failure_type": "HDF",
    "confidence": 0.91,
    "failure_type_probs": { "TWF": 0.1, "HDF": 0.7, "PWF": 0.1, "OSF": 0.05, "RNF": 0.05 }
  },
  "decision": {
    "action": "BUY_NOW",
    "reason": "High heat dissipation failure risk",
    "recommended_categories": ["Bearings & Motor Components"],
    "substitutes": [
      { "name": "Alt Bearing X", "category": "Bearings", "availability": "In Stock", "lead_time_days": 1, "risk_reduction": 0.83 }
    ]
  }
}


How to run (Windows)
1) Backend

Open a terminal:

cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python train/train_models.py
uvicorn app.main:app --reload --port 8000


Check:

http://127.0.0.1:8000/health

http://127.0.0.1:8000/docs

http://127.0.0.1:8000/ws/status

Dataset requirement
Make sure this exists:

backend/data/ai4i2020.csv

2) Frontend

Open another terminal:

cd frontend
npm install
npm run dev


Open:

http://127.0.0.1:5173

How to run (Mac/Linux)
Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python train/train_models.py
uvicorn app.main:app --reload --port 8000

Frontend
cd frontend
npm install
npm run dev

Current limitations / drawbacks (known issues)
1) Still somewhat laggy

Reasons:

UI updates frequently from a live WebSocket stream

Charts and animations are expensive to re-render
Mitigations already implemented:

frontend throttles UI updates (only applies latest message a few times per second)

sensor history capped

Recharts animations disabled in the chart

If it still feels slow:

reduce update rate from backend simulator

reduce chart complexity

remove some framer-motion animations on frequently-updating components

2) UI is confusing for first-time viewers

Right now it’s “dashboard dense.”
Issues:

too many signals at once (risk curve + sensors + purchase panel)

not enough guidance about what to click / why it matters

Quick UI improvements:

add a “Demo Mode” tooltip overlay: “Click a machine → see forecast → see buy recommendation”

add a single “Recommended Action” banner at top for the selected machine

highlight the machine row when it is “BUY_NOW”

3) Data realism

We simulate sensors by sampling from AI4I.
That’s good for a hackathon demo, but not real IoT ingestion.
In real life, this would plug into:

SCADA / OPC UA / IoT gateways

asset management systems (CMMS)

inventory + supplier APIs

4) Procurement realism

Substitute items are currently mocked.
In real production, substitutions depend on:

compatibility specs

lead-time and availability

total cost + downtime cost

supplier diversity and risk

Future directions (good hackathon extensions)
A) “Cheapest place to buy” / price comparison (procurement intelligence)

Add a “best option” ranking that compares:

Grainger (fastest availability)

other suppliers (cheaper, slower)

local pickup vs shipping cost

How:

integrate public catalog pricing APIs (where allowed) OR scrape from a small curated list

build a scoring function:

total price

lead time

risk reduction

downtime avoidance value

Show a “best value” badge:

“Cheapest”

“Fastest”

“Best risk reduction”

Note: many supplier prices aren’t freely accessible via API. A hackathon-safe approach is to use a small mocked dataset or manual CSV of suppliers and prices.

B) Add demo controls (judge-friendly)

Backend endpoints:

POST /demo/oversample?rate=0.8 (more failures on command)

POST /demo/interval?sec=0.3 (speed up/slow down)

POST /demo/pause and POST /demo/resume

This makes it easy to create dramatic “BUY NOW” moments during judging.

C) Explainability panel (trust + confidence)

Add:

top features driving risk (tool wear, torque, heat…)

model confidence

“why this action?” natural language

D) Fleet-level optimization

Instead of treating machines independently:

prioritize purchases under a budget constraint

optimize across multiple sites

estimate downtime cost per asset and recommend the highest ROI actions first

E) Better failure forecasting

Right now: point-in-time risk + synthetic 72h curve.
Upgrade:

time-series model

survival model / hazard function

calibrated uncertainty bands