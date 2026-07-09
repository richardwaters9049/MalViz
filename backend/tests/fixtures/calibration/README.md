# MalViz Calibration Dataset

These samples are harmless fixtures for repeatable pipeline testing. They are not malware and must not be treated as representative of live threats.

Use them to check whether the current static-analysis rules produce expected, explainable verdicts across clean, suspicious, and malicious-like cases.

Load them into a local database with:

```bash
bun run db:seed:dataset
```

The seed command writes copied bytes to the configured quarantine directory, creates file artefacts, creates analysis requests, and queues scan jobs for the worker.
