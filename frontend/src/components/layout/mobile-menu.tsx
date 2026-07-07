"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X, LayoutDashboard, UploadCloud, ListChecks, Settings, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  navItems: Array<{ href: string; label: string; iconName: string }>;
  userName: string;
  userEmail: string;
  userRole: string;
  logoutAction: () => Promise<void>;
}

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  UploadCloud,
  ListChecks,
  Settings,
};

export function MobileMenu({ navItems, userName, userEmail, userRole, logoutAction }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    // Lock the page behind the drawer so touch scrolling stays inside the menu.
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden"
        aria-controls="mobile-navigation"
        aria-expanded={isOpen}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close navigation menu"
            onClick={() => setIsOpen(false)}
          />
          <aside
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-(--app-border) bg-(--app-surface) shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-(--app-border) px-4 py-4">
              <div className="min-w-0">
                {/* The drawer starts with identity because logout replaces the old account-switch flow. */}
                <p id={titleId} className="truncate text-sm font-semibold text-(--app-fg)">{userName}</p>
                <p className="mt-0.5 truncate text-xs text-(--app-muted)">{userEmail}</p>
                <Badge className="mt-2" tone={userRole === "ADMIN" ? "warning" : "neutral"}>
                  {userRole}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
              {navItems.map((item) => {
                const Icon = iconMap[item.iconName] || LayoutDashboard;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    size="lg"
                    asChild
                    className={cn(
                      "h-12 justify-start text-base",
                      isActive && "bg-[var(--app-surface-muted)]",
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <Link href={item.href}>
                      <Icon className="h-5 w-5" aria-hidden />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </nav>

            <div className="border-t border-(--app-border) p-4">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                <div className="shrink-0">
                  <ThemeToggle />
                </div>
                <form action={logoutAction}>
                  {/* Keep logout inside the drawer so the mobile header stays focused on navigation. */}
                  <Button variant="outline" size="sm" type="submit" className="w-full justify-center">
                    <LogOut className="h-4 w-4" aria-hidden />
                    Logout
                  </Button>
                </form>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
