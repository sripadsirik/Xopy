from __future__ import annotations
import asyncio
import os
import random
from datetime import datetime, timezone
from typing import Dict, List, Optional

import pandas as pd

from .model_service import ModelArtifacts, predict
from .decision import decide, make_substitutes
from .ws_manager import WSManager

AI4I_COLS = {
    "Type": "Type",
    "Air temperature [K]": "Air temperature [K]",
    "Process temperature [K]": "Process temperature [K]",
    "Rotational speed [rpm]": "Rotational speed [rpm]",
    "Torque [Nm]": "Torque [Nm]",
    "Tool wear [min]": "Tool wear [min]",
}

def _data_path() -> str:
    # backend/data/ai4i2020.csv
    here = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(here)
    return os.path.join(backend_dir, "data", "ai4i2020.csv")

class TelemetrySimulator:
    """
    Samples rows from AI4I 2020 to simulate real-time telemetry per machine.
    Broadcasts combined telemetry + prediction + decision over WebSocket.
    """
    def __init__(
        self,
        artifacts: ModelArtifacts,
        ws: WSManager,
        *,
        num_machines: int = 15,
        interval_sec: float = 1.0,
        seed: int = 42,
        oversample_failures: float = 0.35,  # probability of sampling from failure rows
    ) -> None:
        self.artifacts = artifacts
        self.ws = ws
        self.num_machines = num_machines
        self.interval_sec = interval_sec
        self.seed = seed
        self.oversample_failures = oversample_failures

        self._task: Optional[asyncio.Task] = None
        self._running = False

        random.seed(seed)
        self._df = self._load_df()
        self._df_fail = self._df[self._df["Machine failure"].astype(int) == 1]
        self._machine_ids = [f"M-{i:02d}" for i in range(1, num_machines + 1)]

    def _load_df(self) -> pd.DataFrame:
        path = _data_path()
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"Could not find AI4I dataset at {path}. Put it at backend/data/ai4i2020.csv"
            )
        df = pd.read_csv(path)
        # Validate required cols
        for c in list(AI4I_COLS.values()) + ["Machine failure"]:
            if c not in df.columns:
                raise ValueError(f"Dataset missing required column: {c}")
        return df

    def start(self) -> None:
        if self._task is None:
            self._running = True
            self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except Exception:
                pass
            self._task = None

    def _sample_row(self) -> Dict:
        # Oversample failures for a better demo (more alerts)
        if len(self._df_fail) > 0 and random.random() < self.oversample_failures:
            row = self._df_fail.sample(1).iloc[0]
        else:
            row = self._df.sample(1).iloc[0]
        return row.to_dict()

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    async def _loop(self) -> None:
        while self._running:
            try:
                # If no clients, still sleep lightly
                if await self.ws.count() == 0:
                    await asyncio.sleep(0.25)
                    continue

                machine_id = random.choice(self._machine_ids)
                r = self._sample_row()

                machine_type = str(r[AI4I_COLS["Type"]])
                air = float(r[AI4I_COLS["Air temperature [K]"]])
                proc = float(r[AI4I_COLS["Process temperature [K]"]])
                rpm = float(r[AI4I_COLS["Rotational speed [rpm]"]])
                torque = float(r[AI4I_COLS["Torque [Nm]"]])
                wear = float(r[AI4I_COLS["Tool wear [min]"]])

                p_fail, failure_type, type_probs, confidence = predict(
                    self.artifacts,
                    machine_type=machine_type,
                    air_temp_k=air,
                    process_temp_k=proc,
                    rpm=rpm,
                    torque_nm=torque,
                    tool_wear_min=wear,
                )

                action, reason, categories = decide(p_fail, failure_type)
                substitutes = make_substitutes(categories) if action == "BUY_SUBSTITUTE" else []

                payload = {
                    "machine_id": machine_id,
                    "ts": self._now_iso(),
                    "telemetry": {
                        "type": machine_type,
                        "air_temp_k": air,
                        "process_temp_k": proc,
                        "rpm": rpm,
                        "torque_nm": torque,
                        "tool_wear_min": wear,
                    },
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

                await self.ws.broadcast_json(payload)

            except Exception as e:
                # Don't silently die — print the error and keep running
                print("[SIM ERROR]", repr(e))

            await asyncio.sleep(self.interval_sec)