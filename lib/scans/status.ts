import { FileStatus, Verdict } from "@prisma/client";

export function statusTone(status: FileStatus | Verdict) {
  switch (status) {
    case "MALICIOUS":
    case "FAILED":
      return "danger";
    case "SUSPICIOUS":
    case "UNKNOWN":
      return "warning";
    case "CLEAN":
      return "success";
    default:
      return "neutral";
  }
}

export function verdictCopy(verdict?: Verdict | null) {
  switch (verdict) {
    case "CLEAN":
      return "No strong malicious indicators were found.";
    case "SUSPICIOUS":
      return "This file has signals that deserve review.";
    case "MALICIOUS":
      return "This file matches high-risk malware indicators.";
    case "FAILED":
      return "The scan failed before a reliable verdict was produced.";
    default:
      return "The scan has not produced a verdict yet.";
  }
}
