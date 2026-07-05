import Link from "next/link";
import { LogOut, ShieldCheck, LayoutDashboard, UploadCloud, ListChecks, Settings } from "lucide-react";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { cn } from "@/lib/utils";
import { clearSession, type SessionUser } from "@/lib/auth/session";

const navItems = [
  { href: "/dashboard", label: "Dashboard", iconName: "LayoutDashboard" },
  { href: "/upload", label: "Upload", iconName: "UploadCloud" },
  { href: "/results", label: "Results", iconName: "ListChecks" },
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
      ? [...navItems, { href: "/admin", label: "Admin", iconName: "Settings" }]
      : navItems;

  async function logout() {
    "use server";

    await clearSession();
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-(--app-bg) text-(--app-fg)">
      <header className="border-b border-(--app-border) bg-(--app-surface)">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold leading-5 text-(--app-fg)">MalViz</p>
              <p className="text-xs text-(--app-muted)">Malware Analysis MVP</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {allNavItems.map((item) => {
              const Icon = item.iconName === "LayoutDashboard" ? LayoutDashboard
                : item.iconName === "UploadCloud" ? UploadCloud
                  : item.iconName === "ListChecks" ? ListChecks
                    : Settings;
              return (
                <Button key={item.href} variant="ghost" size="sm" asChild>
                  <Link href={item.href}>
                    <Icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <MobileMenu
              navItems={allNavItems}
              userName={user.name}
              userEmail={user.email}
              userRole={user.role}
            />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-(--app-fg)">{user.name}</p>
              <p className="text-xs text-(--app-muted)">{user.email}</p>
            </div>
            <Badge tone={user.role === Role.ADMIN ? "warning" : "neutral"}>{user.role}</Badge>
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Switch</Link>
            </Button>
            <form action={logout}>
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
