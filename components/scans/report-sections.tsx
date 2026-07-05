import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { titleCase } from "@/lib/utils";

type Indicator = {
  id: string;
  type: string;
  value: string;
  source: string;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function ReportSections({
  result,
  indicators,
}: {
  result:
    | {
        summary: string;
        reasons: unknown;
        matchedRules: unknown;
        staticFindings: unknown;
        recommendedActions: unknown;
      }
    | null;
  indicators: Indicator[];
}) {
  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Report pending</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">
            The worker has not written a report yet. This page refreshes while a scan is active.
          </p>
        </CardContent>
      </Card>
    );
  }

  const reasons = asStringArray(result.reasons);
  const actions = asStringArray(result.recommendedActions);
  const matchedRules = asStringArray(result.matchedRules);
  const staticFindings = asRecord(result.staticFindings);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Why this verdict?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-zinc-600">{result.summary}</p>
          <SectionList items={reasons} empty="No notable reasons were recorded." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended actions</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionList items={actions} empty="No follow-up actions were recommended." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extracted indicators</CardTitle>
        </CardHeader>
        <CardContent>
          {indicators.length === 0 ? (
            <p className="text-sm text-zinc-500">No indicators were extracted.</p>
          ) : (
            <div className="space-y-2">
              {indicators.map((indicator) => (
                <div
                  key={indicator.id}
                  className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-zinc-800">{indicator.value}</p>
                    <p className="mt-1 text-xs text-zinc-500">{indicator.source}</p>
                  </div>
                  <Badge>{titleCase(indicator.type)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technical details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700">Matched rules</p>
            <SectionList items={matchedRules} empty="No rule matches." />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700">Static findings</p>
            <pre className="max-h-80 overflow-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-100">
              {JSON.stringify(staticFindings, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SectionList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">{empty}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          {item}
        </li>
      ))}
    </ul>
  );
}
