"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MessageSquare, Settings, Shield, Users } from "lucide-react";

import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/chat", label: "Chat", icon: MessageSquare, needsRoles: false },
  { href: "/users", label: "Users", icon: Users, needsRoles: false },
  { href: "/roles", label: "Roles", icon: Shield, needsRoles: true },
  { href: "/settings", label: "Settings", icon: Settings, needsRoles: false },
] as const;

export function Sidebar({
  userName,
  userEmail,
  roleName,
  canSeeRoles,
}: {
  userName: string;
  userEmail: string;
  roleName: string;
  canSeeRoles: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="mav-navy flex w-64 flex-col border-r border-white/10 text-sidebar-foreground">
      <div className="border-b border-white/10 p-5">
        <div className="inline-flex rounded-xl bg-white px-3 py-2 shadow-md shadow-black/20">
          <Image
            src="/mav-logo.png"
            alt="MAV Systems"
            width={114}
            height={48}
            priority
            className="h-8 w-auto"
          />
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {NAV.filter((item) => !item.needsRoles || canSeeRoles).map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4">
        <div className="px-1">
          <p className="truncate text-sm font-medium text-white">{userName}</p>
          <p className="truncate text-xs text-white/50">{userEmail}</p>
          <p className="mt-1 text-xs text-primary/90">{roleName}</p>
        </div>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" />
            Log out
          </Button>
        </form>
      </div>
    </aside>
  );
}
