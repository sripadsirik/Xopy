"""
Generate ONE synthetic fleet dataset CSV containing 10 machines × 1,000 points each (10,000 rows total)
AND a manifest JSON describing each machine.

Requirements:
- unique machine_id per machine
- exactly 1,000 data points per machine
- lifespan_class column
- distribution:
  - 2 short
  - 4 medium
  - 2 long
  - +2 future machines: 1 medium, 1 long
- programmatic generation only

Outputs:
- backend/data/synthetic_fleet_10_machines.csv
- backend/data/synthetic_fleet_manifest.json

Columns (AI4I-aligned):
- machine_id
- lifespan_class
- Type
- Air temperature [K]
- Process temperature [K]
- Rotational speed [rpm]
- Torque [Nm]
- Tool wear [min]
- timestamp
"""

from __future__ import annotations

import json
import math
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd


N_MACHINES = 10
POINTS_PER_MACHINE = 1000
TOTAL_ROWS = N_MACHINES * POINTS_PER_MACHINE

BASE_SEED = 1337

OUT_CSV = Path(__file__).resolve().parents[1] / "data" / "synthetic_fleet_10_machines.csv"
OUT_MANIFEST = Path(__file__).resolve().parents[1] / "data" / "synthetic_fleet_manifest.json"


@dataclass(frozen=True)
class MachineSpec:
    machine_id: str
    lifespan_class: str  # "short" | "medium" | "long"
    ai4i_type: str       # "L" | "M" | "H"
    seed: int
    is_future: bool


def lifespan_params(cls: str) -> Dict[str, float]:
    """
    All machines have 1,000 rows, but lifespan_class changes degradation rate across those 1,000 rows.
    """
    if cls == "short":
        return dict(
            wear_rate=1.35,
            temp_drift=0.020,
            torque_drift=0.011,
            shock_prob=0.030,
            shock_mag=1.60,
            maintenance_prob=0.000,
        )
    if cls == "medium":
        return dict(
            wear_rate=0.90,
            temp_drift=0.013,
            torque_drift=0.007,
            shock_prob=0.020,
            shock_mag=1.25,
            maintenance_prob=0.001,
        )
    if cls == "long":
        return dict(
            wear_rate=0.58,
            temp_drift=0.008,
            torque_drift=0.004,
            shock_prob=0.012,
            shock_mag=1.05,
            maintenance_prob=0.002,
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


def generate_machine_df(spec: MachineSpec, n: int = POINTS_PER_MACHINE) -> pd.DataFrame:
    rng = np.random.default_rng(spec.seed)
    p = lifespan_params(spec.lifespan_class)
    b = type_baselines(spec.ai4i_type)

    # Synthetic timestamps (10s interval) — unique-ish per machine by offsetting start time
    start = datetime(2026, 2, 1, 9, 0, 0) + timedelta(minutes=(spec.seed % 60))
    times = [start + timedelta(seconds=10 * i) for i in range(n)]

    wear = np.zeros(n, dtype=float)
    air = np.zeros(n, dtype=float)
    proc = np.zeros(n, dtype=float)
    rpm = np.zeros(n, dtype=float)
    torque = np.zeros(n, dtype=float)

    wear[0] = rng.uniform(0, 20)
    air[0] = b["air_k"] + rng.normal(0, 0.4)
    proc[0] = b["proc_k"] + rng.normal(0, 0.6)
    rpm[0] = b["rpm"] + rng.normal(0, 35)
    torque[0] = b["torque"] + rng.normal(0, 2.5)

    for i in range(1, n):
        # Occasional "maintenance reset"
        if rng.random() < p["maintenance_prob"]:
            wear[i] = max(0.0, wear[i - 1] - rng.uniform(12, 40))
        else:
            wear_step = max(0.0, 0.12 + rng.normal(0, 0.03)) * p["wear_rate"]
            wear[i] = wear[i - 1] + wear_step

        # Drift + noise
        air[i] = air[i - 1] + p["temp_drift"] + rng.normal(0, 0.10)
        proc[i] = proc[i - 1] + (p["temp_drift"] * 1.25) + rng.normal(0, 0.12)
        torque[i] = torque[i - 1] + p["torque_drift"] + rng.normal(0, 0.30)
        rpm[i] = rpm[i - 1] + rng.normal(0, 8.0)

        # Periodic pattern (adds realism)
        phase = 2 * math.pi * (i / 200.0)
        air[i] += 0.35 * math.sin(phase) + 0.15 * math.cos(phase / 2)
        proc[i] += 0.50 * math.sin(phase + 0.4)
        rpm[i] += 25.0 * math.sin(phase / 1.7)
        torque[i] += 1.2 * math.sin(phase / 2.4)

        # Shocks/anomalies
        if rng.random() < p["shock_prob"]:
            shock = rng.normal(0, 1.0) * p["shock_mag"]
            proc[i] += abs(shock) * 1.2
            torque[i] += abs(shock) * 2.0
            rpm[i] += shock * 40.0

    # Clip to plausible ranges (AI4I-ish)
    air = np.clip(air, 295, 320)
    proc = np.clip(proc, 300, 340)
    rpm = np.clip(rpm, 1100, 1900)
    torque = np.clip(torque, 10, 90)
    wear = np.clip(wear, 0, 350)

    df = pd.DataFrame(
        {
            "machine_id": spec.machine_id,
            "lifespan_class": spec.lifespan_class,
            "Type": spec.ai4i_type,
            "Air temperature [K]": np.round(air, 3),
            "Process temperature [K]": np.round(proc, 3),
            "Rotational speed [rpm]": np.round(rpm, 3),
            "Torque [Nm]": np.round(torque, 3),
            "Tool wear [min]": np.round(wear, 3),
            "timestamp": [t.isoformat() for t in times],
        }
    )
    if len(df) != n:
        raise RuntimeError("Wrong row count generated for machine.")
    return df


def build_specs() -> List[MachineSpec]:
    """
    10 machine specs with required distribution:
      - short: 2
      - medium: 5 (4 + 1 future)
      - long: 3 (2 + 1 future)
    """
    specs: List[MachineSpec] = []

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
    for mid, life, t, is_future in primary + future:
        seed += 1
        specs.append(MachineSpec(machine_id=mid, lifespan_class=life, ai4i_type=t, seed=seed, is_future=is_future))

    if len(specs) != N_MACHINES:
        raise RuntimeError("Incorrect number of machine specs built.")
    return specs


def write_manifest(specs: List[MachineSpec]) -> None:
    """
    Manifest captures machine metadata + generation knobs so the fleet simulator can load it later.
    """
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
                "points": POINTS_PER_MACHINE,
            }
        )

    manifest = {
        "schema_version": "1.0",
        "created_utc": datetime.utcnow().isoformat() + "Z",
        "dataset_csv": str(OUT_CSV.name),
        "total_machines": len(specs),
        "points_per_machine": POINTS_PER_MACHINE,
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
    print(" Wrote manifest:", OUT_MANIFEST)


def main() -> None:
    specs = build_specs()

    frames: List[pd.DataFrame] = []
    for spec in specs:
        frames.append(generate_machine_df(spec, POINTS_PER_MACHINE))

    full = pd.concat(frames, ignore_index=True)

    # Safety checks
    if len(full) != TOTAL_ROWS:
        raise RuntimeError(f"Expected {TOTAL_ROWS} rows, got {len(full)}")

    counts = full.groupby("machine_id").size().to_dict()
    bad = {k: v for k, v in counts.items() if v != POINTS_PER_MACHINE}
    if bad:
        raise RuntimeError(f"Some machines do not have {POINTS_PER_MACHINE} rows: {bad}")

    # Check lifespan machine distribution
    dist = full[["machine_id", "lifespan_class"]].drop_duplicates()["lifespan_class"].value_counts().to_dict()
    # Should be: short=2, medium=5 (4+1 future), long=3 (2+1 future)
    if dist.get("short", 0) != 2 or dist.get("medium", 0) != 5 or dist.get("long", 0) != 3:
        raise RuntimeError(f"Unexpected lifespan machine distribution: {dist}")

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    full.to_csv(OUT_CSV, index=False)

    print(" Wrote synthetic fleet CSV:", OUT_CSV)
    print(f"   rows: {len(full)} (expected {TOTAL_ROWS})")
    print("   machines:", ", ".join(sorted(counts.keys())))
    print("   lifespan distribution (machines):", dist)

    write_manifest(specs)


if __name__ == "__main__":
    main()
