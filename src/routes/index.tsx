import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Boxes,
  CircleSlash,
  ClipboardList,
  Coins,
  Package,
  ScanLine,
  PackagePlus,
  PackageMinus,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PhaseNotice } from "@/components/layout/PhaseNotice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "แดชบอร์ด | MiniMark" },
      { name: "description", content: "ภาพรวมสต็อกสินค้า สินค้าใกล้หมด และรายการที่ต้องสั่งซื้อ" },
      { property: "og:title", content: "แดชบอร์ด | MiniMark" },
      { property: "og:description", content: "ภาพรวมสต็อกสินค้าของร้านโชว์ห่วย" },
    ],
  }),
  component: Dashboard,
});

const summary = [
  { label: "สินค้าทั้งหมด", icon: Package, tone: "text-foreground" },
  { label: "สินค้าที่มีในสต็อก", icon: Boxes, tone: "text-success" },
  { label: "สินค้าใกล้หมด", icon: AlertTriangle, tone: "text-warning" },
  { label: "สินค้าหมด", icon: CircleSlash, tone: "text-destructive" },
  { label: "รายการที่ต้องสั่งซื้อ", icon: ClipboardList, tone: "text-info" },
  { label: "มูลค่าสินค้าคงคลัง (ประมาณ)", icon: Coins, tone: "text-foreground" },
];

const quickActions = [
  { to: "/scan", label: "สแกนเพิ่มสินค้า", icon: ScanLine },
  { to: "/receive", label: "รับสินค้าเข้า", icon: PackagePlus },
  { to: "/issue", label: "จ่ายสินค้าออก", icon: PackageMinus },
  { to: "/products", label: "จัดการสินค้า", icon: Package },
];

function Dashboard() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="แดชบอร์ด" description="ภาพรวมสถานะสินค้าและสต็อกของร้าน" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {summary.map((item) => (
          <Card key={item.label} className="gap-2">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground lg:text-sm">
                <item.icon className={`size-4 ${item.tone}`} />
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">—</p>
              <p className="mt-1 text-xs text-muted-foreground">ยังไม่มีข้อมูล</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Button key={action.to} asChild variant="secondary" size="lg" className="h-auto py-4">
            <Link to={action.to} className="flex flex-col items-center gap-2 text-sm font-semibold">
              <action.icon className="size-6" />
              {action.label}
            </Link>
          </Button>
        ))}
      </div>

      <PhaseNotice phase="Phase 1">
        หน้านี้เป็นโครงสร้าง UI เท่านั้น ตัวเลขสรุปจะเชื่อมข้อมูลจริงหลังสร้างระบบสินค้าและสต็อก
        (Phase 2–4)
      </PhaseNotice>
    </div>
  );
}
