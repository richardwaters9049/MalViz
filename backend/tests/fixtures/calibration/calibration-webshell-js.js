/*
  Harmless MalViz calibration fixture.
  This is not a working webshell and should not be executed.
*/

const simulatedRequest = "http://callback.example.test/ping";
const simulatedSource = "203.0.113.88";
const observedStrings = [
  "cmd.exe /c whoami",
  "wscript shell run",
  "cscript //nologo",
  "downloadstring",
];

console.log("Fixture only", simulatedRequest, simulatedSource, observedStrings.length);

