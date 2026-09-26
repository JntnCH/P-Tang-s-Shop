import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  Barcode as BarcodeIcon,
  Camera,
  CameraOff,
  CheckCircle2,
  Copy,
  Download,
  Package,
  Printer,
  QrCode,
  RotateCcw,
  ScanLine,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { BarcodeDisplay } from "@/components/barcode/BarcodeDisplay";
import { PageHeader } from "@/components/layout/PageHeader";
import { FormatBadge } from "@/components/master/MasterSelects";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import {
  generateStoreBarcode,
  generateValidEAN13,
  inspectBarcode,
  type BarcodeFormatType,
} from "@/lib/barcode-engine";
import type { CodeType } from "@/lib/scanner-dedup";
import { MasterStore, type ProductItem } from "@/lib/store";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "สแกน & สร้างบาร์โค้ด (Phase 7) | MiniMark" },
      {
        name: "description",
        content:
          "สแกนบาร์โค้ดด้วยกล้อง, ตรวจสอบ Check Digit และระบบสร้างบาร์โค้ด EAN-13 / Code 128 / QR Code",
      },
      { property: "og:title", content: "สแกน & สร้างบาร์โค้ด (Phase 7) | MiniMark" },
      {
        property: "og:description",
        content: "สแกนบาร์โค้ด ตรวจสอบ Check Digit และสร้างบาร์โค้ดสินค้า",
      },
    ],
  }),
  component: ScanPage,
});

type ScannedItem = {
  code: string;
  format?: string | undefined;
  type: CodeType;
  at: string;
  matchedProduct?: ProductItem | undefined;
};

function ScanPage() {
  const [activeTab, setActiveTab] = useState<"scanner" | "generator">("scanner");
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [manual, setManual] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);

  // Barcode Generator Lab State (Phase 7)
  const [genFormat, setGenFormat] = useState<BarcodeFormatType>("EAN_13");
  const [genCode, setGenCode] = useState("8850124001153");
  const [genTitle, setGenTitle] = useState("มาม่า บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้ง");
  const [genPrice, setGenPrice] = useState<number>(7.0);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  useEffect(() => {
    setProducts(MasterStore.getProducts());
  }, []);

  const handleDetected = useCallback((code: string, format?: string, type?: CodeType) => {
    const resolvedType = type || (code.toUpperCase().startsWith("QR") ? "QR" : "Barcode");
    const matched = MasterStore.findByBarcode(code);

    setItems((prev) => {
      const existing = prev.find((i) => i.code === code);
      if (existing) return prev;
      toast.success(
        matched
          ? `พบสินค้า: ${matched.name} [${resolvedType}]`
          : `สแกนสำเร็จ [${resolvedType}]: ${code}`,
      );
      return [
        {
          code,
          format,
          type: resolvedType,
          at: new Date().toLocaleTimeString("th-TH"),
          matchedProduct: matched,
        },
        ...prev,
      ];
    });
  }, []);

  const {
    videoRef,
    status,
    error,
    permissionDenied,
    supported,
    diagnostics,
    start,
    stop,
    resetDeduplication,
  } = useBarcodeScanner(handleDetected);
  const scanning = status === "scanning" || status === "starting";

  // Generator Action Handlers
  const handleGenerateNewCode = (type: BarcodeFormatType) => {
    const result = generateStoreBarcode(type, "MINI");
    setGenCode(result.barcode);
    setGenFormat(result.format);
    toast.success(`สร้างรหัส ${result.format} สำเร็จ`);
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setGenCode(prod.barcode);
      setGenTitle(prod.name);
      setGenPrice(prod.sellPrice);
      setGenFormat(
        prod.codeType === "QR" ? "QR_CODE" : (prod.format as BarcodeFormatType) || "EAN_13",
      );
    }
  };

  const inspection = inspectBarcode(genCode);

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6 pb-12">
      <PageHeader
        title="สแกน & สร้างบาร์โค้ด (Phase 7)"
        description="สแกนบาร์โค้ดด้วยกล้อง, ตรวจสอบความถูกต้องของ Check Digit และห้องปฏิบัติการสร้างบาร์โค้ด EAN-13 / Code 128 / QR Code"
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-2 max-w-md h-auto p-1.5 rounded-2xl bg-muted gap-1">
          <TabsTrigger
            value="scanner"
            className="h-10 text-xs sm:text-sm font-semibold rounded-xl gap-1.5"
          >
            <Camera className="size-4" /> สแกนบาร์โค้ด & QR
          </TabsTrigger>
          <TabsTrigger
            value="generator"
            className="h-10 text-xs sm:text-sm font-semibold rounded-xl gap-1.5"
          >
            <BarcodeIcon className="size-4 text-primary" /> สร้าง & ตรวจสอบบาร์โค้ด
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: LIVE SCANNER */}
        <TabsContent value="scanner" className="space-y-4">
          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
            <CardContent className="space-y-3 pt-6">
              <div className="relative aspect-[4/3] max-h-72 w-full overflow-hidden rounded-xl bg-black mx-auto">
                <video
                  ref={videoRef}
                  className="size-full object-cover"
                  muted
                  playsInline
                  aria-label="ภาพจากกล้องสำหรับสแกนบาร์โค้ด"
                />
                {!scanning ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted p-4 text-center">
                    <ScanLine className="size-10 opacity-50" />
                    <p className="text-sm font-semibold text-foreground">
                      แตะปุ่มด้านล่างเพื่อเปิดกล้องสแกน
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      รองรับบาร์โค้ด 1 มิติ (EAN-13, Code 128, UPC) และ QR Code 2 มิติ
                    </p>
                  </div>
                ) : (
                  <div className="pointer-events-none absolute inset-6 sm:inset-10 rounded-xl border-2 border-primary/80 animate-pulse" />
                )}
              </div>

              {error ? (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="size-4" />
                  <AlertTitle className="text-xs font-semibold">
                    {permissionDenied ? "ไม่ได้รับสิทธิ์กล้อง" : "เกิดข้อผิดพลาด"}
                  </AlertTitle>
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              ) : null}

              {scanning ? (
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full gap-2 rounded-xl h-11"
                  onClick={stop}
                >
                  <CameraOff className="size-5" /> ปิดกล้องสแกนเนอร์
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full gap-2 rounded-xl h-11 font-semibold shadow-sm"
                  onClick={() => void start()}
                >
                  <Camera className="size-5" /> เปิดกล้องเพื่อสแกน
                </Button>
              )}

              <form
                suppressHydrationWarning
                className="flex gap-2 pt-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  const code = manual.trim();
                  if (!code) return;
                  handleDetected(
                    code,
                    "MANUAL",
                    code.toUpperCase().startsWith("QR") ? "QR" : "Barcode",
                  );
                  setManual("");
                }}
              >
                <Input
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="หรือกรอกรหัสบาร์โค้ด / QR ด้วยมือ..."
                  className="h-11 text-sm font-mono rounded-xl"
                />
                <Button
                  type="submit"
                  size="lg"
                  variant="secondary"
                  className="rounded-xl h-11 px-5"
                >
                  ค้นหา/เพิ่ม
                </Button>
              </form>

              {/* Diagnostics Box */}
              <div className="rounded-xl bg-muted/60 p-3 text-xs space-y-1 text-muted-foreground border">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Activity className="size-3.5 text-primary" /> สแกนเนอร์ Diagnostics
                    (@zxing/browser)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] rounded-lg"
                    onClick={resetDeduplication}
                  >
                    <RotateCcw className="size-3 mr-1" /> รีเซ็ต Cooldown
                  </Button>
                </div>
                <p>
                  <strong>สถานะกล้อง:</strong> {status} | <strong>กล้องที่รองรับ:</strong>{" "}
                  {supported ? "พร้อมใช้งาน" : "ไม่รองรับ"}
                </p>
                <p>
                  <strong>ล่าสุดที่สแกนได้:</strong>{" "}
                  {diagnostics.lastScannedCode ? (
                    <span className="font-mono text-primary font-bold">
                      {diagnostics.lastScannedCode} ({diagnostics.lastScannedType})
                    </span>
                  ) : (
                    "ยังไม่มี"
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Scanned Items History */}
          <Card className="rounded-2xl border-border/80 shadow-sm">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ScanLine className="size-4 text-primary" /> รหัสที่สแกนได้ในรอบนี้{" "}
                <Badge variant="secondary" className="font-mono">
                  {items.length}
                </Badge>
              </CardTitle>
              {items.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive"
                  onClick={() => setItems([])}
                >
                  <Trash2 className="size-3.5 mr-1" /> ล้างประวัติ
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  ยังไม่มีรายการที่สแกนได้
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {items.map((item) => (
                    <li key={item.code} className="flex items-center justify-between py-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <FormatBadge type={item.type} format={item.format} />
                          <span className="font-mono text-sm font-semibold truncate">
                            {item.code}
                          </span>
                        </div>
                        {item.matchedProduct && (
                          <div className="text-xs text-foreground font-medium truncate">
                            สินค้า: {item.matchedProduct.name} (คงเหลือ: {item.matchedProduct.stock}
                            )
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                        {item.at}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: BARCODE GENERATOR & TESTING LAB (PHASE 7 CORE) */}
        <TabsContent value="generator" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-12">
            {/* Left: Configuration Form */}
            <div className="md:col-span-6 space-y-4">
              <Card className="rounded-2xl border-border/80 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="size-5 text-primary" /> เครื่องมือสร้างบาร์โค้ด (Barcode
                    Generator)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    สร้างบาร์โค้ด EAN-13 คำนวณ Check Digit อัตโนมัติ, Code 128 หรือ QR Code
                    สำหรับพิมพ์ติดสินค้า
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3.5">
                  {/* Quick Select from existing products */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      ดึงข้อมูลจากสินค้าในระบบ (เลือกได้)
                    </Label>
                    <select
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs shadow-sm"
                      value={selectedProductId}
                      onChange={(e) => handleSelectProduct(e.target.value)}
                    >
                      <option value="">-- กำหนดข้อมูลเองอิสระ --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.barcode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      ประเภทบาร์โค้ด (Barcode Standard) *
                    </Label>
                    <Select
                      value={genFormat}
                      onValueChange={(val) => setGenFormat(val as BarcodeFormatType)}
                    >
                      <SelectTrigger className="h-10 rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EAN_13">
                          EAN-13 (มาตรฐานสินค้า 13 หลัก พร้อม Check Digit)
                        </SelectItem>
                        <SelectItem value="CODE_128">
                          Code 128 (รองรับตัวเลขและตัวอักษร Alphanumeric)
                        </SelectItem>
                        <SelectItem value="QR_CODE">
                          QR Code (2D Barcode สแกนเปิดข้อมูลหรือจ่ายเงิน)
                        </SelectItem>
                        <SelectItem value="EAN_8">EAN-8 (ฉลากขนาดเล็ก 8 หลัก)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">รหัสบาร์โค้ด (Barcode Data) *</Label>
                      {/* Fast Generation Buttons */}
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px] text-primary"
                          onClick={() => handleGenerateNewCode(genFormat)}
                        >
                          <Sparkles className="size-3 mr-0.5" /> สุ่มรหัสใหม่
                        </Button>
                      </div>
                    </div>
                    <Input
                      className="h-10 font-mono text-sm rounded-xl"
                      value={genCode}
                      onChange={(e) => setGenCode(e.target.value)}
                      placeholder="เช่น 8850124001153"
                    />
                  </div>

                  {/* Realtime Checksum Inspection Indicator */}
                  <div
                    className={`rounded-xl p-2.5 text-xs flex items-start gap-2 border ${
                      inspection.isValid
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                        : "bg-destructive/10 border-destructive/30 text-destructive"
                    }`}
                  >
                    {inspection.isValid ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold">
                        {inspection.isValid ? "โครงสร้างรหัสถูกต้อง" : "รหัสไม่ตรงตามมาตรฐาน"}
                      </div>
                      <div className="text-[11px] opacity-90 mt-0.5">{inspection.notes}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">ชื่อสินค้าบนฉลาก</Label>
                      <Input
                        className="h-10 text-xs rounded-xl"
                        value={genTitle}
                        onChange={(e) => setGenTitle(e.target.value)}
                        placeholder="ชื่อสินค้า..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">ราคาขาย (บาท)</Label>
                      <Input
                        type="number"
                        step="0.25"
                        className="h-10 font-mono text-xs rounded-xl"
                        value={genPrice}
                        onChange={(e) => setGenPrice(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Live Visual Preview & Actions */}
            <div className="md:col-span-6 space-y-4">
              <Card className="rounded-2xl border-border/80 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/40 pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <BarcodeIcon className="size-5 text-primary" /> ตัวอย่างฉลากบาร์โค้ด (Live
                      Preview)
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {genFormat}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex flex-col items-center justify-center min-h-[260px]">
                  <BarcodeDisplay
                    value={genCode || "000000000000"}
                    format={genFormat}
                    title={genTitle}
                    price={genPrice}
                    width={2.2}
                    height={75}
                    className="w-full max-w-sm"
                    showActions={true}
                  />
                </CardContent>
              </Card>

              {/* Guidelines Card */}
              <Card className="rounded-2xl p-4 text-xs space-y-2 bg-muted/40 border">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <Package className="size-4 text-primary" /> ข้อมูลมาตรฐานบาร์โค้ด
                </div>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  <li>
                    <strong>EAN-13:</strong> ขึ้นต้นด้วย <strong>885</strong> (ประเทศไทย) หรือ{" "}
                    <strong>20-29</strong> (สินค้าชั่งน้ำหนัก/ใช้ภายในร้าน) โดยหลักที่ 13 คือ Check
                    Digit
                  </li>
                  <li>
                    <strong>Code 128:</strong> เหมาะสำหรับบาร์โค้ดลังสินค้า, เลขที่ PO, รหัสเอกสาร
                    และ SKU สินค้า
                  </li>
                  <li>
                    <strong>QR Code:</strong> สแกนได้รอบทิศทาง 360 องศา บรรจุข้อมูลได้หลากหลาย
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
