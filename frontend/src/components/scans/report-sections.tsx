import { FindingsAccordion } from "@/components/scans/findings-accordion";
import { IndicatorsTable } from "@/components/scans/indicators-table";
import { SuggestedActionsCard } from "@/components/scans/suggested-actions-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { asStringArray } from "@/lib/services/reports/report-service";

type Indicator = {
  id: string;
  type: string;
  value: string;
  source: string;
};

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
        rawReportJson?: unknown;
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
          <p className="text-sm text-(--app-muted)">
            Start a scan to generate this report. Once analysis is active, this page refreshes automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  const reasons = asStringArray(result.reasons);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr] scan-result-grid">
      <Card>
        <CardHeader>
          <CardTitle>Why this verdict?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-(--app-muted)">{result.summary}</p>
          <SectionList items={reasons} empty="No notable reasons were recorded." />
        </CardContent>
      </Card>

      <SuggestedActionsCard actions={result.recommendedActions} />

      <Card>
        <CardHeader>
          <CardTitle>Extracted indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <IndicatorsTable indicators={indicators} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technical details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FindingsAccordion
            matchedRules={result.matchedRules}
            staticFindings={result.staticFindings}
            rawReportJson={result.rawReportJson}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SectionList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-(--app-muted)">{empty}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="rounded-md border border-(--app-border) bg-(--app-surface-muted) px-3 py-2 text-sm text-(--app-fg)">
          {item}
        </li>
      ))}
    </ul>
  );
}
