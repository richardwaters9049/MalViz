import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { LandingLogin } from "@/components/landing/landing-login";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser, setSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LandingPage({
  searchParams,
}: {
  searchParams?: Promise<{ skipIntro?: string }>;
}) {
  let currentUser = null;
  let users: Array<{ id: string; email: string; name: string; role: Role }> = [];
  let databaseError: string | null = null;
  const params = await searchParams;

  try {
    currentUser = await getCurrentUser();
    users = await prisma.user.findMany({
      orderBy: [{ role: "desc" }, { email: "asc" }],
      select: { id: true, email: true, name: true, role: true },
    });
  } catch (error) {
    databaseError =
      error instanceof Error
        ? error.message
        : "The database is not available yet.";
  }

  async function chooseUser(formData: FormData) {
    "use server";

    const userId = String(formData.get("userId") ?? "");
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (user) {
      await setSession(user.id);
      redirect("/dashboard");
    }

    redirect("/");
  }

  return (
    <LandingLogin
      currentUser={currentUser}
      users={users}
      databaseError={databaseError}
      chooseUser={chooseUser}
      skipIntro={params?.skipIntro === "1"}
    />
  );
}
