import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getQuarantineRoot } from "@/lib/services/storage/quarantine-storage";
import { maxUploadBytes, maxUploadSizeMb } from "@/lib/security/file-validation";
import { formatBytes } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-(--app-fg)">Settings</h1>
        <p className="mt-1 text-sm text-(--app-muted)">Review local account and runtime limits.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Setting label="Name" value={user.name} />
            <Setting label="Email" value={user.email} />
            <Setting label="Role" value={user.role} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analysis limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Setting label="Upload limit" value={`${formatBytes(maxUploadBytes)} (${maxUploadSizeMb} MB configured)`} />
            <Setting label="Quarantine root" value={getQuarantineRoot()} mono />
            <Setting label="Dynamic execution" value="Disabled" />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Setting({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-(--app-border) bg-(--app-surface-muted) p-3">
      <p className="text-xs font-medium uppercase text-(--app-muted)">{label}</p>
      <p className={`mt-1 break-all text-(--app-fg) ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}
