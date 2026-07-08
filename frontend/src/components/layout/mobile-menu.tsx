"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, UploadCloud, ListChecks, Settings, ShieldCheck, type LucideIcon } from "lucide-react";
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
  ShieldCheck,
};

function AnimatedBurgerIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-5 w-5" aria-hidden>
      <span
        className={cn(
          "absolute left-1/2 top-[4px] h-0.5 w-5 -translate-x-1/2 rounded-full bg-current transition-[top,transform,background-color] duration-300 ease-out",
          open && "top-1/2 -translate-y-1/2 rotate-45 bg-cyan-500",
        )}
      />
      <span
        className={cn(
          "absolute left-1/2 top-1/2 h-0.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current transition-[opacity,transform] duration-200 ease-out",
          open && "scale-x-0 opacity-0",
        )}
      />
      <span
        className={cn(
          "absolute left-1/2 bottom-[4px] h-0.5 w-5 -translate-x-1/2 rounded-full bg-current transition-[bottom,transform,background-color] duration-300 ease-out",
          open && "bottom-1/2 translate-y-1/2 -rotate-45 bg-cyan-500",
        )}
      />
      <span
        className={cn(
          "absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 opacity-0 shadow-[0_0_14px_rgba(34,211,238,0.9)] transition-[opacity,transform] duration-300 ease-out",
          open && "scale-100 opacity-100",
          !open && "scale-0",
        )}
      />
    </span>
  );
}

export function MobileMenu({ navItems, userName, userEmail, userRole, logoutAction }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const pathname = usePathname();
  const titleId = useId();

  const openMenu = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }

    setIsMounted(true);
    window.requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }

    // Keep the drawer mounted briefly so the icon and panel can play their exit animation.
    closeTimerRef.current = window.setTimeout(() => {
      setIsMounted(false);
    }, 260);
  }, []);

  const toggleMenu = useCallback(() => {
    if (isOpen) {
      closeMenu();
      return;
    }

    openMenu();
  }, [closeMenu, isOpen, openMenu]);

  useEffect(() => {
    if (!isMounted) return;

    const originalOverflow = document.body.style.overflow;
    // Lock the page behind the drawer so touch scrolling stays inside the menu.
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, isMounted]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMenu}
        className={cn(
          "relative overflow-hidden md:hidden transition-[background-color,transform] duration-300 ease-out",
          isOpen && "rotate-90 bg-(--app-surface-muted)",
        )}
        aria-controls="mobile-navigation"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
      >
        <AnimatedBurgerIcon open={isOpen} />
      </Button>

      {isMounted && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className={cn(
              "absolute inset-0 bg-black/45 transition-opacity duration-200 ease-out",
              isOpen ? "opacity-100" : "opacity-0",
            )}
            aria-label="Close navigation menu"
            onClick={closeMenu}
          />
          <aside
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-(--app-border) bg-(--app-surface) shadow-2xl transition-[opacity,transform] duration-300 ease-out",
              isOpen ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0",
            )}
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
                size="icon"
                onClick={closeMenu}
                className="relative overflow-hidden"
                aria-label="Close menu"
              >
                <AnimatedBurgerIcon open={isOpen} />
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
                      "h-12 justify-start text-base hover:bg-transparent hover:!text-(--app-accent)",
                    )}
                    onClick={closeMenu}
                  >
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      style={isActive ? { color: "var(--app-accent)" } : undefined}
                    >
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
