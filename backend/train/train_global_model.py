from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import (
    average_precision_score,
    roc_auc_score,
    precision_recall_fscore_support,
    confusion_matrix,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


# ---- Paths / constants ----
DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "synthetic_fleet_6mo_daily_10_machines.csv"
OUT_DIR = Path(__file__).resolve().parents[1] / "models"
OUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = OUT_DIR / "global_fail_model.joblib"
META_PATH = OUT_DIR / "global_model_meta.json"
METRICS_PATH = OUT_DIR / "global_metrics.json"

# Prediction horizon (days)
HORIZON_DAYS = 14


@dataclass(frozen=True)
class Thresholds:
    wear_hi: float
    proc_temp_hi: float
    torque_hi: float
    rpm_hi: float


# Lifespan-aware “critical day” thresholds (weak supervision)
# These are just for generating labels on synthetic data.
THRESHOLDS: Dict[str, Thresholds] = {
    "short": Thresholds(wear_hi=210, proc_temp_hi=327, torque_hi=65, rpm_hi=1750),
    "medium": Thresholds(wear_hi=240, proc_temp_hi=330, torque_hi=70, rpm_hi=1800),
    "long": Thresholds(wear_hi=270, proc_temp_hi=333, torque_hi=75, rpm_hi=1850),
}


def load_raw(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")
    df = pd.read_csv(path)
    required = {
        "machine_id", "lifespan_class", "Type",
        "day_index", "reading_index",
        "Air temperature [K]",
        "Process temperature [K]",
        "Rotational speed [rpm]",
        "Torque [Nm]",
        "Tool wear [min]",
        "timestamp",
    }
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Dataset missing columns: {sorted(missing)}")
    return df


def daily_aggregate(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert per-reading rows to per-machine-day rows.
    """
    grp = df.groupby(["machine_id", "lifespan_class", "Type", "day_index"], as_index=False)

    daily = grp.agg(
        air_k_mean=("Air temperature [K]", "mean"),
        air_k_max=("Air temperature [K]", "max"),
        proc_k_mean=("Process temperature [K]", "mean"),
        proc_k_max=("Process temperature [K]", "max"),
        rpm_mean=("Rotational speed [rpm]", "mean"),
        rpm_max=("Rotational speed [rpm]", "max"),
        torque_mean=("Torque [Nm]", "mean"),
        torque_max=("Torque [Nm]", "max"),
        wear_max=("Tool wear [min]", "max"),
        wear_min=("Tool wear [min]", "min"),
    )

    # simple derived features
    daily["wear_delta"] = daily["wear_max"] - daily["wear_min"]
    daily["temp_spread"] = daily["proc_k_max"] - daily["proc_k_mean"]
    daily["torque_spread"] = daily["torque_max"] - daily["torque_mean"]
    daily["rpm_spread"] = daily["rpm_max"] - daily["rpm_mean"]

    # sort to compute trends
    daily = daily.sort_values(["machine_id", "day_index"]).reset_index(drop=True)

    # 7-day slopes/changes (cheap trend signal)
    for col in ["proc_k_mean", "torque_mean", "rpm_mean", "wear_max"]:
        daily[f"{col}_diff7"] = daily.groupby("machine_id")[col].diff(7)

    # fill early NaNs from diff
    diff_cols = [c for c in daily.columns if c.endswith("_diff7")]
    daily[diff_cols] = daily[diff_cols].fillna(0.0)

    return daily


def mark_critical_days(daily: pd.DataFrame) -> pd.Series:
    """
    A “critical day” is a day with multiple stressors exceeding lifespan-aware thresholds.
    """
    crit = np.zeros(len(daily), dtype=int)

    for i, row in daily.iterrows():
        life = str(row["lifespan_class"])
        t = THRESHOLDS.get(life, THRESHOLDS["medium"])

        stressors = 0
        if row["wear_max"] >= t.wear_hi:
            stressors += 1
        if row["proc_k_max"] >= t.proc_temp_hi:
            stressors += 1
        if row["torque_max"] >= t.torque_hi:
            stressors += 1
        if row["rpm_max"] >= t.rpm_hi:
            stressors += 1

        # 3+ stressors = critical day
        crit[i] = 1 if stressors >= 3 else 0

    return pd.Series(crit, index=daily.index, name="critical_day")


def label_fail_within_horizon(daily: pd.DataFrame, horizon_days: int = HORIZON_DAYS) -> pd.Series:
    """
    Label y=1 if there exists a critical day within the next K days (including tomorrow…K).
    """
    crit = mark_critical_days(daily).values
    y = np.zeros(len(daily), dtype=int)

    # process per machine to respect timelines
    for mid, idxs in daily.groupby("machine_id").indices.items():
        idxs = np.array(list(idxs))
        # idxs are in daily order already because we sorted earlier, but ensure
        idxs = idxs[np.argsort(daily.loc[idxs, "day_index"].values)]

        # for each position, look ahead horizon
        for j, row_idx in enumerate(idxs):
            lookahead = idxs[j + 1 : j + 1 + horizon_days]
            if len(lookahead) == 0:
                y[row_idx] = 0
            else:
                y[row_idx] = 1 if crit[lookahead].max() == 1 else 0

    return pd.Series(y, index=daily.index, name=f"fail_within_{horizon_days}d")


def build_pipeline() -> Pipeline:
    cat_features = ["machine_id", "lifespan_class", "Type"]
    num_features = [
        "air_k_mean", "air_k_max",
        "proc_k_mean", "proc_k_max",
        "rpm_mean", "rpm_max",
        "torque_mean", "torque_max",
        "wear_max", "wear_delta",
        "temp_spread", "torque_spread", "rpm_spread",
        "proc_k_mean_diff7", "torque_mean_diff7", "rpm_mean_diff7", "wear_max_diff7",
    ]

    pre = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat_features),
            ("num", "passthrough", num_features),
        ],
        remainder="drop",
    )

    # fast, strong baseline; outputs probabilities after calibration
    base_clf = HistGradientBoostingClassifier(
        max_depth=4,
        learning_rate=0.08,
        max_iter=250,
        random_state=42,
    )

    # Calibrate for better-looking “risk %”
    clf = CalibratedClassifierCV(base_clf, method="isotonic", cv=3)

    return Pipeline([("pre", pre), ("clf", clf)])


def evaluate(y_true: np.ndarray, y_prob: np.ndarray, threshold: float = 0.5) -> Dict:
    y_pred = (y_prob >= threshold).astype(int)
    pr, rc, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="binary", zero_division=0)
    cm = confusion_matrix(y_true, y_pred).tolist()

    metrics = {
        "roc_auc": float(roc_auc_score(y_true, y_prob)) if len(np.unique(y_true)) > 1 else None,
        "avg_precision": float(average_precision_score(y_true, y_prob)) if len(np.unique(y_true)) > 1 else None,
        "precision": float(pr),
        "recall": float(rc),
        "f1": float(f1),
        "confusion_matrix": cm,
        "threshold": float(threshold),
    }
    return metrics


def main() -> None:
    print(f"[train] loading: {DATA_PATH}")
    raw = load_raw(DATA_PATH)

    print("[train] aggregating to daily features...")
    daily = daily_aggregate(raw)

    print("[train] creating labels (weak supervision)...")
    y = label_fail_within_horizon(daily, horizon_days=HORIZON_DAYS)
    daily = daily.copy()
    daily[y.name] = y

    # Drop last horizon days per machine (label is less meaningful there)
    max_day = daily.groupby("machine_id")["day_index"].transform("max")
    daily = daily[daily["day_index"] <= (max_day - HORIZON_DAYS)].reset_index(drop=True)
    y = daily[y.name].astype(int).values

    # Train/test split by machine_id to avoid memorizing machine identity
    groups = daily["machine_id"].values
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.3, random_state=42)
    train_idx, test_idx = next(splitter.split(daily, y, groups=groups))

    train = daily.iloc[train_idx].reset_index(drop=True)
    test = daily.iloc[test_idx].reset_index(drop=True)

    X_train = train.drop(columns=[f"fail_within_{HORIZON_DAYS}d"])
    y_train = train[f"fail_within_{HORIZON_DAYS}d"].astype(int).values

    X_test = test.drop(columns=[f"fail_within_{HORIZON_DAYS}d"])
    y_test = test[f"fail_within_{HORIZON_DAYS}d"].astype(int).values

    pipe = build_pipeline()

    print(f"[train] fitting global model (horizon={HORIZON_DAYS}d)...")
    pipe.fit(X_train, y_train)

    print("[train] evaluating...")
    prob = pipe.predict_proba(X_test)[:, 1]
    metrics = evaluate(y_test, prob, threshold=0.5)

    # Save artifacts
    joblib.dump(pipe, MODEL_PATH)

    meta = {
        "schema_version": "1.0",
        "dataset": str(DATA_PATH.name),
        "horizon_days": HORIZON_DAYS,
        "features": {
            "categorical": ["machine_id", "lifespan_class", "Type"],
            "notes": "Numeric daily aggregates + diff7 trends are computed in training/inference the same way.",
        },
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "machines_train": sorted(train["machine_id"].unique().tolist()),
        "machines_test": sorted(test["machine_id"].unique().tolist()),
    }

    META_PATH.write_text(json.dumps(meta, indent=2))
    METRICS_PATH.write_text(json.dumps(metrics, indent=2))

    print(f"[train] saved model: {MODEL_PATH}")
    print(f"[train] saved meta:  {META_PATH}")
    print(f"[train] saved metrics:{METRICS_PATH}")
    print(f"[train] metrics: {json.dumps(metrics, indent=2)}")


if __name__ == "__main__":
    main()
