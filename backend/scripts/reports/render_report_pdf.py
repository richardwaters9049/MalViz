#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def die(message: str) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(2)


def escape_typst_markup(value: object) -> str:
    text = "" if value is None else str(value)
    return (
        text.replace("\\", "\\\\")
        .replace("#", "\\#")
        .replace("[", "\\[")
        .replace("]", "\\]")
    )


def typst_str(value: object) -> str:
    text = "" if value is None else str(value)
    escaped = text.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def title_case(value: object) -> str:
    return str(value or "").replace("_", " ").title()


def short_hash(value: object) -> str:
    text = str(value or "")
    return text if len(text) <= 24 else f"{text[:12]}...{text[-8:]}"


def short_value(value: object, limit: int = 56) -> str:
    text = str(value or "")
    if len(text) <= limit:
        return text
    return f"{text[: max(8, limit - 12)]}...{text[-8:]}"


def format_json(value: Any, limit: int = 5600) -> str:
    text = json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False)
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "\n... truncated for PDF export ..."


def clean_filename(value: object) -> str:
    text = re.sub(r"[^A-Za-z0-9._-]+", "-", str(value or "report")).strip("-")
    return text or "report"


def render_typst(report: dict[str, Any]) -> str:
    file_info = as_dict(report.get("file"))
    result = as_dict(report.get("result"))
    indicators = as_list(report.get("indicators"))
    generated = as_dict(report.get("generated"))

    verdict = title_case(result.get("verdict") or "UNKNOWN")
    risk_score = result.get("riskScore")
    risk_text = "Pending" if risk_score is None else f"{risk_score}/100"
    summary = result.get("summary") or "No summary was recorded."
    reasons = [str(item) for item in as_list(result.get("reasons")) if isinstance(item, str)]
    matched_rules = [str(item) for item in as_list(result.get("matchedRules")) if isinstance(item, str)]
    actions = [str(item) for item in as_list(result.get("recommendedActions")) if isinstance(item, str)]
    raw_report = as_dict(result.get("rawReportJson"))
    static_findings = result.get("staticFindings") or {}

    indicator_rows = []
    for indicator in indicators[:80]:
        item = as_dict(indicator)
        indicator_rows.append(
            (
                title_case(item.get("type")),
                short_value(item.get("value")),
                f"{item.get('confidence', 50)}%",
                str(item.get("source") or "unknown"),
            )
        )

    out: list[str] = []
    out.append(
        """
#set page(
  paper: "a4",
  margin: (top: 13mm, bottom: 13mm, left: 15mm, right: 15mm),
  fill: rgb("#06090d"),
)

#let accent = rgb("#35c7dd")
#let violet = rgb("#7c3aed")
#let ink = rgb("#f8fafc")
#let muted = rgb("#94a3b8")
#let border = rgb("#22303d")
#let surface = rgb("#0d131a")
#let surface-muted = rgb("#111923")
#let dark = rgb("#07111a")
#let hero-soft = rgb("#0b1b26")
#let danger = rgb("#ef4444")
#let warning = rgb("#f59e0b")
#let success = rgb("#10b981")
#let code-blue = rgb("#7dd3fc")
#let code-green = rgb("#86efac")
#let code-pink = rgb("#f0abfc")

#let verdict-color(v) = if v == "Malicious" { danger } else if v == "Suspicious" { warning } else if v == "Clean" { success } else { muted }

#set text(font: ("Avenir Next", "Helvetica Neue", "Helvetica"), size: 9.7pt, fill: ink)
#set par(justify: false, leading: 1.28em)
#set list(indent: 12pt, body-indent: 5pt, spacing: 2pt)

#let label(content) = text(size: 7.5pt, fill: muted, weight: "bold")[#upper(content)]
#let section(title) = [
  #v(7pt)
  #text(size: 13pt, weight: "bold", fill: ink)[#title]
  #v(3pt)
  #line(length: 100%, stroke: (paint: border, thickness: 0.7pt))
  #v(5pt)
]
#let card(body) = block(
  fill: surface,
  inset: (x: 8pt, y: 7pt),
  radius: 7pt,
  stroke: (paint: border, thickness: 0.7pt),
)[#body]
#let chip(content, fill-color) = box(
  fill: fill-color,
  inset: (x: 6pt, y: 3pt),
  radius: 5pt,
)[#text(size: 8pt, fill: white, weight: "bold")[#content]]
#let table-head(content) = text(weight: "bold", fill: ink)[#content]
#let kv(name, value) = [
  #label(name)
  #v(1pt)
  #text(size: 8.8pt)[#value]
]
"""
    )

    out.append(
        f"""
#block(fill: hero-soft, inset: (x: 12pt, y: 10pt), radius: 9pt, stroke: (paint: border, thickness: 0.8pt))[
  #grid(columns: (1fr, auto), gutter: 12pt)[
    #text(size: 20pt, weight: "bold", fill: white)[MalViz Analysis Report]
    #chip({typst_str(verdict)}, verdict-color({typst_str(verdict)}))
  ][
    #align(right)[
      #text(size: 8pt, fill: muted)[Generated]
      #linebreak()
      #text(size: 8.5pt, fill: white)[{escape_typst_markup(generated.get("at") or "")}]
    ]
  ]
  #v(4pt)
  #text(size: 9.3pt, fill: muted)[
    Shareable static report. Raw sample bytes and quarantine storage paths are not included.
  ]
]

#v(8pt)
#grid(columns: (1.2fr, 0.8fr), gutter: 8pt)[
  #card([
    #label("File")
    #v(2pt)
    #text(size: 12pt, weight: "bold")[{escape_typst_markup(file_info.get("originalFilename") or "Unknown file")}]
    #v(5pt)
    #grid(
      columns: (1fr, 1fr),
      gutter: 7pt,
      [#kv("MIME type", [{escape_typst_markup(file_info.get("mimeType") or "unknown")}])],
      [#kv("Size", [{escape_typst_markup(file_info.get("fileSizeLabel") or "")}])],
      [#kv("Uploaded", [{escape_typst_markup(file_info.get("createdAt") or "")}])],
      [#kv("Owner", [{escape_typst_markup(file_info.get("ownerName") or "Unknown")}])],
    )
  ])
][
  #card([
    #label("Risk score")
    #v(2pt)
    #text(size: 23pt, weight: "bold", fill: verdict-color({typst_str(verdict)}))[{escape_typst_markup(risk_text)}]
    #v(4pt)
    #label("Verdict")
    #v(2pt)
    #text(size: 12pt, weight: "bold")[{escape_typst_markup(verdict)}]
  ])
]
"""
    )

    out.append("#section(\"Overview\")")
    out.append(f"#card([#text(size: 10.2pt)[{escape_typst_markup(summary)}]])")

    out.append("#section(\"Hashes\")")
    out.append(
        f"""
#card([
  #grid(
    columns: (1fr, 1fr, 1fr),
    gutter: 7pt,
    [#kv("SHA-256", [#text(size: 7.5pt, font: "Courier")[{escape_typst_markup(short_hash(file_info.get("sha256")))}]])],
    [#kv("SHA-1", [#text(size: 7.5pt, font: "Courier")[{escape_typst_markup(short_hash(file_info.get("sha1") or "Pending"))}]])],
    [#kv("MD5", [#text(size: 7.5pt, font: "Courier")[{escape_typst_markup(short_hash(file_info.get("md5") or "Pending"))}]])],
  )
])
"""
    )

    out.append("#section(\"Why This Verdict\")")
    if reasons:
        out.append("#card([")
        for reason in reasons:
            out.append(f"- {escape_typst_markup(reason)}")
        out.append("])")
    else:
        out.append("#card([No notable reasons were recorded.])")

    out.append("#section(\"Recommended Actions\")")
    if actions:
        out.append("#card([")
        for action in actions:
            out.append(f"- {escape_typst_markup(action)}")
        out.append("])")
    else:
        out.append("#card([No recommended actions were recorded.])")

    out.append("#section(\"Indicators\")")
    if indicator_rows:
        out.append("#card([")
        out.append("#table(columns: (22%, 44%, 14%, 20%), inset: 3.5pt, stroke: border,")
        out.append("  [#table-head[Type]], [#table-head[Value]], [#table-head[Conf.]], [#table-head[Source]],")
        for typ, value, confidence, source in indicator_rows:
            out.append(
                f"  [{escape_typst_markup(typ)}], [#text(size: 7.6pt, font: \"Courier\", fill: ink)[{escape_typst_markup(value)}]], "
                f"[{escape_typst_markup(confidence)}], [{escape_typst_markup(source)}],"
            )
        out.append(")")
        if len(indicators) > len(indicator_rows):
            out.append(f"#v(5pt)#text(size: 8pt, fill: muted)[Showing first {len(indicator_rows)} of {len(indicators)} indicators.]")
        out.append("])")
    else:
        out.append("#card([No indicators were extracted.])")

    out.append("#section(\"Matched Rules\")")
    if matched_rules:
        out.append("#card([")
        for rule in matched_rules:
            out.append(f"- {escape_typst_markup(rule)}")
        out.append("])")
    else:
        out.append("#card([No matched rules were recorded.])")

    out.append("#section(\"Technical Findings\")")
    out.append(
        "#card([#text(size: 7.2pt, fill: ink)[#raw(block: true, lang: \"json\", "
        + typst_str(format_json(static_findings))
        + ")]])"
    )

    if raw_report:
        out.append("#section(\"Report Metadata\")")
        out.append(
            "#card([#text(size: 7.2pt, fill: ink)[#raw(block: true, lang: \"json\", "
            + typst_str(format_json(raw_report, limit=4200))
            + ")]])"
        )

    out.append(
        f"""
#v(9pt)
#line(length: 100%, stroke: (paint: border, thickness: 0.7pt))
#v(3pt)
#text(size: 7.4pt, fill: muted)[MalViz report ID: {escape_typst_markup(result.get("id") or file_info.get("id") or "")} | Exported by {escape_typst_markup(generated.get("by") or "MalViz")}]
"""
    )

    return "\n".join(out)


def main() -> int:
    parser = argparse.ArgumentParser(description="Render a MalViz scan report PDF from JSON.")
    parser.add_argument("--input", required=True, help="Input report JSON path")
    parser.add_argument("--out", required=True, help="Output PDF path")
    args = parser.parse_args()

    input_path = Path(args.input)
    out_path = Path(args.out)
    if not input_path.exists():
        die(f"missing input file: {input_path}")

    report = json.loads(input_path.read_text(encoding="utf-8"))
    report.setdefault("generated", {}).setdefault("at", datetime.now(UTC).isoformat(timespec="seconds"))
    typst = render_typst(report)

    with tempfile.TemporaryDirectory(prefix="malviz-report-") as tmp:
        typ_path = Path(tmp) / f"{clean_filename(out_path.stem)}.typ"
        typ_path.write_text(typst, encoding="utf-8")

        try:
            subprocess.run(["typst", "compile", str(typ_path), str(out_path)], check=True)
        except FileNotFoundError:
            die("typst not found; install it or use the Docker web image with Typst support")
        except subprocess.CalledProcessError as error:
            die(f"typst compile failed with exit code {error.returncode}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
