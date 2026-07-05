# MalViz Test Samples

These files are harmless text fixtures for exercising the upload and static-analysis pipeline. They are not malware.

- `clean-note.txt`: should usually score clean or very low risk.
- `suspicious-script.txt`: contains command and URL strings to trigger suspicious findings.
- `network-indicators.log`: contains domains, URLs, IPs, and an email indicator.
- `extension-mismatch.exe`: text content with an executable extension, useful for upload validation and file-type review.
- `base64-heavy.txt`: contains long base64-like strings to trigger encoded-content heuristics.

Upload one or more files from `/upload`, then watch `/results` for worker output.
