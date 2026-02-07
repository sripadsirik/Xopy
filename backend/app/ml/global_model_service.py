from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

import joblib
import numpy as np
import pandas as pd


DEFAULT_MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "global_fail_model.joblib"


@dataclass
class GlobalModelResult:
    failure_prob: float
    label: str  # "LOW" | "MED" | "HIGH" | "CRITICAL"
    horizon_days: int = 14


class GlobalFleetModel:
    """
    Loads the global fleet model and predicts 'fail within 14 days' probability
    from DAILY aggregates.

    Expected input is a dict with:
      machine_id, lifespan_class, Type,
      plus daily numeric aggregate fields produced by daily_aggregate().
    """

    def __init__(self, model_path: Path = DEFAULT_MODEL_PATH, horizon_days: int = 14):
        self.model_path = model_path
        self.horizon_days = horizon_days
        self._pipe = None

    def load(self) -> None:
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model not found: {self.model_path}")
        self._pipe = joblib.load(self.model_path)

    def _ensure_loaded(self) -> None:
        if self._pipe is None:
            self.load()

    @staticmethod
    def risk_bucket(p: float) -> str:
        if p >= 0.85:
            return "CRITICAL"
        if p >= 0.65:
            return "HIGH"
        if p >= 0.40:
            return "MED"
        return "LOW"

    def predict_from_daily_row(self, row: Dict) -> GlobalModelResult:
        """
        row: dict with the same columns used in training (minus the label)
        """
        self._ensure_loaded()
        X = pd.DataFrame([row])
        prob = float(self._pipe.predict_proba(X)[:, 1][0])
        return GlobalModelResult(
            failure_prob=prob,
            label=self.risk_bucket(prob),
            horizon_days=self.horizon_days,
        )


def daily_aggregate_from_readings(
    machine_id: str,
    lifespan_class: str,
    Type: str,
    day_index: int,
    readings: pd.DataFrame,
    prev_7d: Optional[pd.DataFrame] = None,
) -> Dict:
    """
    Build the same feature row used in training from the 8 intraday readings.
    readings columns expected:
      Air temperature [K], Process temperature [K],
      Rotational speed [rpm], Torque [Nm], Tool wear [min]

    prev_7d: optional df of previous daily aggregates for diff7 computation.
             If not provided, diff7 features are set to 0.
    """
    row = {
        "machine_id": machine_id,
        "lifespan_class": lifespan_class,
        "Type": Type,
        "day_index": day_index,
        "air_k_mean": float(readings["Air temperature [K]"].mean()),
        "air_k_max": float(readings["Air temperature [K]"].max()),
        "proc_k_mean": float(readings["Process temperature [K]"].mean()),
        "proc_k_max": float(readings["Process temperature [K]"].max()),
        "rpm_mean": float(readings["Rotational speed [rpm]"].mean()),
        "rpm_max": float(readings["Rotational speed [rpm]"].max()),
        "torque_mean": float(readings["Torque [Nm]"].mean()),
        "torque_max": float(readings["Torque [Nm]"].max()),
        "wear_max": float(readings["Tool wear [min]"].max()),
        "wear_min": float(readings["Tool wear [min]"].min()),
    }
    row["wear_delta"] = row["wear_max"] - row["wear_min"]
    row["temp_spread"] = row["proc_k_max"] - row["proc_k_mean"]
    row["torque_spread"] = row["torque_max"] - row["torque_mean"]
    row["rpm_spread"] = row["rpm_max"] - row["rpm_mean"]

    # diff7 features (optional)
    for col in ["proc_k_mean", "torque_mean", "rpm_mean", "wear_max"]:
        key = f"{col}_diff7"
        row[key] = 0.0

    if prev_7d is not None and len(prev_7d) >= 7:
        # expect prev_7d to include columns proc_k_mean, torque_mean, rpm_mean, wear_max
        ref = prev_7d.iloc[-7]
        row["proc_k_mean_diff7"] = row["proc_k_mean"] - float(ref["proc_k_mean"])
        row["torque_mean_diff7"] = row["torque_mean"] - float(ref["torque_mean"])
        row["rpm_mean_diff7"] = row["rpm_mean"] - float(ref["rpm_mean"])
        row["wear_max_diff7"] = row["wear_max"] - float(ref["wear_max"])

    return row
