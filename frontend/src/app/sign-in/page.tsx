import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { setSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  let users: Array<{ id: string; email: string; name: string; role: Role }> = [];
  let databaseError = false;

  try {
    users = await prisma.user.findMany({
      orderBy: [{ role: "desc" }, { email: "asc" }],
      select: { id: true, email: true, name: true, role: true },
    });
  } catch {
    databaseError = true;
  }

  async function chooseUser(formData: FormData) {
    "use server";

    const userId = String(formData.get("userId") ?? "");
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (user) {
      await setSession(user.id);
    }

    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-950 text-white">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </div>
          <CardTitle className="text-xl">Choose a demo role</CardTitle>
          <p className="text-sm text-zinc-500">
            MVP auth uses seeded demo accounts so admin review flows can be exercised locally.
          </p>
        </CardHeader>
        <CardContent>
          {databaseError ? (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Database setup needed
              </div>
              <p>Run `bun run setup` from the project root to start services, migrate, seed demo users, and launch the app.</p>
            </div>
          ) : null}
          <form action={chooseUser} className="grid gap-3">
            {users.map((user) => (
              <button
                key={user.id}
                name="userId"
                value={user.id}
                className="flex w-full items-center justify-between rounded-md border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-cyan-300 hover:bg-cyan-50"
              >
                <span>
                  <span className="block text-sm font-medium text-zinc-950">{user.name}</span>
                  <span className="block text-xs text-zinc-500">{user.email}</span>
                </span>
                <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700">
                  {user.role === Role.ADMIN ? "Admin" : "User"}
                </span>
              </button>
            ))}
          </form>
          {!databaseError && users.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Run the Prisma seed command to create demo accounts.
            </div>
          ) : null}
          <Button className="mt-4 w-full" variant="outline" asChild>
            <a href="/dashboard">Continue with current session</a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
