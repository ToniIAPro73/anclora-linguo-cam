# ASR/MT Capacity Model

## Status

No representative production benchmark has been run yet for real ASR/MT models on target hardware. This document is intentionally a capacity model template, not a claimed throughput or cost report.

## Backends

- `mock`: deterministic CI/dev backend; no ML dependencies.
- `vosk`: optional streaming ASR; requires local Vosk model resources.
- `faster-whisper`: optional segment/utterance ASR; requires `requirements-ml.txt` and configured model/device.
- `transformers`/`marian`/`nllb`: optional MT via local sequence-to-sequence models; requires `requirements-ml.txt`.

## Metrics To Collect

- Concurrent calls per ASR/MT worker.
- CPU utilization, memory resident set, and GPU utilization when applicable.
- ASR first partial latency and final segment latency.
- MT p50/p95 latency by language pair and character count bucket.
- End-to-end TTFC and caption lag from `/api/telemetry/summary` and `/api/telemetry/slo`.
- Dropped hypothesis rate and WebSocket backpressure counts.
- Human adequacy, fluency, caption stability, and comprehension success samples.

## Benchmark Procedure

1. Install base dependencies and optional ML dependencies in an isolated environment:

```bash
cd services/asr-mt
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-ml.txt
```

2. Pin model names/paths explicitly:

```bash
export ASR_BACKEND=faster-whisper
export ASR_MODEL=small
export ASR_DEVICE=cpu
export ASR_COMPUTE_TYPE=int8
export MT_BACKEND=marian
export MT_MODEL=Helsinki-NLP/opus-mt-es-en
```

3. Run representative calls, collect telemetry, and export evaluation samples.

4. Run the release gate:

```bash
PYTHONPATH=. python scripts/release_gate.py path/to/evaluation-samples.json
```

## Release Criteria

The release gate returns:

- `INSUFFICIENT_DATA` when the sample count is below the minimum.
- `FAIL` when at least one quality or latency threshold is missed.
- `PASS` only when all thresholds pass with enough samples.

## Open Work

- Run target-hardware benchmarks for CPU-only and GPU-assisted profiles.
- Decide production worker sizing from measured p95 latency and peak concurrency.
- Store benchmark artifacts with model versions, hardware profile, and commit SHA.
