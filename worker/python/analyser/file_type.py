from __future__ import annotations

import mimetypes
from pathlib import Path


MAGIC_TYPES: list[tuple[bytes, str, str]] = [
    (b"MZ", "portable_executable", "application/x-msdownload"),
    (b"%PDF", "pdf", "application/pdf"),
    (b"PK\x03\x04", "zip_or_office", "application/zip"),
    (b"\x7fELF", "elf", "application/x-elf"),
    (b"\xcf\xfa\xed\xfe", "mach_o", "application/x-mach-binary"),
    (b"\xca\xfe\xba\xbe", "java_class_or_fat_macho", "application/octet-stream"),
    (b"Rar!\x1a\x07", "rar", "application/vnd.rar"),
    (b"7z\xbc\xaf\x27\x1c", "seven_zip", "application/x-7z-compressed"),
]

EXECUTABLE_EXTENSIONS = {".exe", ".dll", ".scr", ".sys", ".com", ".elf", ".dylib"}
SCRIPT_EXTENSIONS = {".ps1", ".bat", ".cmd", ".js", ".jse", ".vbs", ".wsf", ".sh"}
DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"}
ARCHIVE_EXTENSIONS = {".zip", ".rar", ".7z", ".gz", ".tar"}


def detect_file_type(path: Path) -> dict[str, object]:
    prefix = path.read_bytes()[:16] if path.exists() else b""
    extension = path.suffix.lower()
    guessed_mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    magic_name = "unknown"
    magic_mime = "application/octet-stream"

    for magic, name, mime in MAGIC_TYPES:
        if prefix.startswith(magic):
            magic_name = name
            magic_mime = mime
            break

    category = "unknown"
    if extension in EXECUTABLE_EXTENSIONS or magic_name in {"portable_executable", "elf", "mach_o"}:
        category = "executable"
    elif extension in SCRIPT_EXTENSIONS:
        category = "script"
    elif extension in DOCUMENT_EXTENSIONS:
        category = "document"
    elif extension in ARCHIVE_EXTENSIONS or magic_name in {"zip_or_office", "rar", "seven_zip"}:
        category = "archive"

    mismatch = magic_name != "unknown" and guessed_mime != magic_mime
    if extension in {".docx", ".xlsx", ".pptx"} and magic_name == "zip_or_office":
        mismatch = False

    return {
        "extension": extension or "(none)",
        "guessed_mime": guessed_mime,
        "magic_type": magic_name,
        "magic_mime": magic_mime,
        "category": category,
        "extension_mismatch": mismatch,
    }
