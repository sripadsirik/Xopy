from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Tuple

FAILURE_TYPE_TO_CATEGORIES: Dict[str, List[str]] = {
    "TWF": ["Cutting Tools", "Tooling Inserts", "Tool Holders"],
    "HDF": ["Cooling Fans", "Ventilation", "Filters"],
    "PWF": ["Fuses", "Relays", "Power Supplies", "Motor Starters"],
    "OSF": ["Bearings", "Couplings", "Belts", "Gearboxes"],
    "RNF": ["Preventive Maintenance Kits", "Lubricants", "Sensors & Monitoring"],
}

@dataclass(frozen=True)
class DecisionThresholds:
    buy_now: float = 0.75
    consider_substitute: float = 0.45

def decide(p_fail: float, failure_type: str, thresholds: DecisionThresholds | None = None) -> Tuple[str, str, List[str]]:
    th = thresholds or DecisionThresholds()
    categories = FAILURE_TYPE_TO_CATEGORIES.get(failure_type, ["General MRO Supplies"])

    if p_fail >= th.buy_now:
        return "BUY_NOW", f"High failure risk (p={p_fail:.2f}). Order now to prevent downtime.", categories

    if p_fail >= th.consider_substitute:
        return "BUY_SUBSTITUTE", f"Moderate failure risk (p={p_fail:.2f}). Consider substitutes if lead time is long.", categories

    return "MONITOR", f"Low failure risk (p={p_fail:.2f}). Monitor and re-check soon.", categories

def make_substitutes(categories: List[str]) -> List[dict]:
    subs = []
    for i, cat in enumerate(categories[:2], start=1):
        subs.append({
            "name": f"Substitute Option {i}",
            "category": cat,
            "availability": ["In Stock", "Limited", "Backorder"][i % 3],
            "lead_time_days": [1, 3, 7][i % 3],
            "risk_reduction": [0.20, 0.12, 0.08][i % 3],
        })
    return subs
