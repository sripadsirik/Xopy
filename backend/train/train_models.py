import json
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier


# -----------------------------
# Config
# -----------------------------
@dataclass
class TrainConfig:
    data_path: str = os.path.join("..", "data", "ai4i2020.csv")
    out_dir: str = os.path.join("..", "models")
    random_state: int = 42
    test_size: float = 0.20
    # For demo/hackathon: weight failures to avoid predicting "no failure" always
    class_weight_fail: str | Dict[int, float] = "balanced"


FAIL_TYPE_COLS = ["TWF", "HDF", "PWF", "OSF", "RNF"]
FEATURE_COLS = [
    "Type",
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
]


def _ensure_dirs(cfg: TrainConfig) -> None:
    os.makedirs(cfg.out_dir, exist_ok=True)


def load_and_validate(cfg: TrainConfig) -> pd.DataFrame:
    if not os.path.exists(cfg.data_path):
        raise FileNotFoundError(
            f"Could not find dataset at: {cfg.data_path}\n"
            f"Expected it at XOPY/backend/data/ai4i2020.csv"
        )
    df = pd.read_csv(cfg.data_path)

    # Common AI4I columns include a leading "UDI" and "Product ID". We ignore them.
    missing = [c for c in FEATURE_COLS + ["Machine failure"] + FAIL_TYPE_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing expected columns: {missing}\nFound columns: {list(df.columns)}")

    return df


def make_preprocessor() -> ColumnTransformer:
    cat_cols = ["Type"]
    num_cols = [c for c in FEATURE_COLS if c != "Type"]

    cat_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    num_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    return ColumnTransformer(
        transformers=[
            ("cat", cat_pipe, cat_cols),
            ("num", num_pipe, num_cols),
        ],
        remainder="drop",
    )


def build_failure_model(cfg: TrainConfig) -> Pipeline:
    """
    Binary classifier: Machine failure (0/1)
    Hackathon-safe baseline: Logistic Regression (fast, explainable, outputs calibrated-ish probs).
    """
    preprocess = make_preprocessor()
    clf = LogisticRegression(
        max_iter=2000,
        class_weight=cfg.class_weight_fail,
        solver="lbfgs",
    )
    return Pipeline(steps=[("preprocess", preprocess), ("clf", clf)])


def build_failure_type_model(cfg: TrainConfig) -> Pipeline:
    """
    Multiclass classifier for failure type among {TWF,HDF,PWF,OSF,RNF}.
    We train ONLY on rows where Machine failure == 1.
    Model: RandomForest (robust, no need for perfect scaling assumptions).
    """
    preprocess = make_preprocessor()
    clf = RandomForestClassifier(
        n_estimators=400,
        random_state=cfg.random_state,
        class_weight="balanced_subsample",
        n_jobs=-1,
        max_depth=None,
        min_samples_leaf=2,
    )
    return Pipeline(steps=[("preprocess", preprocess), ("clf", clf)])


def compute_binary_metrics(y_true: np.ndarray, y_prob: np.ndarray, y_pred: np.ndarray) -> Dict:
    auc = None
    try:
        auc = roc_auc_score(y_true, y_prob)
    except Exception:
        pass

    p, r, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="binary", zero_division=0)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(p),
        "recall": float(r),
        "f1": float(f1),
        "roc_auc": float(auc) if auc is not None else None,
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
        "report": classification_report(y_true, y_pred, zero_division=0),
    }


def compute_multiclass_metrics(y_true: np.ndarray, y_pred: np.ndarray, labels: list[str]) -> Dict:
    acc = accuracy_score(y_true, y_pred)
    f1_macro = f1_score(y_true, y_pred, average="macro", zero_division=0)
    f1_weighted = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    return {
        "accuracy": float(acc),
        "f1_macro": float(f1_macro),
        "f1_weighted": float(f1_weighted),
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=labels).tolist(),
        "labels": labels,
        "report": classification_report(y_true, y_pred, labels=labels, zero_division=0),
    }


def derive_failure_type_label(df: pd.DataFrame) -> pd.Series:
    """
    Convert one-hot failure flags into a single label.
    Assumes at most one of TWF/HDF/PWF/OSF/RNF is 1 for failure rows (true in AI4I dataset).
    """
    arr = df[FAIL_TYPE_COLS].values
    idx = arr.argmax(axis=1)
    # If a row had all zeros (shouldn't happen for failure rows), label as "RNF" fallback
    # but we’ll filter to failure rows anyway.
    labels = [FAIL_TYPE_COLS[i] for i in idx]
    return pd.Series(labels, index=df.index)


def train_all(cfg: TrainConfig) -> Tuple[Dict, Dict]:
    df = load_and_validate(cfg)

    # Add a helpful engineered feature (optional). Helps models a bit.
    df = df.copy()
    df["Temp delta [K]"] = df["Process temperature [K]"] - df["Air temperature [K]"]

    # Extend features with engineered feature
    features = FEATURE_COLS + ["Temp delta [K]"]

    X = df[features]
    y_fail = df["Machine failure"].astype(int).values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_fail, test_size=cfg.test_size, random_state=cfg.random_state, stratify=y_fail
    )

    # ---- 1) Train binary failure model
    fail_model = build_failure_model(cfg)
    fail_model.fit(X_train, y_train)

    y_prob = fail_model.predict_proba(X_test)[:, 1]
    y_pred = (y_prob >= 0.5).astype(int)
    fail_metrics = compute_binary_metrics(y_test, y_prob, y_pred)

    # ---- 2) Train failure-type model on failure rows only
    df_fail = df[df["Machine failure"].astype(int) == 1].copy()
    df_fail["FailureType"] = derive_failure_type_label(df_fail)

    X2 = df_fail[features]
    y2 = df_fail["FailureType"].values

    X2_train, X2_test, y2_train, y2_test = train_test_split(
        X2, y2, test_size=cfg.test_size, random_state=cfg.random_state, stratify=y2
    )

    type_model = build_failure_type_model(cfg)
    type_model.fit(X2_train, y2_train)

    y2_pred = type_model.predict(X2_test)
    type_metrics = compute_multiclass_metrics(y2_test, y2_pred, labels=FAIL_TYPE_COLS)

    # Save artifacts
    _ensure_dirs(cfg)
    joblib.dump(fail_model, os.path.join(cfg.out_dir, "fail_model.joblib"))
    joblib.dump(type_model, os.path.join(cfg.out_dir, "type_model.joblib"))

    # Save metadata/metrics for teammates + demo
    meta = {
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "random_state": cfg.random_state,
        "test_size": cfg.test_size,
        "feature_columns": features,
        "failure_type_labels": FAIL_TYPE_COLS,
        "binary_threshold_default": 0.5,
        "notes": [
            "Binary model predicts Machine failure.",
            "Type model predicts which failure type, trained only on failure rows.",
            "Temp delta [K] = Process temperature - Air temperature is an engineered feature.",
        ],
    }
    with open(os.path.join(cfg.out_dir, "model_meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    with open(os.path.join(cfg.out_dir, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump({"failure_model": fail_metrics, "type_model": type_metrics}, f, indent=2)

    return fail_metrics, type_metrics


if __name__ == "__main__":
    cfg = TrainConfig()
    print(f"Training using data: {cfg.data_path}")
    print(f"Saving models to: {cfg.out_dir}")

    fail_metrics, type_metrics = train_all(cfg)

    print("\n=== Failure Model Metrics (Binary) ===")
    print(fail_metrics["report"])
    print("Confusion Matrix:", fail_metrics["confusion_matrix"])
    print("ROC AUC:", fail_metrics["roc_auc"])

    print("\n=== Failure Type Model Metrics (Multiclass) ===")
    print(type_metrics["report"])
    print("Confusion Matrix:", type_metrics["confusion_matrix"])

    print("\nDone. Artifacts saved to ../models/")
