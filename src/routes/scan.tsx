import { createFileRoute } from "@tanstack/react-router";
import { Camera, CameraOff, ScanLine, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { PhaseNotice } from "@/components/layout/PhaseNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "สแกนบาร์โค้ด | MiniMark" },
      { name: "description", content: "สแกนบาร์โค้ดสินค้าด้วยกล้องมือถือเพื่อเพิ่มเข้ารายการ" },
      { property: "og:title", content: "สแกนบาร์โค้ด | MiniMark" },
      { property: "og:description", content: "สแกนบาร์โค้ดสินค้าด้วยกล้องมือถือ" },
    ],
  }),
  component: ScanPage,
});

type ScannedItem = { code: string; at: string };

function ScanPage() {
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [manual, setManual] = useState("");

  const handleDetected = useCallback((code: string) => {
    setItems((prev) => {
      if (prev.some((i) => i.code === code)) return prev;
      toast.success(`สแกนแล้ว: ${code}`);
      return [{ code, at: new Date().toLocaleTimeString("th-TH") }, ...prev];
    });
  }, []);

  const { videoRef, status, error, supported, start, stop } = useBarcodeScanner(handleDetected);
  const scanning = status === "scanning" || status === "starting";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="สแกนบาร์โค้ด"
        description="ใช้กล้องหลังของมือถือสแกนบาร์โค้ดสินค้า หรือกรอกด้วยมือก็ได้"
      />

      <Card className="mb-4 overflow-hidden">
        <CardContent className="space-y-3">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
            <video
              ref={videoRef}
              className="size-full object-cover"
              muted
              playsInline
              aria-label="ภาพจากกล้องสำหรับสแกนบาร์โค้ด"
            />
            {!scanning ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <ScanLine className="size-10" />
                <p className="text-sm">กดปุ่มด้านล่างเพื่อเปิดกล้อง</p>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-primary/80" />
            )}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!supported ? (
            <p className="text-sm text-muted-foreground">
              เบราว์เซอร์นี้ยังไม่รองรับการสแกนด้วยกล้อง แนะนำให้ใช้ Chrome บน Android
              หรือกรอกบาร์โค้ดด้วยมือ
            </p>
          ) : null}

          {scanning ? (
            <Button size="lg" variant="secondary" className="w-full" onClick={stop}>
              <CameraOff className="size-5" /> ปิดกล้อง
            </Button>
          ) : (
            <Button size="lg" className="w-full" onClick={() => void start()}>
              <Camera className="size-5" /> เปิดกล้องเพื่อสแกน
            </Button>
          )}

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const code = manual.trim();
              if (!code) return;
              handleDetected(code);
              setManual("");
            }}
          >
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              inputMode="numeric"
              placeholder="กรอกบาร์โค้ดด้วยมือ"
              className="h-12 text-base"
            />
            <Button type="submit" size="lg" variant="secondary">
              เพิ่ม
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">
            บาร์โค้ดที่สแกนได้ <Badge variant="secondary">{items.length}</Badge>
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
                  <span className="font-mono text-base font-semibold">{item.code}</span>
                  <span className="text-xs text-muted-foreground">{item.at}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PhaseNotice phase="Phase 1">
        ตอนนี้สแกนและอ่านบาร์โค้ดได้จริงบนมือถือ แต่ยังไม่บันทึกลงฐานข้อมูล
        การเชื่อมกับข้อมูลสินค้าและการเพิ่มเข้ารายการรับ/จ่าย จะทำใน Phase 2 และ Phase 7
      </PhaseNotice>
    </div>
  );
}
