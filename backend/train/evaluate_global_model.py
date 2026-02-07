from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    precision_recall_curve,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import GroupShuffleSplit

# Paths
DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "synthetic_fleet_6mo_daily_10_machines.csv"
MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "global_fail_model.joblib"

# MUST match training
HORIZON_DAYS = 14


def daily_aggregate(df: pd.DataFrame) -> pd.DataFrame:
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
    daily["wear_delta"] = daily["wear_max"] - daily["wear_min"]
    daily["temp_spread"] = daily["proc_k_max"] - daily["proc_k_mean"]
    daily["torque_spread"] = daily["torque_max"] - daily["torque_mean"]
    daily["rpm_spread"] = daily["rpm_max"] - daily["rpm_mean"]

    daily = daily.sort_values(["machine_id", "day_index"]).reset_index(drop=True)

    for col in ["proc_k_mean", "torque_mean", "rpm_mean", "wear_max"]:
        daily[f"{col}_diff7"] = daily.groupby("machine_id")[col].diff(7).fillna(0.0)

    return daily


def thresholds(lifespan_class: str):
    # MUST match training if you used weak-supervision labels
    if lifespan_class == "short":
        return dict(wear_hi=210, proc_hi=327, torque_hi=65, rpm_hi=1750)
    if lifespan_class == "medium":
        return dict(wear_hi=240, proc_hi=330, torque_hi=70, rpm_hi=1800)
    return dict(wear_hi=270, proc_hi=333, torque_hi=75, rpm_hi=1850)  # long


def critical_day(daily: pd.DataFrame) -> np.ndarray:
    crit = np.zeros(len(daily), dtype=int)
    for i, r in daily.iterrows():
        t = thresholds(str(r["lifespan_class"]))
        s = 0
        if r["wear_max"] >= t["wear_hi"]: s += 1
        if r["proc_k_max"] >= t["proc_hi"]: s += 1
        if r["torque_max"] >= t["torque_hi"]: s += 1
        if r["rpm_max"] >= t["rpm_hi"]: s += 1
        crit[i] = 1 if s >= 3 else 0
    return crit


def label_fail_within_k(daily: pd.DataFrame, k: int = HORIZON_DAYS) -> np.ndarray:
    crit = critical_day(daily)
    y = np.zeros(len(daily), dtype=int)
    for mid, idxs in daily.groupby("machine_id").indices.items():
        idxs = np.array(list(idxs))
        idxs = idxs[np.argsort(daily.loc[idxs, "day_index"].values)]
        for j, row_idx in enumerate(idxs):
            lookahead = idxs[j + 1 : j + 1 + k]
            y[row_idx] = 1 if (len(lookahead) and crit[lookahead].max() == 1) else 0
    return y


def pick_threshold_by_f1(y_true: np.ndarray, y_prob: np.ndarray) -> float:
    thresholds = np.linspace(0.05, 0.95, 19)
    best_t, best_f1 = 0.5, -1.0
    for t in thresholds:
        y_pred = (y_prob >= t).astype(int)
        tp = ((y_pred == 1) & (y_true == 1)).sum()
        fp = ((y_pred == 1) & (y_true == 0)).sum()
        fn = ((y_pred == 0) & (y_true == 1)).sum()
        prec = tp / (tp + fp + 1e-9)
        rec = tp / (tp + fn + 1e-9)
        f1 = 2 * prec * rec / (prec + rec + 1e-9)
        if f1 > best_f1:
            best_f1, best_t = f1, t
    return float(best_t)


def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Missing dataset: {DATA_PATH}")
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Missing model: {MODEL_PATH}")

    print("[eval] loading data + model...")
    raw = pd.read_csv(DATA_PATH)
    model = joblib.load(MODEL_PATH)

    print("[eval] aggregating to daily rows...")
    daily = daily_aggregate(raw)

    print("[eval] generating labels (same method as training)...")
    y = label_fail_within_k(daily, HORIZON_DAYS)
    daily["y"] = y

    # drop last horizon days per machine (label not meaningful at end)
    max_day = daily.groupby("machine_id")["day_index"].transform("max")
    daily = daily[daily["day_index"] <= (max_day - HORIZON_DAYS)].reset_index(drop=True)

    y = daily["y"].values.astype(int)
    groups = daily["machine_id"].values
    X = daily.drop(columns=["y"])

    # Group split by machine_id (fairer)
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.3, random_state=42)
    train_idx, test_idx = next(splitter.split(X, y, groups=groups))
    X_test, y_test = X.iloc[test_idx], y[test_idx]

    print("[eval] predicting...")
    y_prob = model.predict_proba(X_test)[:, 1]

    # Metrics
    auc = roc_auc_score(y_test, y_prob) if len(np.unique(y_test)) > 1 else None
    ap = average_precision_score(y_test, y_prob) if len(np.unique(y_test)) > 1 else None

    # Pick a threshold (don’t blindly use 0.5)
    t = pick_threshold_by_f1(y_test, y_prob)
    y_pred = (y_prob >= t).astype(int)

    acc = accuracy_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)

    print("\n===== Global Model Evaluation =====")
    print(f"Horizon days: {HORIZON_DAYS}")
    print(f"Test rows: {len(y_test)}")
    print(f"ROC AUC: {auc}")
    print(f"PR AUC (Avg Precision): {ap}")
    print(f"Chosen threshold (best F1 grid): {t:.2f}")
    print(f"Accuracy: {acc:.3f}")
    print("Confusion matrix [[TN, FP],[FN, TP]]:")
    print(cm)

    print("\nClassification report:")
    print(classification_report(y_test, y_pred, digits=3))

    # Save a small report file too
    out = Path(__file__).resolve().parents[1] / "models" / "global_eval_report.json"
    report = {
        "horizon_days": HORIZON_DAYS,
        "test_rows": int(len(y_test)),
        "roc_auc": None if auc is None else float(auc),
        "avg_precision": None if ap is None else float(ap),
        "threshold": float(t),
        "accuracy": float(acc),
        "confusion_matrix": cm.tolist(),
    }
    out.write_text(json.dumps(report, indent=2))
    print(f"\n[eval] wrote report: {out}")


if __name__ == "__main__":
    main()
