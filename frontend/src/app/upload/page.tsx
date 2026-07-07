import { AppShell } from "@/components/layout/app-shell";
import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { maxUploadBytes } from "@/lib/security/file-validation";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-(--app-fg)">Upload files</h1>
        <p className="mt-1 text-sm text-(--app-muted)">
          Quarantine one or many files, then scan each file when you are ready to generate its report.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New upload</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadDropzone maxBytes={maxUploadBytes} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
