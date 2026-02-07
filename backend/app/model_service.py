from __future__ import annotations
import json, os
from dataclasses import dataclass
from typing import Dict, Tuple

import joblib
import numpy as np
import pandas as pd

FAIL_TYPE_COLS = ["TWF", "HDF", "PWF", "OSF", "RNF"]

@dataclass
class ModelArtifacts:
    fail_model: object
    type_model: object
    feature_columns: list[str]

def _models_dir() -> str:
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(os.path.dirname(here), "models")

def load_artifacts(models_dir: str | None = None) -> ModelArtifacts:
    md = models_dir or _models_dir()
    fail_path = os.path.join(md, "fail_model.joblib")
    type_path = os.path.join(md, "type_model.joblib")
    meta_path = os.path.join(md, "model_meta.json")

    if not (os.path.exists(fail_path) and os.path.exists(type_path) and os.path.exists(meta_path)):
        raise FileNotFoundError("Missing artifacts in backend/models/ (fail_model.joblib, type_model.joblib, model_meta.json)")

    fail_model = joblib.load(fail_path)
    type_model = joblib.load(type_path)

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    feature_columns = meta.get("feature_columns") or [
        "Type",
        "Air temperature [K]",
        "Process temperature [K]",
        "Rotational speed [rpm]",
        "Torque [Nm]",
        "Tool wear [min]",
        "Temp delta [K]",
    ]
    return ModelArtifacts(fail_model=fail_model, type_model=type_model, feature_columns=feature_columns)

def _to_frame(machine_type: str, air_temp_k: float, process_temp_k: float, rpm: float, torque_nm: float, tool_wear_min: float,
              feature_columns: list[str]) -> pd.DataFrame:
    row = {
        "Type": machine_type,
        "Air temperature [K]": float(air_temp_k),
        "Process temperature [K]": float(process_temp_k),
        "Rotational speed [rpm]": float(rpm),
        "Torque [Nm]": float(torque_nm),
        "Tool wear [min]": float(tool_wear_min),
        "Temp delta [K]": float(process_temp_k) - float(air_temp_k),
    }
    df = pd.DataFrame([row])

    for col in feature_columns:
        if col not in df.columns:
            df[col] = np.nan
    return df[feature_columns]

def predict(art: ModelArtifacts, *, machine_type: str, air_temp_k: float, process_temp_k: float, rpm: float, torque_nm: float, tool_wear_min: float
            ) -> Tuple[float, str, Dict[str, float], float]:
    X = _to_frame(machine_type, air_temp_k, process_temp_k, rpm, torque_nm, tool_wear_min, art.feature_columns)

    p_fail = float(art.fail_model.predict_proba(X)[0][1])

    probs_arr = art.type_model.predict_proba(X)[0]
    classes = getattr(art.type_model, "classes_", None)
    if classes is None:
        classes = art.type_model.named_steps["clf"].classes_

    type_probs: Dict[str, float] = {str(c): float(p) for c, p in zip(classes, probs_arr)}
    for k in FAIL_TYPE_COLS:
        type_probs.setdefault(k, 0.0)

    failure_type = max(type_probs.items(), key=lambda kv: kv[1])[0]

    # simple confidence heuristic
    peaked = max(type_probs[k] for k in FAIL_TYPE_COLS)
    confidence = float(min(1.0, max(0.0, (abs(p_fail - 0.5) * 2.0 * 0.6) + (peaked * 0.4))))

    return p_fail, failure_type, type_probs, confidence
