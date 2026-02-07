from __future__ import annotations
from pydantic import BaseModel, Field

class TelemetryIn(BaseModel):
    machine_id: str = Field(..., description="Unique machine identifier")
    type: str = Field(..., pattern="^(L|M|H)$", description="Machine type/class: L/M/H")
    air_temp_k: float = Field(..., ge=0)
    process_temp_k: float = Field(..., ge=0)
    rpm: float = Field(..., ge=0)
    torque_nm: float = Field(..., ge=0)
    tool_wear_min: float = Field(..., ge=0)
    ts: str | None = Field(None, description="Optional ISO timestamp")

class PredictionOut(BaseModel):
    failure_prob: float = Field(..., ge=0, le=1)
    failure_type: str
    failure_type_probs: dict[str, float]
    confidence: float = Field(..., ge=0, le=1)

class DecisionOut(BaseModel):
    action: str  # BUY_NOW | BUY_SUBSTITUTE | MONITOR
    reason: str
    recommended_categories: list[str]
    substitutes: list[dict] = Field(default_factory=list)

class PredictResponse(BaseModel):
    machine_id: str
    prediction: PredictionOut
    decision: DecisionOut
