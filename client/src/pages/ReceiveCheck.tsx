import { useCallback, useState } from "react";
import { Camera, CheckCircle2, ScanLine, Square, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";

const statusText = { pending: "ยังไม่เช็ค", matched: "ครบตามสั่ง", shortage: "ของขาด", over: "ได้เกิน" } as const;
const statusClass = { pending: "outline", matched: "default", shortage: "destructive", over: "secondary" } as const;

export default function ReceiveCheck() {
  const latestQuery = trpc.orders.latest.useQuery();
  const utils = trpc.useUtils();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [barcode, setBarcode] = useState("");
  const receiveMutation = trpc.orders.receive.useMutation({ onSuccess: async () => { toast.success("บันทึกจำนวนรับแล้ว"); await Promise.all([latestQuery.refetch(), utils.products.list.invalidate(), utils.inventory.summary.invalidate()]); }, onError: (error) => toast.error(error.message) });
  const items = latestQuery.data?.items ?? [];
  const selectByBarcode = useCallback((code: string) => { setBarcode(code); const item = items.find((row) => row.barcode === code); if (item) { setSelectedItemId(item.id); toast.success(`พบ ${item.name}`); } else { toast.error("ไม่พบ barcode นี้ในรายการสั่งซื้อล่าสุด"); } }, [items]);
  const scanner = useBarcodeScanner(selectByBarcode);
  const selected = items.find((item) => item.id === selectedItemId);
  return <div className="mx-auto max-w-5xl"><div className="mb-6"><p className="mb-2 text-sm font-semibold text-primary">ตรวจรับสินค้า</p><h1 className="text-2xl font-bold tracking-tight lg:text-3xl">เช็คของเข้าจากรายการสั่งซื้อ</h1><p className="mt-1 text-sm text-muted-foreground">สแกน QR code หรือ barcode จากกล้องมือถือ แล้วบันทึกจำนวนที่ได้รับจริงเพื่อเทียบกับจำนวนที่สั่ง</p></div>
    {!latestQuery.data ? <Card className="border-0 shadow-[var(--shadow-card)]"><CardContent className="flex flex-col items-center gap-3 p-10 text-center"><ClipboardIcon /><p className="font-semibold">ยังไม่มีรายการสั่งซื้อให้ตรวจรับ</p><p className="text-sm text-muted-foreground">สร้างรายการสั่งซื้อก่อน แล้วกลับมาที่หน้านี้เมื่อของมาส่ง</p></CardContent></Card> : <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><Card className="border-0 shadow-[var(--shadow-card)]"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Camera className="size-5 text-primary" />สแกนของที่มาส่ง</CardTitle></CardHeader><CardContent className="space-y-4"><div className="overflow-hidden rounded-2xl bg-slate-950"><video ref={scanner.videoRef} className="aspect-video w-full object-cover" muted playsInline /></div><div className="flex gap-2"><Button onClick={scanner.status === "scanning" ? scanner.stop : scanner.start} className="flex-1 gap-2">{scanner.status === "scanning" ? <><Square className="size-4" />หยุดกล้อง</> : <><ScanLine className="size-4" />เปิดกล้องหลัง</>}</Button></div>{scanner.error ? <p className="text-sm text-destructive">{scanner.error}</p> : null}<div className="space-y-2"><label className="text-sm font-medium" htmlFor="receive-barcode">หรือกรอก barcode ด้วยมือ</label><Input id="receive-barcode" value={barcode} onChange={(event) => setBarcode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") selectByBarcode(barcode); }} placeholder="สแกนหรือพิมพ์ barcode แล้วกด Enter" /></div>{selected ? <div className="rounded-xl border border-primary/30 bg-primary/5 p-4"><p className="font-semibold">เลือกแล้ว: {selected.name}</p><p className="mt-1 text-sm text-muted-foreground">สั่ง {selected.quantityOrdered} {selected.unit} · ได้รับแล้ว {selected.quantityReceived} {selected.unit}</p><div className="mt-3 flex gap-2"><Input type="number" min="0" value={selected.quantityReceived} onChange={(event) => { const value = Number(event.target.value); receiveMutation.mutate({ itemId: selected.id, quantityReceived: value }); }} /><span className="flex items-center text-sm text-muted-foreground">{selected.unit}</span></div></div> : <p className="text-sm text-muted-foreground">เลือกสินค้าจากตาราง หรือสแกน barcode เพื่อแก้จำนวนรับจริง</p>}</CardContent></Card><Card className="border-0 shadow-[var(--shadow-card)]"><CardHeader><CardTitle className="text-base">รายการตรวจรับ #{latestQuery.data.id}</CardTitle></CardHeader><CardContent className="p-0"><div className="divide-y">{items.map((item) => <button key={item.id} type="button" onClick={() => setSelectedItemId(item.id)} className={`flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/60 ${selectedItemId === item.id ? "bg-primary/5" : ""}`}><div className="min-w-0"><p className="truncate font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">สั่ง {item.quantityOrdered} {item.unit} · รับ {item.quantityReceived} {item.unit}</p></div><Badge variant={statusClass[item.status]}>{statusText[item.status]}</Badge></button>)}</div></CardContent></Card></div>}
  </div>;
}
function ClipboardIcon() { return <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary"><TriangleAlert className="size-7" /></div>; }
