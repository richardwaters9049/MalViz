from __future__ import annotations

import json
from pathlib import Path

import pytest

from malviz_worker.pipeline import AnalysisContext, AnalysisPipeline
from malviz_worker.plugins import DEFAULT_PLUGINS
from malviz_worker.scoring import score_context


REPO_ROOT = Path(__file__).resolve().parents[4]
FIXTURE_DIR = REPO_ROOT / "backend/tests/fixtures/calibration"
MANIFEST = json.loads((FIXTURE_DIR / "manifest.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("entry", MANIFEST, ids=[entry["filename"] for entry in MANIFEST])
def test_calibration_fixture_expected_verdicts(entry: dict[str, object]) -> None:
    sample_path = FIXTURE_DIR / str(entry["filename"])
    context = AnalysisContext(
        file_id="calibration-file",
        job_id="calibration-job",
        storage_path=sample_path,
        original_filename=sample_path.name,
        stored_filename=sample_path.name,
        mime_type=str(entry.get("mimeType") or "application/octet-stream"),
        file_size=sample_path.stat().st_size,
    )

    AnalysisPipeline(DEFAULT_PLUGINS).run(context)
    score_context(context)

    assert context.verdict == entry["expectedVerdict"]
    for expected_rule in entry["expectedRules"]:
        assert expected_rule in context.matched_rules

