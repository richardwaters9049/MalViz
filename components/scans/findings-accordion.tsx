import { asRecord, asStringArray } from "@/lib/services/reports/report-service";

export function FindingsAccordion({
  matchedRules,
  staticFindings,
  rawReportJson,
}: {
  matchedRules: unknown;
  staticFindings: unknown;
  rawReportJson?: unknown;
}) {
  const rules = asStringArray(matchedRules);
  const findings = asRecord(staticFindings);
  const rawReport = asRecord(rawReportJson);

  return (
    <div className="space-y-3">
      <details className="rounded-md border border-(--app-border) bg-(--app-surface-muted) p-4">
        <summary className="text-sm font-medium text-(--app-fg)">Matched rules</summary>
        {rules.length === 0 ? (
          <p className="mt-3 text-sm text-(--app-muted)">No rule matches.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {rules.map((rule) => (
              <li key={rule} className="font-mono text-xs text-(--app-fg)">
                {rule}
              </li>
            ))}
          </ul>
        )}
      </details>

      <details className="rounded-md border border-(--app-border) bg-(--app-surface-muted) p-4">
        <summary className="text-sm font-medium text-(--app-fg)">Static findings JSON</summary>
        <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-100">
          {JSON.stringify(findings, null, 2)}
        </pre>
      </details>

      <details className="rounded-md border border-(--app-border) bg-(--app-surface-muted) p-4">
        <summary className="text-sm font-medium text-(--app-fg)">Analysis metadata JSON</summary>
        <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-100">
          {JSON.stringify(rawReport, null, 2)}
        </pre>
      </details>
    </div>
  );
}
