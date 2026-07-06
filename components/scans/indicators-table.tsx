import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";

type Indicator = {
  id: string;
  type: string;
  value: string;
  source: string;
};

export function IndicatorsTable({ indicators }: { indicators: Indicator[] }) {
  if (indicators.length === 0) {
    return <p className="text-sm text-(--app-muted)">No indicators were extracted.</p>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-(--app-border)">
      <table className="w-full text-left text-sm">
        <thead className="bg-(--app-table-head) text-xs uppercase text-(--app-muted)">
          <tr>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Value</th>
            <th className="px-4 py-3">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--app-border)">
          {indicators.map((indicator) => (
            <tr key={indicator.id}>
              <td className="px-4 py-3">
                <Badge>{titleCase(indicator.type)}</Badge>
              </td>
              <td className="max-w-lg break-all px-4 py-3 font-mono text-xs text-(--app-fg)">
                {indicator.value}
              </td>
              <td className="px-4 py-3 text-(--app-muted)">{indicator.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
