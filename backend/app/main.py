from __future__ import annotations
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .schemas import TelemetryIn, PredictResponse
from .model_service import load_artifacts, predict
from .decision import decide, make_substitutes
from .ws_manager import WSManager
from .simulator import TelemetrySimulator

app = FastAPI(title="XOPY Backend", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ARTIFACTS = load_artifacts()
WS = WSManager()
SIM = TelemetrySimulator(
    ARTIFACTS,
    WS,
    num_machines=15,
    interval_sec=1.0,
    oversample_failures=0.35,  # increase for more “red” moments in demo
)

@app.on_event("startup")
async def _startup():
    SIM.start()

@app.get("/")
def root():
    return {"name": "XOPY Backend", "ok": True, "try": ["/docs", "/health", "/predict", "/ws/live"]}

@app.get("/health")
def health():
    return {"ok": True, "models_loaded": True}

@app.post("/predict", response_model=PredictResponse)
def predict_endpoint(payload: TelemetryIn):
    p_fail, failure_type, type_probs, confidence = predict(
        ARTIFACTS,
        machine_type=payload.type,
        air_temp_k=payload.air_temp_k,
        process_temp_k=payload.process_temp_k,
        rpm=payload.rpm,
        torque_nm=payload.torque_nm,
        tool_wear_min=payload.tool_wear_min,
    )

    action, reason, categories = decide(p_fail, failure_type)
    substitutes = make_substitutes(categories) if action == "BUY_SUBSTITUTE" else []

    return {
        "machine_id": payload.machine_id,
        "prediction": {
            "failure_prob": p_fail,
            "failure_type": failure_type,
            "failure_type_probs": type_probs,
            "confidence": confidence,
        },
        "decision": {
            "action": action,
            "reason": reason,
            "recommended_categories": categories,
            "substitutes": substitutes,
        },
    }

@app.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    await WS.connect(websocket)
    try:
        while True:
            # server pushes only; client doesn't need to send anything
            await asyncio.sleep(60)
    except WebSocketDisconnect:
        await WS.disconnect(websocket)
    except Exception:
        await WS.disconnect(websocket)

@app.get("/ws/status")
async def ws_status():
    return {"connections": await WS.count()}