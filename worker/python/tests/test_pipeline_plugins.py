from __future__ import annotations

from pathlib import Path

from malviz_worker.pipeline import AnalysisContext, AnalysisPipeline, AnalysisPlugin, PluginResult
from malviz_worker.plugins import (
    EntropyPlugin,
    FileTypePlugin,
    HashingPlugin,
    IndicatorExtractorPlugin,
    StringsPlugin,
)
from malviz_worker.reports import build_report
from malviz_worker.scoring import score_context


def context_for(path: Path) -> AnalysisContext:
    return AnalysisContext(
        file_id="file-1",
        job_id="job-1",
        storage_path=path,
        original_filename=path.name,
        stored_filename=path.name,
        mime_type="application/octet-stream",
        file_size=path.stat().st_size,
    )


def context_for_names(
    path: Path,
    *,
    original_filename: str,
    stored_filename: str,
    mime_type: str = "application/octet-stream",
) -> AnalysisContext:
    context = context_for(path)
    context.original_filename = original_filename
    context.stored_filename = stored_filename
    context.mime_type = mime_type
    return context


def test_hashing_plugin_produces_all_hashes(tmp_path: Path) -> None:
    sample = tmp_path / "sample.txt"
    sample.write_bytes(b"hello")
    context = context_for(sample)

    result = HashingPlugin().run(context)

    assert set(result.findings) == {"md5", "sha1", "sha256"}
    assert len(context.hashes["sha256"]) == 64


def test_file_type_detects_magic_mismatch(tmp_path: Path) -> None:
    sample = tmp_path / "stored.bin"
    sample.write_bytes(b"MZ suspicious")
    context = context_for_names(
        sample,
        original_filename="invoice.pdf.exe",
        stored_filename="stored.pdf",
        mime_type="application/pdf",
    )

    result = FileTypePlugin().run(context)

    assert result.findings["magic_type"] == "portable_executable"
    assert result.findings["extension_mismatch"] is True
    assert any("double extension (.pdf.exe)" in reason for reason in result.findings["mismatch_reasons"])
    assert any("stored filename suggests PDF" in reason for reason in result.findings["mismatch_reasons"])


def test_file_type_detects_image_name_with_executable_bytes(tmp_path: Path) -> None:
    sample = tmp_path / "uuid.exe"
    sample.write_bytes(b"MZ executable")
    context = context_for_names(sample, original_filename="image.jpg", stored_filename="uuid.exe")

    result = FileTypePlugin().run(context)

    assert result.findings["extension_mismatch"] is True
    assert any("original filename suggests JPEG image" in reason for reason in result.findings["mismatch_reasons"])


def test_file_type_detects_pdf_name_with_non_pdf_magic(tmp_path: Path) -> None:
    sample = tmp_path / "uuid.bin"
    sample.write_bytes(b"PK\x03\x04 archive")
    context = context_for_names(sample, original_filename="document.pdf", stored_filename="uuid.bin")

    result = FileTypePlugin().run(context)

    assert result.findings["magic_type"] == "zip_or_office"
    assert result.findings["extension_mismatch"] is True
    assert any("original filename suggests PDF" in reason for reason in result.findings["mismatch_reasons"])


def test_strings_and_indicator_plugins_extract_network_and_commands(tmp_path: Path) -> None:
    sample = tmp_path / "script.ps1"
    sample.write_text("powershell Invoke-Expression http://evil.example/a 10.0.0.1", encoding="utf-8")
    context = context_for(sample)
    pipeline = AnalysisPipeline([StringsPlugin(), IndicatorExtractorPlugin()])

    pipeline.run(context)

    assert "powershell" in context.findings["strings"]["suspicious_commands"]
    assert any(item["type"] == "URL" for item in context.indicators)
    assert any(item["type"] == "IP" for item in context.indicators)


def test_entropy_plugin_flags_high_entropy(tmp_path: Path) -> None:
    sample = tmp_path / "packed.bin"
    sample.write_bytes(bytes(range(256)) * 32)
    context = context_for(sample)

    result = EntropyPlugin().run(context)

    assert result.findings["packed_like"] is True


def test_risk_engine_and_report_are_explainable(tmp_path: Path) -> None:
    sample = tmp_path / "script.ps1"
    sample.write_text("powershell http://evil.example/a", encoding="utf-8")
    context = context_for(sample)
    AnalysisPipeline([FileTypePlugin(), StringsPlugin(), IndicatorExtractorPlugin()]).run(context)
    score_context(context)
    report = build_report(context)

    assert report["risk_score"] >= 25
    assert report["verdict"] == "SUSPICIOUS"
    assert report["report_schema_version"] == 1
    assert report["reasons"]
    assert report["raw_report_json"]["plugin_results"]


def test_pipeline_records_plugin_failure_without_crashing(tmp_path: Path) -> None:
    class FailingPlugin(AnalysisPlugin):
        name = "failing"
        version = "1.0.0"

        def run(self, context: AnalysisContext) -> PluginResult:
            raise RuntimeError("plugin blew up")

    sample = tmp_path / "sample.txt"
    sample.write_text("hello", encoding="utf-8")
    context = context_for(sample)

    AnalysisPipeline([FailingPlugin(), StringsPlugin()]).run(context)

    assert any("plugin blew up" in error for error in context.errors)
    assert "strings" in context.findings
