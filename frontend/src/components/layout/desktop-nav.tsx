"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, Settings, ShieldCheck, UploadCloud, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  iconName: string;
};

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  UploadCloud,
  ListChecks,
  Settings,
  ShieldCheck,
};

export function DesktopNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {navItems.map((item) => {
        const Icon = iconMap[item.iconName] || LayoutDashboard;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Button
            key={item.href}
            variant="ghost"
            size="sm"
            asChild
            className={cn("nav-link-button hover:bg-violet-600 hover:text-white")}
            data-active={isActive ? "true" : undefined}
          >
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              style={isActive ? { color: "var(--app-accent)" } : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
