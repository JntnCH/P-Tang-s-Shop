import { createFileRoute } from "@tanstack/react-router";
import { History, Package, PackageCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { FormatBadge } from "@/components/master/MasterSelects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MasterStore, type ReceiveItem } from "@/lib/store";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "ประวัติการสแกนรับสินค้า | MiniMark" },
      {
        name: "description",
        content: "ประวัติการสแกนตรวจรับสินค้าเข้าสต็อก ระบุประเภท QR / Barcode",
      },
      { property: "og:title", content: "ประวัติการสแกนรับสินค้า | MiniMark" },
      { property: "og:description", content: "ประวัติการตรวจรับสินค้าเข้าสต็อก" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [receives, setReceives] = useState<ReceiveItem[]>([]);

  const load = () => setReceives(MasterStore.getReceives());

  useEffect(() => {
    load();
    window.addEventListener("minimark_store_change", load);
    return () => window.removeEventListener("minimark_store_change", load);
  }, []);

  const handleClear = () => {
    if (confirm("ต้องการล้างประวัติการรับสินค้าทั้งหมดใช่หรือไม่?")) {
      MasterStore.clearReceives();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            ประวัติการสแกนตรวจรับสินค้า
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            บันทึกประวัติการสแกนรับสินค้าเข้าสต็อก พร้อมประเภทโค้ด
          </p>
        </div>
        {receives.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="h-10 sm:h-9 text-xs rounded-xl gap-1.5 self-start sm:self-auto"
          >
            <Trash2 className="size-4 text-destructive" /> ล้างประวัติ
          </Button>
        ) : null}
      </div>

      {/* MOBILE LIST CARDS */}
      <div className="block md:hidden space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-muted-foreground">
            รายการล่าสุด ({receives.length})
          </span>
        </div>

        {receives.length === 0 ? (
          <Card className="rounded-2xl p-8 text-center text-muted-foreground">
            <Package className="size-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">ยังไม่มีประวัติการสแกน</p>
          </Card>
        ) : (
          receives.map((rec) => (
            <div key={rec.id} className="rounded-2xl border bg-card p-3.5 shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FormatBadge type={rec.codeType} format={rec.format} />
                  <span className="font-mono text-xs text-muted-foreground truncate">
                    {rec.barcode}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                  {rec.scannedAt}
                </span>
              </div>

              <div className="text-sm font-semibold text-foreground line-clamp-2">
                {rec.productName}
              </div>

              <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                <span className="text-muted-foreground">รับเข้า:</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  +{rec.quantity} {rec.unit}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE */}
      <Card className="hidden md:block rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PackageCheck className="size-5 text-emerald-600" />
            รายการตรวจรับสินค้าล่าสุด ({receives.length} รายการ)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">วันเวลาที่สแกน</TableHead>
                  <TableHead className="w-32">ประเภทสแกน</TableHead>
                  <TableHead className="w-40">รหัส / บาร์โค้ด</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead className="text-right w-32">จำนวนที่รับ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receives.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      ยังไม่มีประวัติการสแกนรับสินค้า
                    </TableCell>
                  </TableRow>
                ) : (
                  receives.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {rec.scannedAt}
                      </TableCell>
                      <TableCell>
                        <FormatBadge type={rec.codeType} format={rec.format} />
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {rec.barcode}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {rec.productName}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600">
                        +{rec.quantity} {rec.unit}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
