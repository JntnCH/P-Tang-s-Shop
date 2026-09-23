import { Link } from "wouter";
import {
  AlertTriangle,
  Boxes,
  CircleSlash,
  ClipboardList,
  Coins,
  Package,
  PackageMinus,
  PackagePlus,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/product-types";

const summaryCards = [
  { key: "totalProducts", label: "สินค้าทั้งหมด", icon: Package, tone: "text-foreground" },
  { key: "inStock", label: "สินค้าที่มีในสต็อก", icon: Boxes, tone: "text-success" },
  { key: "lowStock", label: "สินค้าใกล้หมด", icon: AlertTriangle, tone: "text-warning" },
  { key: "outOfStock", label: "สินค้าหมด", icon: CircleSlash, tone: "text-destructive" },
  { key: "toReorder", label: "รายการที่ต้องสั่งซื้อ", icon: ClipboardList, tone: "text-info" },
  { key: "inventoryValue", label: "มูลค่าสินค้าคงคลัง", icon: Coins, tone: "text-foreground" },
] as const;

const quickActions = [
  { to: "/products", label: "จัดการสินค้า", icon: Package },
  { to: "/stock", label: "ดูสต็อกสินค้า", icon: Boxes },
  { to: "/scan", label: "สแกนบาร์โค้ด", icon: ScanLine },
  { to: "/receive", label: "รับสินค้าเข้า", icon: PackagePlus },
  { to: "/issue", label: "จ่ายสินค้าออก", icon: PackageMinus },
];

type Summary = {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  toReorder: number;
  inventoryValue: number;
};

export default function Home() {
  const summaryQuery = trpc.inventory.summary.useQuery();
  const summary = summaryQuery.data as Summary | undefined;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-sm font-semibold text-primary">ภาพรวมร้านวันนี้</p>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">แดชบอร์ด</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">ภาพรวมสถานะสินค้าและสต็อกของร้าน</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/products">
            <Package className="size-4" />
            เพิ่มสินค้า
          </Link>
        </Button>
      </div>

      {summaryQuery.error ? (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          ยังเชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบการตั้งค่า DATABASE_URL แล้วลองใหม่
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {summaryCards.map((item) => {
          const value = summary?.[item.key];
          const displayValue = item.key === "inventoryValue" && value !== undefined ? formatCurrency(value) : value;
          return (
            <Card key={item.label} className="gap-2 border-0 shadow-[var(--shadow-card)]">
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground lg:text-sm">
                  <item.icon className={`size-4 ${item.tone}`} />
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums lg:text-3xl">
                  {summaryQuery.isLoading ? "…" : displayValue ?? "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {summaryQuery.isLoading ? "กำลังโหลดข้อมูล" : "ข้อมูลจากระบบสินค้าและสต็อก"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">เมนูลัด</h2>
          <span className="text-xs text-muted-foreground">เข้าถึงงานที่ใช้บ่อย</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {quickActions.map((action) => (
            <Button key={action.to} asChild variant="secondary" size="lg" className="h-auto min-h-24 py-4">
              <Link href={action.to} className="flex flex-col items-center gap-2 text-sm font-semibold">
                <action.icon className="size-6 text-primary" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="surface-card flex flex-col gap-3 border-l-4 border-l-primary p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">PHASE 2: ระบบสินค้าและสต็อก</p>
          <p className="mt-1 text-sm text-muted-foreground">เพิ่มสินค้า ค้นหา barcode และดูสถานะคงเหลือได้จากเมนูด้านซ้าย</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/stock">ดูสต็อกสินค้า</Link>
        </Button>
      </div>
    </div>
  );
}
