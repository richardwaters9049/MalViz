import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { asStringArray } from "@/lib/services/reports/report-service";

export function SuggestedActionsCard({ actions }: { actions: unknown }) {
  const items = asStringArray(actions);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested actions</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-(--app-muted)">No follow-up actions were recommended.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item} className="rounded-md border border-(--app-border) bg-(--app-surface-muted) px-3 py-2 text-sm">
                {item}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
