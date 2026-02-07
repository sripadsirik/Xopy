# Downtime Radar

**Order before downtime does.**

A real-time predictive maintenance dashboard that monitors factory equipment, predicts failures before they happen, and tells you exactly what to buy and when — built for Grainger.

---

## What It Does

1. **Live equipment monitoring** — Sensors stream data from machines via WebSocket
2. **ML failure prediction** — A trained model predicts failure probability and type in real time
3. **Plain-English recommendations** — Instead of raw numbers, you see: *"Conveyor Motor #4 may fail in 24 hours"*
4. **Instant purchase decisions** — The system recommends parts to order, shows availability, lead times, and arrival dates

## How to Read the Dashboard

| Section | What It Shows |
|---------|---------------|
| **Left panel** — Equipment list | All monitored machines with status labels: *Healthy*, *Watch Closely*, *Order Parts Now* |
| **Center** — Main screen | Headline like *"Main Drive Motor A may fail in 24 hours"*, countdown timer, timeline bar (NOW → RISK → FAILURE), 72-hour forecast chart |
| **Right panel** — Buy decision | What to order, why, which parts are available, when they arrive, and a one-click order button |
| **Top bar** — Marquee summary | Fleet overview: *"3 Machines Need Attention Today — 1 Critical"* |
| **Bottom right** — Alerts | Breaking-news style alerts when a machine enters critical risk |

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite, Tailwind CSS 4, Framer Motion, Recharts
- **Backend:** Python FastAPI, scikit-learn, WebSocket streaming
- **Data:** AI4I 2020 Predictive Maintenance dataset (UCI)
- **ML:** Random Forest classifier for failure probability + failure type prediction

## Architecture

```
Sensor Data → ML Model → Decision Engine → WebSocket → Dashboard
(AI4I dataset)  (predict)   (BUY/MONITOR)   (real-time)  (React)
```

## How to Run

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python train/train_models.py
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — click **Enter Operations Theater** to see the dashboard.

### Verify Backend
- Health: http://127.0.0.1:8000/health
- API docs: http://127.0.0.1:8000/docs
- WS status: http://127.0.0.1:8000/ws/status

## Dataset

The backend requires `backend/data/ai4i2020.csv` (AI4I 2020 Predictive Maintenance Dataset from UCI Machine Learning Repository).

---

*SparkHacks 2026 — Predictive Maintenance for Grainger*
