import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Store } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { mobileNavItems, navItems } from "@/lib/nav";

function Brand() {
  return (
    <div className="flex items-center gap-3 px-4 py-5">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Store className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-base font-bold">MiniMark</span>
        <span className="block text-xs text-muted-foreground">ระบบจัดการร้านโชว์ห่วย</span>
      </span>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-1 px-3 pb-6">
      {navItems.map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-72 shrink-0 border-r bg-sidebar lg:block">
        <div className="sticky top-0">
          <Brand />
          <NavList />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-card/90 px-3 py-2 backdrop-blur lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="เปิดเมนู">
                <Menu className="size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <Brand />
              <NavList onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-base font-bold">MiniMark</span>
        </header>

        <main className="flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-12">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {mobileNavItems.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-6" />
                <span className="line-clamp-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
