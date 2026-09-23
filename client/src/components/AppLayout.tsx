import { Link, useLocation } from "wouter";
import { useState, type ReactNode } from "react";
import {
  Boxes,
  ClipboardList,
  History,
  LayoutDashboard,
  Menu,
  Package,
  PackageMinus,
  PackagePlus,
  Printer,
  ScanLine,
  Settings,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { to: "/products", label: "สินค้า", icon: Package },
  { to: "/stock", label: "สต็อกสินค้า", icon: Boxes },
  { to: "/receive", label: "เช็คของเข้า", icon: PackagePlus },
  { to: "/issue", label: "จ่ายสินค้าออก", icon: PackageMinus },
  { to: "/reorder", label: "รายการต้องสั่งซื้อ", icon: ClipboardList },
  { to: "/history", label: "ประวัติรายการ", icon: History },
  { to: "/printers", label: "เครื่องพิมพ์", icon: Printer },
  { to: "/settings", label: "ตั้งค่า", icon: Settings },
];

function Brand() {
  return (
    <div className="flex items-center gap-3 px-4 py-5">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Store className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-base font-bold">Scan &amp; Go</span>
        <span className="block text-xs text-muted-foreground">ระบบจัดการร้านโชว์ห่วย</span>
      </span>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  return (
    <nav className="flex flex-col gap-1 px-3 pb-6">
      {navItems.map((item) => {
        const active = item.to === "/" ? location === "/" : location.startsWith(item.to);
        return (
          <Link
            key={item.to}
            href={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
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
  const [location] = useLocation();
  const activeItem = navItems.find((item) => item.to === location);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-72 shrink-0 border-r bg-sidebar lg:block">
        <div className="sticky top-0">
          <Brand />
          <NavList />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card/90 px-3 py-2 backdrop-blur lg:hidden">
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
          <div className="flex items-center gap-2">
            <ScanLine className="size-5 text-primary" />
            <span className="text-base font-bold">{activeItem?.label ?? "Scan & Go"}</span>
          </div>
        </header>
        <main className="flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-12">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {navItems.slice(0, 5).map((item) => {
            const active = item.to === "/" ? location === "/" : location.startsWith(item.to);
            return (
              <Link
                key={item.to}
                href={item.to}
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
