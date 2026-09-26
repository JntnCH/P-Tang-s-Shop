import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  Barcode as BarcodeIcon,
  Camera,
  CameraOff,
  CheckCircle2,
  Filter,
  Image as ImageIcon,
  Package,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { BarcodeDisplay } from "@/components/barcode/BarcodeDisplay";
import { PageHeader } from "@/components/layout/PageHeader";
import { AuthService } from "@/lib/auth-rbac";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { generateStoreBarcode, inspectBarcode } from "@/lib/barcode-engine";
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
      { title: "ระบบจัดการสินค้า | MiniMark" },
      {
        name: "description",
        content:
          "ระบบจัดการสินค้าสำหรับร้านโชว์ห่วย รหัสสินค้า SKU บาร์โค้ด รูปสินค้า หมวดหมู่ ราคาทุน-ขาย สต็อกคงเหลือ และจุดสั่งซื้อ",
      },
      { property: "og:title", content: "ระบบจัดการสินค้า | MiniMark" },
      { property: "og:description", content: "จัดการสินค้าในร้านโชว์ห่วย MiniMark" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);

  // Filtering & Searching
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Barcode Preview Modal (Phase 7)
  const [barcodePreviewModalOpen, setBarcodePreviewModalOpen] = useState(false);
  const [barcodePreviewProduct, setBarcodePreviewProduct] = useState<ProductItem | null>(null);

  // Form State
  const [formSku, setFormSku] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formCodeType, setFormCodeType] = useState<"QR" | "Barcode">("Barcode");
  const [formFormat, setFormFormat] = useState<string | undefined>("EAN_13");
  const [formName, setFormName] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formZone, setFormZone] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formCost, setFormCost] = useState<number>(0);
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(10);
  const [formMinStock, setFormMinStock] = useState<number>(5);
  const [formTargetStock, setFormTargetStock] = useState<number>(20);
  const [formReorderQty, setFormReorderQty] = useState<number>(15);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Form Validation & Error State
  const [formError, setFormError] = useState<string | null>(null);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // Camera Scanner inside Product Form
  const [scannerActive, setScannerActive] = useState(false);

  // Search Camera Scanner
  const [searchScannerActive, setSearchScannerActive] = useState(false);

  const handleScanDetected = (code: string, format?: string, type?: "QR" | "Barcode") => {
    setFormBarcode(code);
    setFormCodeType(type || "Barcode");
    setFormFormat(format || "EAN_13");
    stopScanner();
    setScannerActive(false);

    // Validate barcode duplication immediately
    validateBarcodeLive(code, editingProduct?.id);
  };

  const handleSearchScanDetected = (code: string) => {
    setSearchQuery(code);
    stopSearchScanner();
    setSearchScannerActive(false);
  };

  const {
    videoRef,
    error: scanError,
    start: startScanner,
    stop: stopScanner,
  } = useBarcodeScanner(handleScanDetected, { cooldownMs: 1500 });

  const {
    videoRef: searchVideoRef,
    error: searchScanError,
    start: startSearchScanner,
    stop: stopSearchScanner,
  } = useBarcodeScanner(handleSearchScanDetected, { cooldownMs: 1500 });

  const [canViewCostPrice, setCanViewCostPrice] = useState(
    AuthService.hasPermission("canViewCostPrice"),
  );

  const loadData = () => {
    setProducts(MasterStore.getProducts());
    setCategories(MasterStore.getCategories());
    setZones(MasterStore.getZones());
    setUnits(MasterStore.getUnits());
    setCanViewCostPrice(AuthService.hasPermission("canViewCostPrice"));
  };

  useEffect(() => {
    loadData();
    const handleStoreChange = () => loadData();
    window.addEventListener("minimark_store_change", handleStoreChange);
    window.addEventListener("minimark_auth_change", handleStoreChange);
    return () => {
      window.removeEventListener("minimark_store_change", handleStoreChange);
      window.removeEventListener("minimark_auth_change", handleStoreChange);
    };
  }, []);

  const validateSkuLive = (skuValue: string, currentId?: string) => {
    if (!skuValue.trim()) {
      setSkuError("กรุณาระบุรหัสสินค้า / SKU");
      return false;
    }
    const isDup = MasterStore.checkDuplicateSku(skuValue, currentId);
    if (isDup) {
      setSkuError(`รหัส SKU "${skuValue.trim()}" ซ้ำกับสินค้าที่มีอยู่แล้วในระบบ`);
      return false;
    }
    setSkuError(null);
    return true;
  };

  const validateBarcodeLive = (barcodeValue: string, currentId?: string) => {
    if (!barcodeValue.trim()) {
      setBarcodeError("กรุณาระบุบาร์โค้ดสินค้า");
      return false;
    }
    const isDup = MasterStore.checkDuplicateBarcode(barcodeValue, currentId);
    if (isDup) {
      setBarcodeError(`รหัสบาร์โค้ด "${barcodeValue.trim()}" ซ้ำกับสินค้าอื่นในระบบ`);
      return false;
    }
    setBarcodeError(null);
    return true;
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    const autoSku = `SKU-${Date.now().toString().slice(-6)}`;
    setFormSku(autoSku);
    setFormBarcode("");
    setFormCodeType("Barcode");
    setFormFormat("EAN_13");
    setFormName("");
    setFormImageUrl("");
    setFormCategory(categories[0]?.id || "");
    setFormZone(zones[0]?.id || "");
    setFormUnit(units[0]?.id || "");
    setFormCost(0);
    setFormPrice(0);
    setFormStock(10);
    setFormMinStock(5);
    setFormTargetStock(20);
    setFormReorderQty(15);
    setFormIsActive(true);
    setFormError(null);
    setSkuError(null);
    setBarcodeError(null);
    setScannerActive(false);
    setModalOpen(true);
  };

  const handleAutoGenerateBarcode = (formatType: "EAN_13" | "CODE_128" | "QR_CODE") => {
    const generated = generateStoreBarcode(
      formatType,
      formSku.replace(/\W/g, "").slice(0, 4) || "PRD",
    );
    setFormBarcode(generated.barcode);
    setFormCodeType(formatType === "QR_CODE" ? "QR" : "Barcode");
    setFormFormat(generated.format);
    validateBarcodeLive(generated.barcode, editingProduct?.id);
  };

  const handleOpenBarcodePreview = (product: ProductItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBarcodePreviewProduct(product);
    setBarcodePreviewModalOpen(true);
  };

  const handleOpenEdit = (product: ProductItem) => {
    setEditingProduct(product);
    setFormSku(product.sku || `SKU-${product.id}`);
    setFormBarcode(product.barcode);
    setFormCodeType(product.codeType);
    setFormFormat(product.format);
    setFormName(product.name);
    setFormImageUrl(product.imageUrl || "");
    setFormCategory(product.categoryId);
    setFormZone(product.zoneId || "");
    setFormUnit(product.unitId);
    setFormCost(product.costPrice);
    setFormPrice(product.sellPrice);
    setFormStock(product.stock);
    setFormMinStock(product.minStock);
    setFormTargetStock(product.targetStock || product.reorderQuantity || 20);
    setFormReorderQty(product.reorderQuantity || 15);
    setFormIsActive(product.isActive ?? true);
    setFormError(null);
    setSkuError(null);
    setBarcodeError(null);
    setScannerActive(false);
    setModalOpen(true);
  };

  const handleSaveProduct = () => {
    setFormError(null);

    const isSkuValid = validateSkuLive(formSku, editingProduct?.id);
    const isBarcodeValid = validateBarcodeLive(formBarcode, editingProduct?.id);

    if (!formName.trim()) {
      setFormError("กรุณากรอกชื่อสินค้า");
      return;
    }

    if (!isSkuValid || !isBarcodeValid) {
      setFormError("กรุณาตรวจสอบข้อผิดพลาดด้านบน (ห้ามใช้ SKU หรือ บาร์โค้ดซ้ำ)");
      return;
    }

    if (formPrice < formCost) {
      // Warning or allow with alert
      console.warn("ราคาขายต่ำกว่าราคาทุน");
    }

    if (editingProduct) {
      MasterStore.updateProduct(editingProduct.id, {
        sku: formSku.trim(),
        barcode: formBarcode.trim(),
        codeType: formCodeType,
        format: formFormat,
        name: formName.trim(),
        imageUrl: formImageUrl.trim() || undefined,
        categoryId: formCategory || categories[0]?.id || "cat-general",
        zoneId: formZone || undefined,
        unitId: formUnit || units[0]?.id || "unit-piece",
        costPrice: Number(formCost) || 0,
        sellPrice: Number(formPrice) || 0,
        stock: Number(formStock) || 0,
        minStock: Number(formMinStock) || 0,
        targetStock: Number(formTargetStock) || Number(formReorderQty) || 20,
        reorderQuantity: Number(formReorderQty) || Number(formTargetStock) || 15,
        isActive: formIsActive,
      });
    } else {
      MasterStore.addProduct({
        sku: formSku.trim(),
        barcode: formBarcode.trim(),
        codeType: formCodeType,
        format: formFormat,
        name: formName.trim(),
        imageUrl: formImageUrl.trim() || undefined,
        categoryId: formCategory || categories[0]?.id || "cat-general",
        zoneId: formZone || undefined,
        unitId: formUnit || units[0]?.id || "unit-piece",
        costPrice: Number(formCost) || 0,
        sellPrice: Number(formPrice) || 0,
        stock: Number(formStock) || 0,
        minStock: Number(formMinStock) || 0,
        targetStock: Number(formTargetStock) || Number(formReorderQty) || 20,
        reorderQuantity: Number(formReorderQty) || Number(formTargetStock) || 15,
        isActive: formIsActive,
      });
    }

    stopScanner();
    setScannerActive(false);
    setModalOpen(false);
  };

  const handleToggleStatus = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    MasterStore.toggleProductStatus(id);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      MasterStore.deleteProduct(productToDelete.id);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || "ทั่วไป";
  const getZoneName = (id?: string) => (id ? zones.find((z) => z.id === id)?.name || "-" : "-");
  const getUnitName = (id: string) => units.find((u) => u.id === id)?.name || "ชิ้น";

  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.barcode.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query));

    const matchesCat = selectedCategory === "all" || p.categoryId === selectedCategory;
    const matchesZone = selectedZone === "all" || p.zoneId === selectedZone;

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && p.isActive !== false) ||
      (statusFilter === "INACTIVE" && p.isActive === false);

    return matchesSearch && matchesCat && matchesZone && matchesStatus;
  });

  const activeCount = products.filter((p) => p.isActive !== false).length;
  const inactiveCount = products.filter((p) => p.isActive === false).length;

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="size-6 text-primary" /> ระบบจัดการสินค้า (Phase 2)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            บันทึก SKU, บาร์โค้ด, ราคา, หมวดหมู่, รูปภาพ, สต็อก และตั้งค่าเปิด/ปิดการขาย
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenCreate}
            size="lg"
            className="h-11 sm:h-10 w-full sm:w-auto font-semibold gap-2 rounded-xl shadow-sm active:scale-95"
          >
            <Plus className="size-5" /> เพิ่มสินค้าใหม่
          </Button>
        </div>
      </div>

      {/* Filter, Search Bar & Quick Status Filter */}
      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardContent className="p-3 sm:p-5 space-y-3">
          <div className="grid gap-2.5 md:grid-cols-12">
            {/* Search Input with Scan Button */}
            <div className="relative md:col-span-5">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ, SKU หรือ ยิงบาร์โค้ด..."
                className="pl-9 pr-20 h-10 rounded-xl font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant={searchScannerActive ? "secondary" : "ghost"}
                  className="h-7 px-2 text-xs gap-1 rounded-lg"
                  onClick={() => {
                    if (searchScannerActive) {
                      stopSearchScanner();
                      setSearchScannerActive(false);
                    } else {
                      setSearchScannerActive(true);
                      void startSearchScanner();
                    }
                  }}
                >
                  <Camera className="size-3.5" /> สแกน
                </Button>
              </div>
            </div>

            {/* Category Select */}
            <div className="md:col-span-3">
              <CategorySelect
                value={selectedCategory === "all" ? "" : selectedCategory}
                onChange={(val) => setSelectedCategory(val || "all")}
                placeholder="ทุกหมวดหมู่สินค้า"
                className="h-10 rounded-xl"
              />
            </div>

            {/* Zone Select */}
            <div className="md:col-span-2">
              <ZoneSelect
                value={selectedZone === "all" ? "" : selectedZone}
                onChange={(val) => setSelectedZone(val || "all")}
                placeholder="ทุกโซนจัดเก็บ"
                className="h-10 rounded-xl"
              />
            </div>

            {/* Status Filter */}
            <div className="md:col-span-2">
              <Select
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val as "ALL" | "ACTIVE" | "INACTIVE")}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="สถานะสินค้า" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทั้งหมด ({products.length})</SelectItem>
                  <SelectItem value="ACTIVE">เปิดใช้งาน ({activeCount})</SelectItem>
                  <SelectItem value="INACTIVE">ปิดใช้งาน ({inactiveCount})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Search Camera View if Open */}
          {searchScannerActive ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Camera className="size-4" /> กล้องสแกนค้นหาสินค้า
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    stopSearchScanner();
                    setSearchScannerActive(false);
                  }}
                >
                  ปิดกล้อง
                </Button>
              </div>
              <div className="relative aspect-[16/9] max-h-48 w-full overflow-hidden rounded-lg bg-black mx-auto">
                <video ref={searchVideoRef} className="size-full object-cover" muted playsInline />
                <div className="pointer-events-none absolute inset-4 rounded-lg border-2 border-primary/80 animate-pulse" />
              </div>
              {searchScanError ? (
                <p className="text-xs text-destructive text-center">{searchScanError}</p>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  สแกนบาร์โค้ดหรือ QR Code เพื่อกรองสินค้าทันที
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* MOBILE LIST VIEW (Cards Optimized for touch & quick reading) */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-muted-foreground">
            รายการสินค้า ({filteredProducts.length} / {products.length})
          </span>
          <span className="text-xs text-muted-foreground">แตะการ์ดเพื่อดูรายละเอียด/แก้ไข</span>
        </div>

        {filteredProducts.length === 0 ? (
          <Card className="rounded-2xl p-8 text-center text-muted-foreground">
            <Package className="size-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">ไม่พบสินค้าตามเงื่อนไขที่ค้นหา</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 rounded-xl text-xs"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedZone("all");
                setStatusFilter("ALL");
              }}
            >
              ล้างตัวกรองทั้งหมด
            </Button>
          </Card>
        ) : (
          filteredProducts.map((p) => {
            const isOut = p.stock <= 0;
            const isLow = !isOut && p.stock <= p.minStock;
            const isActive = p.isActive !== false;

            return (
              <div
                key={p.id}
                onClick={() => handleOpenEdit(p)}
                className={`rounded-2xl border p-3.5 shadow-sm space-y-2.5 transition-all cursor-pointer active:scale-[0.99] ${
                  isActive ? "bg-card hover:border-primary/50" : "bg-muted/40 opacity-75"
                }`}
              >
                {/* Header row: Image / Thumbnail + Barcode & SKU + Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Product Image Thumbnail */}
                    <div className="size-14 rounded-xl border bg-muted/60 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="size-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Package className="size-6 text-muted-foreground/50" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-foreground truncate">
                          {p.sku || "NO-SKU"}
                        </span>
                        <FormatBadge type={p.codeType} format={p.format} />
                        {!isActive && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            ปิดใช้งาน
                          </Badge>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground truncate">
                        {p.barcode}
                      </div>
                    </div>
                  </div>

                  {/* Quick Active Toggle & Actions */}
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant={isActive ? "outline" : "secondary"}
                      size="icon"
                      className={`size-8 rounded-lg ${isActive ? "text-emerald-600" : "text-muted-foreground"}`}
                      title={isActive ? "คลิกเพื่อปิดการใช้งาน" : "คลิกเพื่อเปิดใช้งาน"}
                      onClick={(e) => handleToggleStatus(p.id, e)}
                    >
                      {isActive ? <Power className="size-4" /> : <PowerOff className="size-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-primary hover:text-primary"
                      onClick={(e) => handleOpenBarcodePreview(p, e)}
                      title="ดูบาร์โค้ด / พิมพ์ฉลาก"
                    >
                      <BarcodeIcon className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEdit(p)}
                      aria-label="แก้ไข"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-destructive/80 hover:text-destructive"
                      onClick={() => {
                        setProductToDelete(p);
                        setDeleteDialogOpen(true);
                      }}
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

                {/* Category & Zone */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{getCategoryName(p.categoryId)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">โซน {getZoneName(p.zoneId)}</span>
                </div>

                {/* Stock, Target, and Pricing */}
                <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
                  <div>
                    <span className="text-muted-foreground">ขาย: </span>
                    <span className="font-bold text-foreground text-sm">
                      ฿{p.sellPrice.toLocaleString("th-TH")}
                    </span>
                    {canViewCostPrice && (
                      <span className="text-muted-foreground text-[11px] ml-1.5">
                        (ทุน ฿{p.costPrice})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">คงเหลือ:</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        isOut ? "text-destructive" : isLow ? "text-amber-600" : "text-emerald-700"
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
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">
              รายการสินค้าทั้งหมด ({filteredProducts.length} รายการ)
            </CardTitle>
            <CardDescription>
              ตรวจสอบรหัส SKU, บาร์โค้ด, หมวดหมู่, ราคาขาย, สต็อกคงเหลือ และสถานะเปิด/ปิด
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">รูป</TableHead>
                  <TableHead className="w-32">SKU</TableHead>
                  <TableHead className="w-36">บาร์โค้ด / รหัส</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>หมวดหมู่</TableHead>
                  <TableHead className="text-right">ราคาทุน</TableHead>
                  <TableHead className="text-right">ราคาขาย</TableHead>
                  <TableHead className="text-right">คงเหลือ</TableHead>
                  <TableHead className="text-center w-24">สถานะ</TableHead>
                  <TableHead className="text-right w-28">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                      ไม่พบข้อมูลสินค้าตามเงื่อนไข
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const isOut = product.stock <= 0;
                    const isLow = !isOut && product.stock <= product.minStock;
                    const isActive = product.isActive !== false;

                    return (
                      <TableRow
                        key={product.id}
                        className={!isActive ? "bg-muted/30 opacity-70" : undefined}
                      >
                        {/* Thumbnail */}
                        <TableCell>
                          <div className="size-10 rounded-lg border bg-muted/50 overflow-hidden flex items-center justify-center">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="size-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <Package className="size-5 text-muted-foreground/40" />
                            )}
                          </div>
                        </TableCell>

                        {/* SKU */}
                        <TableCell className="font-mono text-xs font-bold text-foreground">
                          {product.sku || "-"}
                        </TableCell>

                        {/* Barcode & Format */}
                        <TableCell>
                          <div className="space-y-1">
                            <span className="font-mono text-xs font-semibold block truncate">
                              {product.barcode}
                            </span>
                            <FormatBadge type={product.codeType} format={product.format} />
                          </div>
                        </TableCell>

                        {/* Name & Updated info */}
                        <TableCell>
                          <div className="font-medium text-foreground">{product.name}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>โซน {getZoneName(product.zoneId)}</span>
                            <span>•</span>
                            <span>แก้ไขล่าสุด: {product.updatedAt || "-"}</span>
                          </div>
                        </TableCell>

                        {/* Category */}
                        <TableCell className="text-muted-foreground text-sm">
                          {getCategoryName(product.categoryId)}
                        </TableCell>

                        {/* Cost Price */}
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {canViewCostPrice
                            ? `฿${product.costPrice.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`
                            : "฿•••"}
                        </TableCell>

                        {/* Sell Price */}
                        <TableCell className="text-right font-mono text-sm font-semibold text-foreground">
                          ฿{product.sellPrice.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </TableCell>

                        {/* Stock Quantity */}
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span
                              className={`font-mono font-bold text-sm ${
                                isOut
                                  ? "text-destructive"
                                  : isLow
                                    ? "text-amber-600"
                                    : "text-foreground"
                              }`}
                            >
                              {product.stock} {getUnitName(product.unitId)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              (เตือน: {product.minStock} / เป้า:{" "}
                              {product.targetStock || product.reorderQuantity})
                            </span>
                          </div>
                        </TableCell>

                        {/* Active Status */}
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(product.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-zinc-400"}`}
                            />
                            {isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                          </button>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-primary hover:text-primary"
                              onClick={(e) => handleOpenBarcodePreview(product, e)}
                              title="ดูบาร์โค้ด / พิมพ์ฉลาก"
                            >
                              <BarcodeIcon className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEdit(product)}
                              title="แก้ไขสินค้า"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive/80 hover:text-destructive"
                              onClick={() => {
                                setProductToDelete(product);
                                setDeleteDialogOpen(true);
                              }}
                              title="ลบสินค้า"
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

      {/* CREATE / EDIT PRODUCT DIALOG (Phase 2 Comprehensive Modal) */}
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
        <DialogContent className="w-[94vw] max-w-2xl rounded-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <Package className="size-5 text-primary" />
              {editingProduct ? `แก้ไขข้อมูลสินค้า: ${editingProduct.name}` : "เพิ่มสินค้าใหม่"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              กรอกข้อมูลให้ครบถ้วน ข้อมูล SKU และ Barcode ต้องไม่ซ้ำกับสินค้าอื่น
            </DialogDescription>
          </DialogHeader>

          {/* Form Alert Message */}
          {formError && (
            <Alert variant="destructive" className="py-2.5 text-xs rounded-xl">
              <AlertCircle className="size-4" />
              <AlertTitle className="text-xs font-bold">แจ้งเตือน</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 py-1">
            {/* Section 1: Identification (SKU & Barcode & Image) */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* SKU */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">รหัสสินค้า / SKU *</Label>
                  {skuError && <span className="text-[10px] text-destructive">{skuError}</span>}
                </div>
                <Input
                  placeholder="เช่น SKU-FOD-001"
                  className={`h-10 font-mono text-sm rounded-xl ${skuError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  value={formSku}
                  onChange={(e) => {
                    setFormSku(e.target.value);
                    validateSkuLive(e.target.value, editingProduct?.id);
                  }}
                />
              </div>

              {/* Barcode & Live Camera */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">รหัสบาร์โค้ด / QR *</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[10px] text-primary"
                      onClick={() => handleAutoGenerateBarcode("EAN_13")}
                      title="สุ่ม EAN-13 (885) พร้อม Check Digit"
                    >
                      <Sparkles className="size-3 mr-0.5" /> สุ่ม EAN-13
                    </Button>
                    <Button
                      type="button"
                      variant={scannerActive ? "secondary" : "outline"}
                      size="sm"
                      className="h-6 px-2 text-[11px] gap-1 rounded-md active:scale-95"
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
                          <CameraOff className="size-3" /> ปิดกล้อง
                        </>
                      ) : (
                        <>
                          <Camera className="size-3" /> ยิงกล้อง
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <Input
                  placeholder="เช่น 8850124001153"
                  className={`h-10 font-mono text-sm rounded-xl ${barcodeError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  value={formBarcode}
                  onChange={(e) => {
                    setFormBarcode(e.target.value);
                    validateBarcodeLive(e.target.value, editingProduct?.id);
                  }}
                />
                {barcodeError ? (
                  <p className="text-[10px] text-destructive mt-0.5">{barcodeError}</p>
                ) : formBarcode ? (
                  <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    {inspectBarcode(formBarcode).isValid ? (
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> {inspectBarcode(formBarcode).notes}
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="size-3" /> {inspectBarcode(formBarcode).notes}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Camera Preview Area if active */}
            {scannerActive ? (
              <div className="space-y-2 rounded-xl border bg-black/5 p-2.5 dark:bg-black/30">
                <div className="relative aspect-[4/3] max-h-48 w-full overflow-hidden rounded-lg bg-black mx-auto">
                  <video ref={videoRef} className="size-full object-cover" muted playsInline />
                  <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-primary/80 animate-pulse" />
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

            {/* Section 2: Name & Image URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ชื่อสินค้า *</Label>
              <Input
                placeholder="เช่น มาม่า บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้ง 55g"
                className="h-10 rounded-xl font-medium"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            {/* Image URL with Preview */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="size-3.5" /> URL รูปภาพสินค้า (ไม่บังคับ)
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/product-image.jpg"
                  className="h-10 rounded-xl text-xs"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                />
                {formImageUrl && (
                  <div className="size-10 rounded-lg border overflow-hidden shrink-0 bg-muted">
                    <img
                      src={formImageUrl}
                      alt="Preview"
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Master Dropdowns */}
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

            {/* Section 4: Prices */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">ราคาทุน (บาท)</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  className="h-10 rounded-xl bg-background"
                  value={formCost}
                  onChange={(e) => setFormCost(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary">ราคาขายหน้าร้าน (บาท)</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  className="h-10 rounded-xl bg-background font-bold text-foreground"
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Section 5: Inventory & Reorder Management */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">คงเหลือปัจจุบัน</Label>
                <Input
                  type="number"
                  min="0"
                  className="h-10 rounded-xl font-bold"
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
                <Label className="text-xs text-muted-foreground">เป้าหมายในสต็อก</Label>
                <Input
                  type="number"
                  min="1"
                  className="h-10 rounded-xl"
                  value={formTargetStock}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFormTargetStock(val);
                    setFormReorderQty(val);
                  }}
                />
              </div>
            </div>

            {/* Section 6: Status Toggle Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl border bg-background">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">สถานะสินค้า (เปิดขาย)</Label>
                <p className="text-xs text-muted-foreground">
                  หากปิดการใช้งาน สินค้าจะไม่แสดงในรายการรับเข้า/จ่ายออก
                </p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
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
              disabled={!formName.trim() || !formBarcode.trim() || !formSku.trim()}
            >
              บันทึกข้อมูลสินค้า
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base text-destructive flex items-center gap-2">
              <Trash2 className="size-5" /> ยืนยันการลบสินค้า
            </DialogTitle>
            <DialogDescription className="text-xs mt-2">
              คุณต้องการลบรายการสินค้า{" "}
              <span className="font-bold text-foreground">"{productToDelete?.name}"</span>{" "}
              ออกจากระบบใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl flex-1"
              onClick={() => setDeleteDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-xl flex-1 font-semibold"
              onClick={handleConfirmDelete}
            >
              ลบสินค้า
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BARCODE PREVIEW & PRINT DIALOG (Phase 7) */}
      <Dialog open={barcodePreviewModalOpen} onOpenChange={setBarcodePreviewModalOpen}>
        <DialogContent className="w-[94vw] max-w-md rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <BarcodeIcon className="size-5 text-primary" />
              ฉลากบาร์โค้ดสินค้า (Barcode & QR)
            </DialogTitle>
            <DialogDescription className="text-xs">
              {barcodePreviewProduct?.name} ({barcodePreviewProduct?.sku})
            </DialogDescription>
          </DialogHeader>

          {barcodePreviewProduct && (
            <div className="py-2 space-y-3">
              <BarcodeDisplay
                value={barcodePreviewProduct.barcode}
                format={
                  barcodePreviewProduct.format ||
                  (barcodePreviewProduct.codeType === "QR" ? "QR_CODE" : "EAN_13")
                }
                title={barcodePreviewProduct.name}
                price={barcodePreviewProduct.sellPrice}
                className="w-full shadow-none border"
                showActions={true}
              />

              <div className="text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span>มาตรฐาน:</span>
                  <span className="font-mono font-bold text-foreground">
                    {barcodePreviewProduct.format || barcodePreviewProduct.codeType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>สถานะความถูกต้อง:</span>
                  <span className="text-emerald-600 font-semibold">
                    {inspectBarcode(barcodePreviewProduct.barcode).notes}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              asChild
              className="w-full sm:w-auto rounded-xl text-xs gap-1.5 font-semibold bg-primary text-primary-foreground"
            >
              <Link to="/printers">
                <Tag className="size-3.5" /> พิมพ์ป้ายราคา & สติกเกอร์ (Phase 9)
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto rounded-xl text-xs"
              onClick={() => setBarcodePreviewModalOpen(false)}
            >
              ปิดหน้าต่าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
