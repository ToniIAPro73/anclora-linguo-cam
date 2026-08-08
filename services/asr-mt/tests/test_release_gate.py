from app.release_gate import evaluate_release_gate


def _passing_sample() -> dict:
    return {
        "adequacy": 4.4,
        "fluency": 4.3,
        "caption_stability": 4.1,
        "comprehension_success": 100,
        "ttfc_ms_p95": 900,
        "caption_lag_ms_p95": 1100,
    }


def test_release_gate_requires_minimum_samples():
    result = evaluate_release_gate([_passing_sample()])

    assert result["status"] == "INSUFFICIENT_DATA"
    assert result["sample_count"] == 1
    assert result["checks"] == {}


def test_release_gate_passes_when_all_thresholds_are_met():
    result = evaluate_release_gate([_passing_sample() for _ in range(10)])

    assert result["status"] == "PASS"
    assert all(result["checks"].values())
    assert result["metrics"]["adequacy_mean"] == 4.4


def test_release_gate_fails_when_any_threshold_is_missed():
    samples = [_passing_sample() for _ in range(10)]
    samples[0]["ttfc_ms_p95"] = 2000

    result = evaluate_release_gate(samples)

    assert result["status"] == "FAIL"
    assert result["checks"]["ttfc_ms_p95"] is False
