"""
Option B: 6-month day-by-day simulation dataset.

Generates ONE CSV with:
- 10 machines
- 180 days (approx 6 months)
- 8 readings per day (every 3 hours)
- total rows: 10 * 180 * 8 = 14,400

Also writes a manifest JSON describing machines + generation knobs.

Outputs:
- backend/data/synthetic_fleet_6mo_daily_10_machines.csv
- backend/data/synthetic_fleet_manifest.json

Columns:
- machine_id
- lifespan_class
- is_future
- Type
- day_index (0..179)
- reading_index (0..7)
- date (YYYY-MM-DD)
- timestamp (ISO)
- Air temperature [K]
- Process temperature [K]
- Rotational speed [rpm]
- Torque [Nm]
- Tool wear [min]
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd


# ---- Simulation shape (Option B) ----
N_MACHINES = 10
DAYS = 180
READINGS_PER_DAY = 8  # every 3 hours
TOTAL_ROWS = N_MACHINES * DAYS * READINGS_PER_DAY

# ---- Output files ----
OUT_CSV = Path(__file__).resolve().parents[1] / "data" / "synthetic_fleet_6mo_daily_10_machines.csv"
OUT_MANIFEST = Path(__file__).resolve().parents[1] / "data" / "synthetic_fleet_manifest.json"

BASE_SEED = 1337


@dataclass(frozen=True)
class MachineSpec:
  machine_id: str
  lifespan_class: str  # short|medium|long
  ai4i_type: str       # L|M|H
  seed: int
  is_future: bool


def lifespan_params(cls: str) -> Dict[str, float]:
  # Same philosophy: class controls how quickly things drift within the 6-month window.
  if cls == "short":
    return dict(
      wear_rate=1.35,
      temp_drift_per_day=0.22,     # K/day
      torque_drift_per_day=0.12,   # Nm/day
      shock_prob=0.055,            # per reading
      shock_mag=1.60,
      maintenance_prob_per_day=0.000,
    )
  if cls == "medium":
    return dict(
      wear_rate=0.90,
      temp_drift_per_day=0.14,
      torque_drift_per_day=0.08,
      shock_prob=0.035,
      shock_mag=1.25,
      maintenance_prob_per_day=0.004,  # rare resets
    )
  if cls == "long":
    return dict(
      wear_rate=0.58,
      temp_drift_per_day=0.09,
      torque_drift_per_day=0.05,
      shock_prob=0.020,
      shock_mag=1.05,
      maintenance_prob_per_day=0.008,  # occasional resets
    )
  raise ValueError(f"Unknown lifespan_class: {cls}")


def type_baselines(ai4i_type: str) -> Dict[str, float]:
  if ai4i_type == "L":
    return dict(air_k=298.5, proc_k=308.0, rpm=1400.0, torque=35.0)
  if ai4i_type == "M":
    return dict(air_k=299.0, proc_k=309.5, rpm=1500.0, torque=45.0)
  if ai4i_type == "H":
    return dict(air_k=300.0, proc_k=312.0, rpm=1600.0, torque=55.0)
  raise ValueError(f"Unknown AI4I Type: {ai4i_type}")


def build_specs() -> List[MachineSpec]:
  """
  Required distribution:
    - 2 short
    - 4 medium
    - 2 long
    + future: 1 medium, 1 long

  IDs:
    MCH-S-01, ...
    FUT-M-01, ...
  """
  primary = [
    ("MCH-S-01", "short",  "H", False),
    ("MCH-S-02", "short",  "M", False),

    ("MCH-M-01", "medium", "M", False),
    ("MCH-M-02", "medium", "L", False),
    ("MCH-M-03", "medium", "H", False),
    ("MCH-M-04", "medium", "M", False),

    ("MCH-L-01", "long",   "L", False),
    ("MCH-L-02", "long",   "M", False),
  ]
  future = [
    ("FUT-M-01", "medium", "M", True),
    ("FUT-L-01", "long",   "H", True),
  ]

  seed = BASE_SEED
  specs: List[MachineSpec] = []
  for mid, life, t, is_future in primary + future:
    seed += 1
    specs.append(MachineSpec(mid, life, t, seed, is_future))

  if len(specs) != N_MACHINES:
    raise RuntimeError("Wrong number of machine specs")
  return specs


def generate_machine_timeseries(spec: MachineSpec) -> pd.DataFrame:
  rng = np.random.default_rng(spec.seed)
  p = lifespan_params(spec.lifespan_class)
  b = type_baselines(spec.ai4i_type)

  start_dt = datetime(2026, 1, 1, 0, 0, 0) + timedelta(minutes=(spec.seed % 60))
  start_date = start_dt.date()

  rows = []

  # state variables (evolve over 6 months)
  wear = float(rng.uniform(0, 20))
  air = float(b["air_k"] + rng.normal(0, 0.4))
  proc = float(b["proc_k"] + rng.normal(0, 0.6))
  rpm = float(b["rpm"] + rng.normal(0, 35))
  torque = float(b["torque"] + rng.normal(0, 2.5))

  for day_idx in range(DAYS):
    d = start_date + timedelta(days=day_idx)

    # maintenance reset chance (once per day)
    if rng.random() < p["maintenance_prob_per_day"]:
      wear = max(0.0, wear - float(rng.uniform(12, 40)))
      # small recovery effect after maintenance
      proc -= float(rng.uniform(0.2, 0.8))
      torque -= float(rng.uniform(0.2, 0.8))

    # daily drift
    # distribute drift across readings
    temp_step = p["temp_drift_per_day"] / READINGS_PER_DAY
    torque_step = p["torque_drift_per_day"] / READINGS_PER_DAY

    for r_idx in range(READINGS_PER_DAY):
      ts = datetime(d.year, d.month, d.day, 0, 0, 0) + timedelta(hours=3 * r_idx)
      # keep per-machine offset
      ts = ts + timedelta(minutes=(spec.seed % 60))

      # periodic cycles (weekly + daily)
      week_phase = 2 * math.pi * (day_idx / 7.0)
      day_phase = 2 * math.pi * (r_idx / READINGS_PER_DAY)

      # tool wear increment per reading
      wear_step = max(0.0, (0.12 + rng.normal(0, 0.03)) * p["wear_rate"])
      wear += wear_step

      air += temp_step + rng.normal(0, 0.10)
      proc += (temp_step * 1.25) + rng.normal(0, 0.12)
      torque += torque_step + rng.normal(0, 0.30)
      rpm += rng.normal(0, 8.0)

      # cycles
      air += 0.25 * math.sin(week_phase) + 0.10 * math.cos(day_phase)
      proc += 0.35 * math.sin(week_phase + 0.4) + 0.12 * math.sin(day_phase + 0.2)
      rpm += 18.0 * math.sin(day_phase + 0.5)
      torque += 0.9 * math.sin(day_phase / 1.6)

      # shocks/anomalies per reading
      if rng.random() < p["shock_prob"]:
        shock = float(rng.normal(0, 1.0) * p["shock_mag"])
        proc += abs(shock) * 1.2
        torque += abs(shock) * 2.0
        rpm += shock * 40.0

      # clip to plausible AI4I-ish ranges
      air_c = float(np.clip(air, 295, 320))
      proc_c = float(np.clip(proc, 300, 340))
      rpm_c = float(np.clip(rpm, 1100, 1900))
      torque_c = float(np.clip(torque, 10, 90))
      wear_c = float(np.clip(wear, 0, 350))

      rows.append(
        {
          "machine_id": spec.machine_id,
          "lifespan_class": spec.lifespan_class,
          "is_future": int(spec.is_future),
          "Type": spec.ai4i_type,
          "day_index": day_idx,
          "reading_index": r_idx,
          "date": d.isoformat(),
          "timestamp": ts.isoformat(),
          "Air temperature [K]": round(air_c, 3),
          "Process temperature [K]": round(proc_c, 3),
          "Rotational speed [rpm]": round(rpm_c, 3),
          "Torque [Nm]": round(torque_c, 3),
          "Tool wear [min]": round(wear_c, 3),
        }
      )

  df = pd.DataFrame(rows)
  expected = DAYS * READINGS_PER_DAY
  if len(df) != expected:
    raise RuntimeError(f"{spec.machine_id} produced {len(df)} rows, expected {expected}")
  return df


def write_manifest(specs: List[MachineSpec]) -> None:
  machines = []
  for s in specs:
    machines.append(
      {
        "machine_id": s.machine_id,
        "lifespan_class": s.lifespan_class,
        "ai4i_type": s.ai4i_type,
        "seed": s.seed,
        "is_future": s.is_future,
        "generation_params": lifespan_params(s.lifespan_class),
        "type_baseline": type_baselines(s.ai4i_type),
        "days": DAYS,
        "readings_per_day": READINGS_PER_DAY,
        "rows_per_machine": DAYS * READINGS_PER_DAY,
      }
    )

  manifest = {
    "schema_version": "1.0",
    "created_utc": datetime.utcnow().isoformat() + "Z",
    "dataset_csv": OUT_CSV.name,
    "total_machines": len(specs),
    "days": DAYS,
    "readings_per_day": READINGS_PER_DAY,
    "rows_per_machine": DAYS * READINGS_PER_DAY,
    "total_rows": TOTAL_ROWS,
    "distribution_machines": {
      "short": sum(1 for s in specs if s.lifespan_class == "short"),
      "medium": sum(1 for s in specs if s.lifespan_class == "medium"),
      "long": sum(1 for s in specs if s.lifespan_class == "long"),
      "future": sum(1 for s in specs if s.is_future),
    },
    "machines": machines,
  }

  OUT_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
  OUT_MANIFEST.write_text(json.dumps(manifest, indent=2))
  print(" wrote manifest:", OUT_MANIFEST)


def main() -> None:
  specs = build_specs()
  frames = [generate_machine_timeseries(s) for s in specs]
  full = pd.concat(frames, ignore_index=True)

  # checks
  if len(full) != TOTAL_ROWS:
    raise RuntimeError(f"Expected {TOTAL_ROWS} rows, got {len(full)}")

  rows_per_machine = DAYS * READINGS_PER_DAY
  counts = full.groupby("machine_id").size().to_dict()
  bad = {k: v for k, v in counts.items() if v != rows_per_machine}
  if bad:
    raise RuntimeError(f"Wrong rows per machine: {bad}")

  # machine distribution check
  dist = (
    full[["machine_id", "lifespan_class"]]
    .drop_duplicates()["lifespan_class"]
    .value_counts()
    .to_dict()
  )
  if dist.get("short", 0) != 2 or dist.get("medium", 0) != 5 or dist.get("long", 0) != 3:
    raise RuntimeError(f"Unexpected lifespan distribution: {dist}")

  OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
  full.to_csv(OUT_CSV, index=False)
  print(" wrote CSV:", OUT_CSV)
  print(f"   rows: {len(full)} (expected {TOTAL_ROWS})")
  print(f"   rows/machine: {rows_per_machine}")
  print("   lifespan distribution (machines):", dist)

  write_manifest(specs)


if __name__ == "__main__":
  main()
