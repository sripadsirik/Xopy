from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .schemas import TelemetryIn, PredictResponse
from .model_service import load_artifacts, predict
from .decision import decide, make_substitutes

app = FastAPI(title="XOPY Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ARTIFACTS = load_artifacts()

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
