import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, CircleSlash, Package, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { CategorySelect, FormatBadge, ZoneSelect } from "@/components/master/MasterSelects";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MasterStore,
  type CategoryItem,
  type ProductItem,
  type UnitItem,
  type ZoneItem,
} from "@/lib/store";

export const Route = createFileRoute("/stock")({
  head: () => ({
    meta: [
      { title: "สต็อกสินค้าคงเหลือ | MiniMark" },
      {
        name: "description",
        content: "ตรวจสอบจำนวนสินค้าคงเหลือ จุดสั่งซื้อ และกรองตามหมวดหมู่/โซน",
      },
      { property: "og:title", content: "สต็อกสินค้าคงเหลือ | MiniMark" },
      {
        property: "og:description",
        content: "เช็คสต็อกสินค้าคงเหลือในร้าน MiniMark",
      },
    ],
  }),
  component: StockPage,
});

function StockPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);

  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [selectedZone, setSelectedZone] = useState("all");

  const load = () => {
    setProducts(MasterStore.getProducts());
    setCategories(MasterStore.getCategories());
    setZones(MasterStore.getZones());
    setUnits(MasterStore.getUnits());
  };

  useEffect(() => {
    load();
    window.addEventListener("minimark_store_change", load);
    return () => window.removeEventListener("minimark_store_change", load);
  }, []);

  const getUnitName = (id: string) => units.find((u) => u.id === id)?.name || "ชิ้น";
  const getCatName = (id: string) => categories.find((c) => c.id === id)?.name || id;
  const getZoneName = (id: string) => zones.find((z) => z.id === id)?.name || id;

  const filtered = products.filter((p) => {
    const matchQuery =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCat === "all" || p.categoryId === selectedCat;
    const matchZone = selectedZone === "all" || p.zoneId === selectedZone;
    return matchQuery && matchCat && matchZone;
  });

  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="สต็อกสินค้าคงเหลือ"
        description="ตรวจสอบจำนวนคงเหลือ จุดสั่งซื้อ และกรองตามโซน/หมวดหมู่สินค้า"
      />

      {/* Summary Stat Pills on Mobile */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-2xl border bg-card p-3 text-center shadow-sm">
          <div className="text-[11px] text-muted-foreground">สินค้าทั้งหมด</div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-foreground mt-0.5">
            {products.length}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-3 text-center shadow-sm">
          <div className="text-[11px] text-amber-600 font-medium">ใกล้หมด</div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-amber-600 mt-0.5">
            {lowStockCount}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-3 text-center shadow-sm">
          <div className="text-[11px] text-destructive font-medium">สินค้าหมด</div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-destructive mt-0.5">
            {outOfStockCount}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardContent className="p-3 sm:p-5">
          <div className="grid gap-2.5 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ หรือ บาร์โค้ด..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl"
              />
            </div>
            <div>
              <CategorySelect
                value={selectedCat === "all" ? "" : selectedCat}
                onChange={(val) => setSelectedCat(val || "all")}
                placeholder="ทุกหมวดหมู่สินค้า"
                className="h-10 rounded-xl"
              />
            </div>
            <div>
              <ZoneSelect
                value={selectedZone === "all" ? "" : selectedZone}
                onChange={(val) => setSelectedZone(val || "all")}
                placeholder="ทุกโซนจัดเก็บ"
                className="h-10 rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MOBILE LIST VIEW */}
      <div className="block md:hidden space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-muted-foreground">
            รายการสต็อก ({filtered.length})
          </span>
        </div>

        {filtered.length === 0 ? (
          <Card className="rounded-2xl p-8 text-center text-muted-foreground">
            <Package className="size-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">ไม่พบข้อมูลสินค้า</p>
          </Card>
        ) : (
          filtered.map((item) => {
            const isOut = item.stock <= 0;
            const isLow = !isOut && item.stock <= item.minStock;

            return (
              <div
                key={item.id}
                className="rounded-2xl border bg-card p-3.5 shadow-sm space-y-2 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-xs font-semibold truncate text-muted-foreground">
                      {item.barcode}
                    </span>
                    <FormatBadge type={item.codeType} format={item.format} />
                  </div>
                  <div>
                    {isOut ? (
                      <Badge variant="destructive" className="text-[10px] py-0.5 px-2">
                        <CircleSlash className="size-3 mr-1" /> สินค้าหมด
                      </Badge>
                    ) : isLow ? (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] py-0.5 px-2"
                      >
                        <AlertTriangle className="size-3 mr-1" /> ใกล้หมด
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] py-0.5 px-2"
                      >
                        <CheckCircle2 className="size-3 mr-1" /> ปกติ
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="text-sm font-semibold text-foreground line-clamp-2">
                  {item.name}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{getCatName(item.categoryId)}</span>
                  <span>·</span>
                  <span>{getZoneName(item.zoneId)}</span>
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                  <span className="text-muted-foreground">
                    จุดเตือนสั่งซื้อ: {item.minStock} {getUnitName(item.unitId)}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">คงเหลือ:</span>
                    <span
                      className={`text-base font-bold font-mono ${
                        isOut ? "text-destructive" : isLow ? "text-amber-600" : "text-foreground"
                      }`}
                    >
                      {item.stock} {getUnitName(item.unitId)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <Card className="hidden md:block rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">รายการสต็อกสินค้า ({filtered.length} รายการ)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">รหัสสินค้า</TableHead>
                  <TableHead className="w-28">ประเภท</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>หมวดหมู่</TableHead>
                  <TableHead>โซนสินค้า</TableHead>
                  <TableHead className="text-right">สต็อกปัจจุบัน</TableHead>
                  <TableHead className="text-right">จุดเตือน (Min)</TableHead>
                  <TableHead className="text-center w-32">สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูลสินค้า
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const isOut = item.stock <= 0;
                    const isLow = !isOut && item.stock <= item.minStock;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {item.barcode}
                        </TableCell>
                        <TableCell>
                          <FormatBadge type={item.codeType} format={item.format} />
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {getCatName(item.categoryId)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {getZoneName(item.zoneId)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {item.stock} {getUnitName(item.unitId)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm font-mono">
                          {item.minStock} {getUnitName(item.unitId)}
                        </TableCell>
                        <TableCell className="text-center">
                          {isOut ? (
                            <Badge variant="destructive" className="gap-1">
                              <CircleSlash className="size-3" /> สินค้าหมด
                            </Badge>
                          ) : isLow ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1"
                            >
                              <AlertTriangle className="size-3" /> ใกล้หมด
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1"
                            >
                              <CheckCircle2 className="size-3" /> ปกติ
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
