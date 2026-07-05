import { AppShell } from "@/components/layout/app-shell";
import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { maxUploadBytes } from "@/lib/validation/upload";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-950">Upload files</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Queue one or many files for static analysis. Samples are isolated in local quarantine storage.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadDropzone maxBytes={maxUploadBytes} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
