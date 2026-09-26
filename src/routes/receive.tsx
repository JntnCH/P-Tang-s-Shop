import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  PackageCheck,
  PackagePlus,
  Plus,
  RotateCcw,
  ScanLine,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { FormatBadge } from "@/components/master/MasterSelects";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScannerDeduplicator, classifyScanType, type ScannedCodeType } from "@/lib/scanner-dedup";
import { MasterStore, type ProductItem } from "@/lib/store";

export const Route = createFileRoute("/receive")({
  head: () => ({
    meta: [
      { title: "ตรวจรับสินค้าเข้า (Receive Check) | MiniMark" },
      {
        name: "description",
        content:
          "สแกน QR Code และ Barcode หลายรูปแบบเพื่อตรวจรับสินค้าเข้าสต็อก พร้อมแสดงชนิดของรหัสที่สแกนได้",
      },
      {
        property: "og:title",
        content: "ตรวจรับสินค้าเข้า (Receive Check) | MiniMark",
      },
      {
        property: "og:description",
        content: "ระบบตรวจรับสินค้าเข้าด้วยการสแกนบาร์โค้ดและ QR Code",
      },
    ],
  }),
  component: ReceiveCheckPage,
});

export interface ScannedEntry {
  id: string;
  barcode: string;
  format?: string | undefined;
  codeType: ScannedCodeType;
  productName: string;
  unit: string;
  quantity: number;
  scannedAt: string;
  isRegistered: boolean;
}

function ReceiveCheckPage() {
  const [items, setItems] = useState<ScannedEntry[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  const handleDetectedCode = (code: string, format?: string, type?: ScannedCodeType) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    const matchedProduct = MasterStore.findByBarcode(trimmed);
    const resolvedType = type || (trimmed.toUpperCase().startsWith("QR") ? "QR" : "Barcode");
    const units = MasterStore.getUnits();
    const unitName = matchedProduct
      ? units.find((u) => u.id === matchedProduct.unitId)?.name || "ชิ้น"
      : "ชิ้น";

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.barcode === trimmed);
      const timeStr = new Date().toLocaleTimeString("th-TH");

      if (existingIndex >= 0) {
        const existingItem = prev[existingIndex];
        if (!existingItem) return prev;
        const updated = [...prev];
        updated[existingIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + 1,
          scannedAt: timeStr,
        };
        return updated;
      }

      const newItem: ScannedEntry = {
        id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        barcode: trimmed,
        format: format || matchedProduct?.format,
        codeType: resolvedType,
        productName: matchedProduct ? matchedProduct.name : "สินค้าใหม่ (ยังไม่ได้ลงทะเบียน)",
        unit: unitName,
        quantity: 1,
        scannedAt: timeStr,
        isRegistered: Boolean(matchedProduct),
      };

      return [newItem, ...prev];
    });
  };

  const {
    videoRef,
    status: scanStatus,
    error: scanError,
    permissionDenied,
    diagnostics,
    start: startScanner,
    stop: stopScanner,
    resetDeduplication,
  } = useBarcodeScanner(handleDetectedCode, { cooldownMs: 1800 });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetectedCode(
      manualCode.trim(),
      "MANUAL",
      manualCode.toUpperCase().startsWith("QR") ? "QR" : "Barcode",
    );
    setManualCode("");
  };

  const handleQuantityChange = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter((i): i is ScannedEntry => i !== null),
    );
  };

  const handleSaveToStock = () => {
    if (items.length === 0) return;

    items.forEach((item) => {
      MasterStore.receiveStock(
        item.barcode,
        item.quantity,
        "พนักงานตรวจรับสินค้า",
        `ตรวจรับสินค้าเข้าสต็อก (${item.quantity} ${item.unit})`,
      );

      MasterStore.addReceive({
        barcode: item.barcode,
        codeType: item.codeType,
        format: item.format,
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        scannedAt: item.scannedAt || new Date().toLocaleString("th-TH"),
      });
    });

    setSaveSuccessMsg(
      `บันทึกตรวจรับสินค้าสำเร็จจำนวน ${items.length} รายการ (ปรับปรุงยอดสต็อกและบันทึกประวัติ Movement เรียบร้อยแล้ว)`,
    );
    setItems([]);
    setTimeout(() => setSaveSuccessMsg(""), 5000);
  };

  const totalQuantity = items.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="ตรวจรับสินค้าเข้า (Receive Check)"
        description="สแกน QR Code หรือ Barcode หลายรูปแบบเพื่อตรวจรับสินค้าเข้าสต็อก"
      />

      {saveSuccessMsg ? (
        <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200 rounded-2xl">
          <CheckCircle2 className="size-5 text-emerald-600" />
          <AlertTitle className="font-semibold">บันทึกสำเร็จ</AlertTitle>
          <AlertDescription className="text-xs">{saveSuccessMsg}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        {/* CAMERA SCANNER COLUMN */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="rounded-2xl shadow-sm border-border/80">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-sm sm:text-base text-foreground">
                  <ScanLine className="size-5 text-primary" /> กล้องสแกนเนอร์
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    scanStatus === "scanning"
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {scanStatus === "scanning" ? "กล้องทำงานอยู่" : "กล้องปิด"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              {/* Real-time Video Viewport */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black">
                <video
                  ref={videoRef}
                  className="size-full object-cover"
                  muted
                  playsInline
                  aria-label="ภาพจากกล้องสำหรับสแกนสินค้า"
                />

                {scanStatus !== "scanning" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground bg-muted/90 backdrop-blur-xs">
                    <Camera className="size-10 opacity-50" />
                    <p className="text-sm font-semibold text-foreground">
                      แตะปุ่มด้านล่างเพื่อเปิดกล้อง
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      สแกนได้ทั้งบาร์โค้ดสินค้า (1D) และ QR Code ทันที
                    </p>
                  </div>
                ) : (
                  <div className="pointer-events-none absolute inset-6 flex items-center justify-center">
                    <div className="size-full rounded-2xl border-2 border-primary shadow-2xl animate-pulse" />
                  </div>
                )}
              </div>

              {/* Permission & Error Warnings */}
              {scanError ? (
                <Alert variant="destructive" className="py-2.5 rounded-xl">
                  <AlertCircle className="size-4" />
                  <AlertTitle className="text-xs font-semibold">
                    {permissionDenied ? "ไม่ได้รับสิทธิ์กล้อง" : "เกิดข้อผิดพลาด"}
                  </AlertTitle>
                  <AlertDescription className="text-xs">{scanError}</AlertDescription>
                </Alert>
              ) : null}

              {/* Camera Toggle Button (Thumb-Zone Friendly: 48px) */}
              {scanStatus === "scanning" ? (
                <Button
                  size="lg"
                  variant="destructive"
                  className="w-full h-12 gap-2 rounded-xl font-semibold active:scale-95 shadow-sm"
                  onClick={stopScanner}
                >
                  <CameraOff className="size-5" /> ปิดกล้องสแกน
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full h-12 gap-2 rounded-xl font-semibold active:scale-95 shadow-sm"
                  onClick={() => void startScanner()}
                >
                  <Camera className="size-5" /> เปิดกล้องสแกนสินค้า
                </Button>
              )}

              {/* Manual Input Fallback */}
              <div className="pt-2 border-t space-y-1.5">
                <span className="text-xs text-muted-foreground font-medium">
                  หรือกรอกรหัสด้วยมือ:
                </span>
                <form suppressHydrationWarning onSubmit={handleManualSubmit} className="flex gap-2">
                  <Input
                    placeholder="เช่น 8850123456789..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="h-10 text-sm rounded-xl font-mono"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    className="h-10 shrink-0 gap-1 rounded-xl px-4"
                  >
                    <Plus className="size-4" /> เพิ่ม
                  </Button>
                </form>
              </div>

              {/* Diagnostics Box */}
              <div className="rounded-xl bg-muted/60 p-3 text-xs space-y-1 text-muted-foreground">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span className="flex items-center gap-1">
                    <Activity className="size-3.5 text-primary" /> ระบบสแกนเนอร์
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[10px] rounded"
                    onClick={resetDeduplication}
                  >
                    <RotateCcw className="size-3 mr-1" /> รีเซ็ตกันซ้ำ
                  </Button>
                </div>
                <div className="flex justify-between">
                  <span>Engine:</span>
                  <span className="font-mono text-foreground">{diagnostics.readerEngine}</span>
                </div>
                <div className="flex justify-between">
                  <span>ล่าสุดที่สแกน:</span>
                  <span className="font-mono text-foreground truncate max-w-[180px]">
                    {diagnostics.lastScannedCode
                      ? `${diagnostics.lastScannedCode} (${diagnostics.lastScannedType})`
                      : "ยังไม่มี"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SCANNED ITEMS RECEIVE LIST COLUMN */}
        <div className="lg:col-span-7 space-y-3">
          {/* Quick Mobile Action Bar */}
          {items.length > 0 ? (
            <div className="block lg:hidden rounded-2xl border bg-card p-3 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  ตรวจรับแล้ว {items.length} รายการ ({totalQuantity} ชิ้น)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
                  onClick={() => setItems([])}
                >
                  <Trash2 className="size-3.5 mr-1" /> ล้าง
                </Button>
              </div>
              <Button
                size="lg"
                className="w-full h-12 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl active:scale-95 shadow-sm"
                onClick={handleSaveToStock}
              >
                <PackageCheck className="size-5" /> บันทึกเข้าสต็อก (+{totalQuantity} ชิ้น)
              </Button>
            </div>
          ) : null}

          {/* MOBILE LIST VIEW (Cards with large touch steppers) */}
          <div className="block md:hidden space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-muted-foreground">
                รายการตรวจรับ ({items.length})
              </span>
              <span className="text-xs text-muted-foreground">ปรับจำนวนด้วย + / -</span>
            </div>

            {items.length === 0 ? (
              <Card className="rounded-2xl p-8 text-center text-muted-foreground">
                <ScanLine className="size-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">ยังไม่มีรายการสแกนรับสินค้า</p>
                <p className="text-xs mt-1">เปิดกล้องด้านบนเพื่อเริ่มสแกน QR Code หรือบาร์โค้ด</p>
              </Card>
            ) : (
              items.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-card p-3 shadow-sm space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <FormatBadge type={item.codeType} format={item.format} />
                        <span className="font-mono text-xs text-muted-foreground truncate">
                          {item.barcode}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-foreground mt-1 line-clamp-2">
                        {item.productName}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:text-destructive shrink-0 active:scale-90"
                      onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                      aria-label="ลบรายการ"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-2">
                    <span className="text-xs text-muted-foreground font-mono">
                      เวลา {item.scannedAt}
                    </span>

                    {/* Touch Stepper */}
                    <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-0.5 border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-lg font-bold text-base hover:bg-background active:scale-90"
                        onClick={() => handleQuantityChange(item.id, -1)}
                      >
                        -
                      </Button>
                      <span className="font-mono font-bold text-sm min-w-8 text-center text-emerald-600 px-1">
                        +{item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-lg font-bold text-base hover:bg-background active:scale-90"
                        onClick={() => handleQuantityChange(item.id, 1)}
                      >
                        +
                      </Button>
                      <span className="text-xs text-muted-foreground pr-2 font-medium">
                        {item.unit}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP TABLE */}
          <Card className="hidden md:block rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <PackagePlus className="size-5 text-emerald-600" />
                  รายการตรวจรับ ({items.length} รายการ / {totalQuantity} ชิ้น)
                </CardTitle>
                <CardDescription>
                  ตรวจสอบความถูกต้องก่อนกดบันทึกเพิ่มเข้าสต็อกสินค้า
                </CardDescription>
              </div>
              {items.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground gap-1"
                  onClick={() => setItems([])}
                >
                  <Trash2 className="size-3.5" /> ล้างรายการ
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">ประเภท</TableHead>
                      <TableHead>รหัส / สินค้า</TableHead>
                      <TableHead className="w-32 text-center">จำนวนที่รับ</TableHead>
                      <TableHead className="w-24 text-right">เวลาสแกน</TableHead>
                      <TableHead className="w-16 text-right">ลบ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          ยังไม่มีรายการสแกนสินค้า กรุณาเปิดกล้องหรือกรอกรหัสด้านซ้าย
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <FormatBadge type={item.codeType} format={item.format} />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">{item.productName}</div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {item.barcode}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-7 rounded-lg"
                                onClick={() => handleQuantityChange(item.id, -1)}
                              >
                                -
                              </Button>
                              <span className="font-mono font-bold text-sm w-9 text-center text-emerald-600">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-7 rounded-lg"
                                onClick={() => handleQuantityChange(item.id, 1)}
                              >
                                +
                              </Button>
                              <span className="text-xs text-muted-foreground ml-1">
                                {item.unit}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {item.scannedAt}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                setItems((prev) => prev.filter((i) => i.id !== item.id))
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <Button
                size="lg"
                disabled={items.length === 0}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                onClick={handleSaveToStock}
              >
                <PackageCheck className="size-5" /> บันทึกตรวจรับเข้าสู่สต็อกสินค้า ({totalQuantity}{" "}
                ชิ้น)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Hook with ZXing and Deduplication
function useBarcodeScanner(
  onDetected: (code: string, format?: string, type?: ScannedCodeType) => void,
  options?: { cooldownMs?: number },
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [readerEngine, setReaderEngine] = useState<string>("@zxing/browser");
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastScannedType, setLastScannedType] = useState<ScannedCodeType | null>(null);

  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const dedupRef = useRef(new ScannerDeduplicator({ cooldownMs: options?.cooldownMs ?? 1800 }));

  const start = async () => {
    setError(null);
    setPermissionDenied(false);
    setStatus("starting");

    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      setReaderEngine("@zxing/browser (Multi-Format)");
      const reader = new BrowserMultiFormatReader();

      if (!videoRef.current) return;

      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, err) => {
          if (result) {
            const rawText = result.getText();
            const formatStr = result.getBarcodeFormat()?.toString() || "UNKNOWN";
            const codeType = classifyScanType(rawText, formatStr);

            if (dedupRef.current.shouldProcess(rawText)) {
              setLastScannedCode(rawText);
              setLastScannedType(codeType);
              onDetected(rawText, formatStr, codeType);
            }
          }
        },
      );

      controlsRef.current = controls;
      setStatus("scanning");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("Permission denied") ||
        msg.includes("NotAllowedError") ||
        msg.includes("permission")
      ) {
        setPermissionDenied(true);
        setError("ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณาอนุญาตในการตั้งค่าของเบราว์เซอร์");
      } else {
        setError(`ไม่สามารถเปิดกล้องได้: ${msg}`);
      }
      setStatus("error");
    }
  };

  const stop = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setStatus("idle");
  };

  const resetDeduplication = () => {
    dedupRef.current.reset();
    setLastScannedCode(null);
  };

  useEffect(() => {
    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, []);

  return {
    videoRef,
    status,
    error,
    permissionDenied,
    diagnostics: {
      readerEngine,
      lastScannedCode,
      lastScannedType,
    },
    start,
    stop,
    resetDeduplication,
  };
}
