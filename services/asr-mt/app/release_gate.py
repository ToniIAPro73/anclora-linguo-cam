from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from typing import Any


@dataclass(frozen=True)
class ReleaseGateThresholds:
    min_samples: int = 10
    adequacy_mean: float = 4.0
    fluency_mean: float = 4.0
    caption_stability_mean: float = 3.8
    comprehension_success_pct: float = 90.0
    ttfc_ms_p95: int = 1500
    caption_lag_ms_p95: int = 1800


def _numbers(samples: list[dict[str, Any]], key: str) -> list[float]:
    values: list[float] = []
    for sample in samples:
        value = sample.get(key)
        if isinstance(value, (int, float)):
            values.append(float(value))
    return values


def evaluate_release_gate(
    samples: list[dict[str, Any]],
    thresholds: ReleaseGateThresholds = ReleaseGateThresholds(),
) -> dict[str, Any]:
    if len(samples) < thresholds.min_samples:
        return {
            "status": "INSUFFICIENT_DATA",
            "sample_count": len(samples),
            "required_samples": thresholds.min_samples,
            "checks": {},
        }

    adequacy = _numbers(samples, "adequacy")
    fluency = _numbers(samples, "fluency")
    stability = _numbers(samples, "caption_stability")
    comprehension = _numbers(samples, "comprehension_success")
    ttfc = _numbers(samples, "ttfc_ms_p95")
    lag = _numbers(samples, "caption_lag_ms_p95")

    checks = {
        "adequacy_mean": bool(adequacy) and mean(adequacy) >= thresholds.adequacy_mean,
        "fluency_mean": bool(fluency) and mean(fluency) >= thresholds.fluency_mean,
        "caption_stability_mean": bool(stability) and mean(stability) >= thresholds.caption_stability_mean,
        "comprehension_success_pct": bool(comprehension) and mean(comprehension) >= thresholds.comprehension_success_pct,
        "ttfc_ms_p95": bool(ttfc) and max(ttfc) <= thresholds.ttfc_ms_p95,
        "caption_lag_ms_p95": bool(lag) and max(lag) <= thresholds.caption_lag_ms_p95,
    }

    return {
        "status": "PASS" if all(checks.values()) else "FAIL",
        "sample_count": len(samples),
        "required_samples": thresholds.min_samples,
        "checks": checks,
        "metrics": {
            "adequacy_mean": round(mean(adequacy), 2) if adequacy else None,
            "fluency_mean": round(mean(fluency), 2) if fluency else None,
            "caption_stability_mean": round(mean(stability), 2) if stability else None,
            "comprehension_success_pct": round(mean(comprehension), 2) if comprehension else None,
            "ttfc_ms_p95_max": max(ttfc) if ttfc else None,
            "caption_lag_ms_p95_max": max(lag) if lag else None,
        },
    }
