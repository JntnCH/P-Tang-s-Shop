import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  Camera,
  CameraOff,
  RotateCcw,
  ScanLine,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { FormatBadge } from "@/components/master/MasterSelects";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import type { CodeType } from "@/lib/scanner-dedup";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "สแกนบาร์โค้ด & QR | MiniMark" },
      {
        name: "description",
        content: "สแกนบาร์โค้ดและ QR Code สินค้าด้วยกล้อง รองรับหลายรูปแบบผ่าน @zxing/browser",
      },
      { property: "og:title", content: "สแกนบาร์โค้ด & QR | MiniMark" },
      { property: "og:description", content: "สแกนบาร์โค้ดและ QR Code สินค้า" },
    ],
  }),
  component: ScanPage,
});

type ScannedItem = {
  code: string;
  format?: string | undefined;
  type: CodeType;
  at: string;
};

function ScanPage() {
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [manual, setManual] = useState("");

  const handleDetected = useCallback((code: string, format?: string, type?: CodeType) => {
    const resolvedType = type || (code.toUpperCase().startsWith("QR") ? "QR" : "Barcode");
    setItems((prev) => {
      const existing = prev.find((i) => i.code === code);
      if (existing) return prev;
      toast.success(`สแกนสำเร็จ [${resolvedType}]: ${code}`);
      return [
        {
          code,
          format,
          type: resolvedType,
          at: new Date().toLocaleTimeString("th-TH"),
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

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title="สแกนบาร์โค้ด & QR Code"
        description="สแกนรหัสสินค้าด้วยกล้องมือถือ/คอมพิวเตอร์ผ่าน @zxing/browser รองรับทั้ง QR และ 1D Barcode"
      />

      <Card className="overflow-hidden">
        <CardContent className="space-y-3 pt-6">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              className="size-full object-cover"
              muted
              playsInline
              aria-label="ภาพจากกล้องสำหรับสแกนบาร์โค้ด"
            />
            {!scanning ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted">
                <ScanLine className="size-10 opacity-50" />
                <p className="text-sm font-medium">กดปุ่มด้านล่างเพื่อเปิดกล้อง</p>
                <p className="text-xs text-muted-foreground">
                  รองรับ Safari, Chrome, Firefox และ WebView
                </p>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-primary/80 animate-pulse" />
            )}
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle className="text-xs font-semibold">
                {permissionDenied ? "ไม่ได้รับสิทธิ์กล้อง" : "เกิดข้อผิดพลาด"}
              </AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          ) : null}

          {scanning ? (
            <Button size="lg" variant="secondary" className="w-full gap-2" onClick={stop}>
              <CameraOff className="size-5" /> ปิดกล้อง
            </Button>
          ) : (
            <Button size="lg" className="w-full gap-2" onClick={() => void start()}>
              <Camera className="size-5" /> เปิดกล้องเพื่อสแกน
            </Button>
          )}

          <form
            className="flex gap-2"
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
              placeholder="กรอกรหัสบาร์โค้ด หรือ QR ด้วยมือ..."
              className="h-11 text-base"
            />
            <Button type="submit" size="lg" variant="secondary">
              เพิ่ม
            </Button>
          </form>

          {/* Diagnostics Box */}
          <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1 text-muted-foreground">
            <div className="flex items-center justify-between font-semibold text-foreground">
              <span className="flex items-center gap-1">
                <Activity className="size-3.5 text-primary" /> สแกนเนอร์ Diagnostics (@zxing/browser)
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px]"
                onClick={resetDeduplication}
              >
                <RotateCcw className="size-3 mr-1" /> รีเซ็ต Cooldown
              </Button>
            </div>
            <p>
              <strong>เครื่องยนต์สแกน:</strong> {diagnostics.readerEngine}
            </p>
            <p>
              <strong>ล่าสุดที่สแกนได้:</strong>{" "}
              {diagnostics.lastScannedCode ? (
                <span className="font-mono text-foreground">
                  {diagnostics.lastScannedCode} ({diagnostics.lastScannedType})
                </span>
              ) : (
                "ยังไม่มี"
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">
            รหัสที่สแกนได้ <Badge variant="secondary">{items.length}</Badge>
          </CardTitle>
          {items.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setItems([])}>
              <Trash2 className="size-4" /> ล้าง
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีรายการที่สแกน</p>
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.code} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <FormatBadge type={item.type} format={item.format} />
                    <span className="font-mono text-sm font-semibold">{item.code}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.at}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
