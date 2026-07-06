from .entropy import EntropyPlugin
from .file_type import FileTypePlugin
from .hashing import HashingPlugin
from .indicators import IndicatorExtractorPlugin
from .strings import StringsPlugin

DEFAULT_PLUGINS = [
    HashingPlugin(),
    FileTypePlugin(),
    StringsPlugin(),
    EntropyPlugin(),
    IndicatorExtractorPlugin(),
]

__all__ = [
    "DEFAULT_PLUGINS",
    "EntropyPlugin",
    "FileTypePlugin",
    "HashingPlugin",
    "IndicatorExtractorPlugin",
    "StringsPlugin",
]
