import Link from "next/link";
import { LogOut } from "lucide-react";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { DesktopNav } from "@/components/layout/desktop-nav";
import { cn } from "@/lib/utils";
import { clearSession, skipLandingIntroOnce, type SessionUser } from "@/lib/auth/session";

const navItems = [
  { href: "/dashboard", label: "Dashboard", iconName: "LayoutDashboard" },
  { href: "/upload", label: "Upload", iconName: "UploadCloud" },
  { href: "/scans", label: "Scans", iconName: "ListChecks" },
  { href: "/settings", label: "Settings", iconName: "Settings" },
];

export function AppShell({
  user,
  children,
  className,
}: {
  user: SessionUser;
  children: React.ReactNode;
  className?: string;
}) {
  const allNavItems =
    user.role === Role.ADMIN
      ? [...navItems, { href: "/admin", label: "Admin", iconName: "ShieldCheck" }]
      : navItems;

  async function logout() {
    "use server";

    await clearSession();
    await skipLandingIntroOnce();
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-(--app-bg) text-(--app-fg)">
      <header className="border-b border-(--app-border) bg-(--app-surface)">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="min-w-0">
            {/* Account identity replaces the old brand mark so the active user is always clear. */}
            <div className="flex min-w-0 flex-col items-start gap-1">
              <p className="max-w-40 truncate text-sm font-semibold leading-5 text-(--app-fg) sm:max-w-56">
                {user.name}
              </p>
              <p className="max-w-40 truncate text-xs text-(--app-muted) sm:max-w-56">{user.email}</p>
              <Badge tone={user.role === Role.ADMIN ? "warning" : "neutral"}>{user.role}</Badge>
            </div>
          </Link>

          <DesktopNav navItems={allNavItems} />

          <div className="flex items-center gap-2 sm:gap-3">
            <MobileMenu
              navItems={allNavItems}
              userName={user.name}
              userEmail={user.email}
              userRole={user.role}
              logoutAction={logout}
            />
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
            <form action={logout} className="hidden md:block">
              <Button variant="ghost" size="sm" type="submit" title="Log out">
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className={cn("mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8", className)}>
        {children}
      </main>
    </div>
  );
}
