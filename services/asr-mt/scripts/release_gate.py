#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICE_DIR))

from app.release_gate import evaluate_release_gate


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate ASR/MT release gate samples.")
    parser.add_argument("samples", type=Path, help="JSON file containing a list of evaluation samples.")
    args = parser.parse_args()

    samples = json.loads(args.samples.read_text(encoding="utf-8"))
    if not isinstance(samples, list):
        raise SystemExit("samples JSON must be a list")
    result = evaluate_release_gate(samples)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
