# Harmless MalViz calibration fixture.
# This is inert text for static-analysis testing only. Do not execute samples.

$stage = "https://loader.example.test/stage"
$fallback = "http://198.51.100.123/payload"
$commands = @(
  "powershell -NoProfile -ExecutionPolicy Bypass",
  "Invoke-Expression",
  "DownloadString",
  "FromBase64String",
  "certutil -decode",
  "bitsadmin /transfer"
)

QUFBQUJCQkJDQ0NDREREREVFRUVGRkZGR0dHR0hISEhJSUlJSkpKSkxMTE1NTU5OT09
cG93ZXJzaGVsbCBodHRwOi8vZXhhbXBsZS50ZXN0L2NoZWNrIGNtZC5leGU=
SW52b2tlLUV4cHJlc3Npb24gRG93bmxvYWRTdHJpbmcgRnJvbUJhc2U2NFN0cmluZw==

Write-Output "Fixture only"

