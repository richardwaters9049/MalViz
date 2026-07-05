"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ShieldCheck, LayoutDashboard, UploadCloud, ListChecks, Settings, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface MobileMenuProps {
  navItems: Array<{ href: string; label: string; iconName: string }>;
  userName: string;
  userEmail: string;
  userRole: string;
}

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  UploadCloud,
  ListChecks,
  Settings,
};

export function MobileMenu({ navItems, userName, userEmail, userRole }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-(--app-bg) md:hidden">
          <div className="flex items-center justify-between border-b border-(--app-border) bg-(--app-surface) px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-white">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-(--app-fg)">MalViz</p>
                <p className="text-xs text-(--app-muted)">Malware Analysis MVP</p>
              </div>
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

          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => {
              const Icon = iconMap[item.iconName] || LayoutDashboard;
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  size="lg"
                  asChild
                  className="justify-start"
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
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-(--app-fg)">{userName}</p>
                <p className="text-xs text-(--app-muted)">{userEmail}</p>
              </div>
              <Badge tone={userRole === "ADMIN" ? "warning" : "neutral"}>
                {userRole}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" asChild onClick={() => setIsOpen(false)}>
                <Link href="/">Switch</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
