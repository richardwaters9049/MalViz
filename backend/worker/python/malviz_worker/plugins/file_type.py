from __future__ import annotations

import mimetypes
from pathlib import Path

from malviz_worker.pipeline import AnalysisContext, AnalysisPlugin, PluginResult

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

EXTENSION_LABELS = {
    ".exe": "Windows executable",
    ".dll": "Windows executable",
    ".scr": "Windows executable",
    ".pdf": "PDF",
    ".jpg": "JPEG image",
    ".jpeg": "JPEG image",
    ".png": "PNG image",
    ".gif": "GIF image",
    ".zip": "ZIP/archive",
    ".docx": "Office document",
    ".xlsx": "Office spreadsheet",
    ".pptx": "Office presentation",
}

MAGIC_LABELS = {
    "portable_executable": "Windows executable",
    "pdf": "PDF",
    "zip_or_office": "ZIP/archive or Office document",
    "elf": "ELF executable",
    "mach_o": "Mach-O executable",
    "rar": "RAR archive",
    "seven_zip": "7-Zip archive",
    "unknown": "unknown content",
}


def extension_for(name: str) -> str:
    return Path(name).suffix.lower()


def extension_chain_for(name: str) -> list[str]:
    return [suffix.lower() for suffix in Path(name).suffixes]


def expected_label_for_extension(extension: str) -> str:
    return EXTENSION_LABELS.get(extension, f"{extension.lstrip('.').upper()} file" if extension else "unknown file")


def detected_label_for_magic(magic_name: str) -> str:
    return MAGIC_LABELS.get(magic_name, magic_name.replace("_", " "))


def extensions_match_magic(extension: str, magic_name: str, magic_mime: str) -> bool:
    if magic_name == "unknown":
        return True
    if extension in {".docx", ".xlsx", ".pptx"} and magic_name == "zip_or_office":
        return True
    if extension in EXECUTABLE_EXTENSIONS and magic_name in {"portable_executable", "elf", "mach_o"}:
        return True
    if extension in ARCHIVE_EXTENSIONS and magic_name in {"zip_or_office", "rar", "seven_zip"}:
        return True
    if extension == ".pdf" and magic_name == "pdf":
        return True

    guessed = mimetypes.guess_type(f"sample{extension}")[0]
    return bool(guessed and guessed == magic_mime)


class FileTypePlugin(AnalysisPlugin):
    name = "file_type"
    version = "1.0.0"

    def run(self, context: AnalysisContext) -> PluginResult:
        prefix = context.storage_path.read_bytes()[:16]
        original_extension = extension_for(context.original_filename)
        original_extension_chain = extension_chain_for(context.original_filename)
        stored_extension = extension_for(context.stored_filename or context.storage_path.name)
        storage_extension = extension_for(context.storage_path.name)
        effective_extension = original_extension or stored_extension or storage_extension
        original_mime = mimetypes.guess_type(context.original_filename)[0] if context.original_filename else None
        stored_mime = mimetypes.guess_type(context.stored_filename or context.storage_path.name)[0]
        detected_mime = context.mime_type or "application/octet-stream"
        guessed_mime = original_mime or stored_mime or detected_mime
        magic_name = "unknown"
        magic_mime = "application/octet-stream"

        for magic, name, mime in MAGIC_TYPES:
            if prefix.startswith(magic):
                magic_name = name
                magic_mime = mime
                break

        category = "unknown"
        if effective_extension in EXECUTABLE_EXTENSIONS or magic_name in {"portable_executable", "elf", "mach_o"}:
            category = "executable"
        elif effective_extension in SCRIPT_EXTENSIONS:
            category = "script"
        elif effective_extension in DOCUMENT_EXTENSIONS:
            category = "document"
        elif effective_extension in ARCHIVE_EXTENSIONS or magic_name in {"zip_or_office", "rar", "seven_zip"}:
            category = "archive"

        mismatches: list[str] = []
        for source, extension in [
            ("original filename", original_extension),
            ("stored filename", stored_extension),
        ]:
            if extension and not extensions_match_magic(extension, magic_name, magic_mime):
                mismatches.append(
                    "Extension mismatch: "
                    f"{source} suggests {expected_label_for_extension(extension)} "
                    f"but file signature indicates {detected_label_for_magic(magic_name)}."
                )

        if original_extension and stored_extension and original_extension != stored_extension:
            mismatches.append(
                "Extension mismatch: "
                f"original filename ends with {original_extension} but stored filename ends with {stored_extension}."
            )

        if len(original_extension_chain) > 1:
            decoy_extensions = original_extension_chain[:-1]
            if any(extension in DOCUMENT_EXTENSIONS or extension in {".jpg", ".jpeg", ".png", ".gif"} for extension in decoy_extensions):
                mismatches.append(
                    "Extension mismatch: "
                    f"original filename uses a double extension ({''.join(original_extension_chain)}), "
                    f"which presents {expected_label_for_extension(decoy_extensions[-1])} before "
                    f"{expected_label_for_extension(original_extension)}."
                )

        if detected_mime and magic_name != "unknown" and detected_mime != magic_mime:
            mismatches.append(
                "MIME mismatch: "
                f"detected MIME type is {detected_mime} but file signature indicates {magic_mime}."
            )

        context.file_type = {
            "extension": effective_extension or "(none)",
            "original_extension": original_extension or "(none)",
            "original_extension_chain": original_extension_chain,
            "stored_extension": stored_extension or "(none)",
            "guessed_mime": guessed_mime,
            "detected_mime": detected_mime,
            "magic_type": magic_name,
            "magic_mime": magic_mime,
            "category": category,
            "extension_mismatch": len(mismatches) > 0,
            "mismatch_reasons": mismatches,
        }

        return PluginResult(name=self.name, version=self.version, findings=context.file_type)
