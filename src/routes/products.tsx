import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  CircleSlash,
  Package,
  Pencil,
  Plus,
  QrCode,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import {
  CategorySelect,
  FormatBadge,
  UnitSelect,
  ZoneSelect,
} from "@/components/master/MasterSelects";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import {
  MasterStore,
  type CategoryItem,
  type ProductItem,
  type UnitItem,
  type ZoneItem,
} from "@/lib/store";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "จัดการสินค้า | MiniMark" },
      {
        name: "description",
        content: "จัดการรายการสินค้า สแกน QR / Barcode พร้อมระบุหมวดหมู่ โซน และหน่วยนับ",
      },
      { property: "og:title", content: "จัดการสินค้า | MiniMark" },
      { property: "og:description", content: "จัดการสินค้าในร้าน MiniMark" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedZone, setSelectedZone] = useState<string>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Form State
  const [formBarcode, setFormBarcode] = useState("");
  const [formCodeType, setFormCodeType] = useState<"QR" | "Barcode">("Barcode");
  const [formFormat, setFormFormat] = useState<string | undefined>("EAN_13");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formZone, setFormZone] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formCost, setFormCost] = useState<number>(0);
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(10);
  const [formMinStock, setFormMinStock] = useState<number>(5);
  const [formReorderQty, setFormReorderQty] = useState<number>(10);

  // Camera Scanner inside Product Form
  const [scannerActive, setScannerActive] = useState(false);
  const handleScanDetected = (code: string, format?: string, type?: "QR" | "Barcode") => {
    setFormBarcode(code);
    setFormCodeType(type || "Barcode");
    setFormFormat(format || "EAN_13");
    stopScanner();
    setScannerActive(false);
  };

  const {
    videoRef,
    status: scannerStatus,
    error: scanError,
    start: startScanner,
    stop: stopScanner,
  } = useBarcodeScanner(handleScanDetected, {
    cooldownMs: 1500,
  });

  const loadData = () => {
    setProducts(MasterStore.getProducts());
    setCategories(MasterStore.getCategories());
    setZones(MasterStore.getZones());
    setUnits(MasterStore.getUnits());
  };

  useEffect(() => {
    loadData();
    window.addEventListener("minimark_store_change", loadData);
    return () => window.removeEventListener("minimark_store_change", loadData);
  }, []);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormBarcode("");
    setFormCodeType("Barcode");
    setFormFormat("EAN_13");
    setFormName("");
    setFormCategory(categories[0]?.id || "");
    setFormZone(zones[0]?.id || "");
    setFormUnit(units[0]?.id || "");
    setFormCost(0);
    setFormPrice(0);
    setFormStock(10);
    setFormMinStock(5);
    setFormReorderQty(10);
    setScannerActive(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (product: ProductItem) => {
    setEditingProduct(product);
    setFormBarcode(product.barcode);
    setFormCodeType(product.codeType);
    setFormFormat(product.format);
    setFormName(product.name);
    setFormCategory(product.categoryId);
    setFormZone(product.zoneId);
    setFormUnit(product.unitId);
    setFormCost(product.costPrice);
    setFormPrice(product.sellPrice);
    setFormStock(product.stock);
    setFormMinStock(product.minStock);
    setFormReorderQty(product.reorderQuantity);
    setScannerActive(false);
    setModalOpen(true);
  };

  const handleSaveProduct = () => {
    if (!formName.trim() || !formBarcode.trim()) return;

    if (editingProduct) {
      MasterStore.updateProduct(editingProduct.id, {
        barcode: formBarcode.trim(),
        codeType: formCodeType,
        format: formFormat,
        name: formName.trim(),
        categoryId: formCategory,
        zoneId: formZone,
        unitId: formUnit,
        costPrice: Number(formCost),
        sellPrice: Number(formPrice),
        stock: Number(formStock),
        minStock: Number(formMinStock),
        reorderQuantity: Number(formReorderQty),
      });
    } else {
      MasterStore.addProduct({
        barcode: formBarcode.trim(),
        codeType: formCodeType,
        format: formFormat,
        name: formName.trim(),
        categoryId: formCategory,
        zoneId: formZone,
        unitId: formUnit,
        costPrice: Number(formCost),
        sellPrice: Number(formPrice),
        stock: Number(formStock),
        minStock: Number(formMinStock),
        reorderQuantity: Number(formReorderQty),
      });
    }

    setModalOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm("ต้องการลบสินค้านี้ใช่หรือไม่?")) {
      MasterStore.deleteProduct(id);
    }
  };

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || id;
  const getZoneName = (id: string) => zones.find((z) => z.id === id)?.name || id;
  const getUnitName = (id: string) => units.find((u) => u.id === id)?.name || id;

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "all" || p.categoryId === selectedCategory;
    const matchesZone = selectedZone === "all" || p.zoneId === selectedZone;
    return matchesSearch && matchesCat && matchesZone;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            จัดการสินค้า
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            สแกน QR / บาร์โค้ด บันทึกสต็อก และจุดสั่งซื้อ
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          size="lg"
          className="h-11 sm:h-10 w-full sm:w-auto font-semibold gap-2 rounded-xl shadow-sm active:scale-95"
        >
          <Plus className="size-5" /> เพิ่มสินค้าใหม่
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardContent className="p-3 sm:p-5">
          <div className="grid gap-2.5 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ หรือ บาร์โค้ด..."
                className="pl-9 h-10 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <CategorySelect
                value={selectedCategory === "all" ? "" : selectedCategory}
                onChange={(val) => setSelectedCategory(val || "all")}
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

      {/* MOBILE LIST VIEW (Optimized for 375px–430px screens) */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-muted-foreground">
            รายการสินค้าทั้งหมด ({filteredProducts.length})
          </span>
          <span className="text-xs text-muted-foreground">แตะการ์ดเพื่อแก้ไข</span>
        </div>

        {filteredProducts.length === 0 ? (
          <Card className="rounded-2xl p-8 text-center text-muted-foreground">
            <Package className="size-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">ไม่พบสินค้าตามเงื่อนไข</p>
          </Card>
        ) : (
          filteredProducts.map((p) => {
            const isOut = p.stock <= 0;
            const isLow = !isOut && p.stock <= p.minStock;

            return (
              <div
                key={p.id}
                className="rounded-2xl border bg-card p-3.5 shadow-sm space-y-2.5 transition-all active:bg-muted/30"
              >
                {/* Header row: Barcode, Format badge, Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-bold truncate text-foreground">
                      {p.barcode}
                    </span>
                    <FormatBadge type={p.codeType} format={p.format} />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-lg text-muted-foreground hover:text-foreground active:scale-90"
                      onClick={() => handleOpenEdit(p)}
                      aria-label="แก้ไข"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-lg text-destructive/80 hover:text-destructive active:scale-90"
                      onClick={() => handleDeleteProduct(p.id)}
                      aria-label="ลบสินค้า"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Product Name */}
                <div className="font-semibold text-base text-foreground leading-snug line-clamp-2">
                  {p.name}
                </div>

                {/* Category & Zone unboxed metadata */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{getCategoryName(p.categoryId)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{getZoneName(p.zoneId)}</span>
                </div>

                {/* Stock & Price footer */}
                <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                  <div className="text-xs">
                    <span className="text-muted-foreground">ราคา: </span>
                    <span className="font-bold text-foreground">฿{p.sellPrice}</span>
                    <span className="text-muted-foreground text-[11px] ml-1.5">
                      (ทุน ฿{p.costPrice})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">คงเหลือ:</span>
                    <span
                      className={`text-sm font-bold font-mono ${
                        isOut ? "text-destructive" : isLow ? "text-amber-600" : "text-foreground"
                      }`}
                    >
                      {p.stock} {getUnitName(p.unitId)}
                    </span>
                    {isOut ? (
                      <span className="text-[10px] bg-destructive/10 text-destructive font-semibold px-1.5 py-0.5 rounded">
                        หมด
                      </span>
                    ) : isLow ? (
                      <span className="text-[10px] bg-amber-500/10 text-amber-700 font-semibold px-1.5 py-0.5 rounded">
                        ใกล้หมด
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <Card className="hidden md:block rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            รายการสินค้าทั้งหมด ({filteredProducts.length} รายการ)
          </CardTitle>
          <CardDescription>แสดงบาร์โค้ด QR Code หมวดหมู่ โซน ราคา และสต็อกคงเหลือ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">รหัส / บาร์โค้ด</TableHead>
                  <TableHead className="w-28">ประเภทสแกน</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>หมวดหมู่</TableHead>
                  <TableHead>โซนสินค้า</TableHead>
                  <TableHead className="text-right">ราคาขาย</TableHead>
                  <TableHead className="text-right">คงเหลือ</TableHead>
                  <TableHead className="text-right w-24">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูลสินค้า
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const isOut = product.stock <= 0;
                    const isLow = !isOut && product.stock <= product.minStock;

                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {product.barcode}
                        </TableCell>
                        <TableCell>
                          <FormatBadge type={product.codeType} format={product.format} />
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {product.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {getCategoryName(product.categoryId)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {getZoneName(product.zoneId)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          ฿{product.sellPrice.toLocaleString("th-TH")}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-mono font-semibold text-sm ${
                              isOut
                                ? "text-destructive"
                                : isLow
                                  ? "text-amber-600"
                                  : "text-foreground"
                            }`}
                          >
                            {product.stock} {getUnitName(product.unitId)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEdit(product)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
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

      {/* CREATE / EDIT PRODUCT DIALOG (Mobile-First Modal) */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) {
            stopScanner();
            setScannerActive(false);
          }
          setModalOpen(open);
        }}
      >
        <DialogContent className="w-[94vw] max-w-lg rounded-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base sm:text-lg">
              {editingProduct ? "แก้ไขข้อมูลสินค้า" : "เพิ่มสินค้าใหม่เข้าสู่ระบบ"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Barcode & Scanner */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">รหัสบาร์โค้ด / QR Code *</Label>
                <div className="flex items-center gap-2">
                  <FormatBadge type={formCodeType} format={formFormat} />
                  <Button
                    type="button"
                    size="sm"
                    variant={scannerActive ? "secondary" : "outline"}
                    className="h-8 px-2.5 text-xs gap-1.5 rounded-lg active:scale-95"
                    onClick={() => {
                      if (scannerActive) {
                        stopScanner();
                        setScannerActive(false);
                      } else {
                        setScannerActive(true);
                        void startScanner();
                      }
                    }}
                  >
                    {scannerActive ? (
                      <>
                        <CameraOff className="size-3.5" /> ปิดกล้อง
                      </>
                    ) : (
                      <>
                        <Camera className="size-3.5" /> สแกนด้วยกล้อง
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Camera Preview Area if active */}
              {scannerActive ? (
                <div className="space-y-2 rounded-xl border bg-black/5 p-2.5 dark:bg-black/30">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black">
                    <video ref={videoRef} className="size-full object-cover" muted playsInline />
                    <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-primary/80 animate-pulse" />
                  </div>
                  {scanError ? (
                    <Alert variant="destructive" className="py-2 text-xs">
                      <AlertDescription>{scanError}</AlertDescription>
                    </Alert>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground animate-pulse">
                      กำลังสแกน... กรุณาเล็งกล้องไปที่บาร์โค้ดหรือ QR Code
                    </p>
                  )}
                </div>
              ) : null}

              <Input
                placeholder="เช่น 8850123456789 หรือ QR-PROD-001"
                className="h-10 font-mono text-sm rounded-xl"
                value={formBarcode}
                onChange={(e) => setFormBarcode(e.target.value)}
              />
            </div>

            {/* Product Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">ชื่อสินค้า *</Label>
              <Input
                placeholder="เช่น นมถั่วเหลืองไวตามิ้ลค์ 300 มล."
                className="h-10 rounded-xl"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            {/* Master dropdown selections */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">หมวดหมู่</Label>
                <CategorySelect
                  value={formCategory}
                  onChange={setFormCategory}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">โซนจัดเก็บ</Label>
                <ZoneSelect value={formZone} onChange={setFormZone} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">หน่วยนับ</Label>
                <UnitSelect value={formUnit} onChange={setFormUnit} className="h-10 rounded-xl" />
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">ราคาทุน (บาท)</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  className="h-10 rounded-xl"
                  value={formCost}
                  onChange={(e) => setFormCost(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">ราคาขายหน้าร้าน (บาท)</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  className="h-10 rounded-xl"
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Stock Quantities */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">สต็อกปัจจุบัน</Label>
                <Input
                  type="number"
                  min="0"
                  className="h-10 rounded-xl"
                  value={formStock}
                  onChange={(e) => setFormStock(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">จุดเตือนขั้นต่ำ</Label>
                <Input
                  type="number"
                  min="0"
                  className="h-10 rounded-xl"
                  value={formMinStock}
                  onChange={(e) => setFormMinStock(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">สั่งซื้อเพิ่ม/ครั้ง</Label>
                <Input
                  type="number"
                  min="1"
                  className="h-10 rounded-xl"
                  value={formReorderQty}
                  onChange={(e) => setFormReorderQty(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 sm:pt-4 border-t border-border/60">
            <Button
              variant="outline"
              className="h-11 sm:h-10 rounded-xl w-full sm:w-auto"
              onClick={() => {
                stopScanner();
                setScannerActive(false);
                setModalOpen(false);
              }}
            >
              ยกเลิก
            </Button>
            <Button
              className="h-11 sm:h-10 rounded-xl w-full sm:w-auto font-semibold"
              onClick={handleSaveProduct}
              disabled={!formName.trim() || !formBarcode.trim()}
            >
              บันทึกข้อมูลสินค้า
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
