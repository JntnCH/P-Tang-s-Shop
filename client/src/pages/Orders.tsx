import { useEffect, useState } from "react";
import { ClipboardList, MessageCircle, PackagePlus, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { statusLabels, type ProductRow } from "@/lib/product-types";

export default function Orders() {
  const suggestedQuery = trpc.orders.suggested.useQuery();
  const latestQuery = trpc.orders.latest.useQuery();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const createMutation = trpc.orders.create.useMutation({ onSuccess: async () => { toast.success("สร้างรายการสั่งซื้อแล้ว"); await latestQuery.refetch(); }, onError: (error) => toast.error(error.message) });
  const sendMutation = trpc.orders.sendLine.useMutation({ onSuccess: () => toast.success("ส่งรายการไปที่ LINE แล้ว"), onError: (error) => toast.error(error.message) });
  const suggested = (suggestedQuery.data ?? []) as (ProductRow & { suggestedQuantity: number })[];
  useEffect(() => { if (suggested.length > 0 && Object.keys(quantities).length === 0) setQuantities(Object.fromEntries(suggested.map((item) => [item.id, item.suggestedQuantity]))); }, [suggested, quantities]);
  const createOrder = () => createMutation.mutate({ items: suggested.map((item) => ({ productId: item.id, quantityOrdered: quantities[item.id] ?? 0 })).filter((item) => item.quantityOrdered > 0) });
  const latest = latestQuery.data;
  return <div className="mx-auto max-w-5xl"><div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><p className="mb-2 text-sm font-semibold text-primary">สั่งซื้อประจำวัน</p><h1 className="text-2xl font-bold tracking-tight lg:text-3xl">รายการที่ต้องสั่งซื้อ</h1><p className="mt-1 text-sm text-muted-foreground">ตรวจจำนวนสินค้า แล้วสร้างรายการเพื่อส่งเป็น LINE Flex Message</p></div><Button onClick={createOrder} disabled={createMutation.isPending || suggested.length === 0} className="gap-2"><ClipboardList className="size-4" />สร้างรายการสั่งซื้อ</Button></div>
    <Card className="mb-5 border-0 shadow-[var(--shadow-card)]"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><PackagePlus className="size-5 text-primary" />สินค้าใกล้หมด/หมด</CardTitle></CardHeader><CardContent className="p-0">{suggestedQuery.error ? <div className="p-6 text-sm text-destructive">โหลดรายการไม่ได้: {suggestedQuery.error.message}</div> : suggestedQuery.isLoading ? <div className="p-6 text-sm text-muted-foreground">กำลังคำนวณรายการที่ควรสั่ง…</div> : suggested.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">ยังไม่มีสินค้าที่ต้องสั่งซื้อ</div> : <div className="divide-y">{suggested.map((item) => <div key={item.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">{item.sku} · คงเหลือ {item.quantity} {item.unit} · สถานะ {statusLabels[item.status]}</p></div><span className="text-sm text-muted-foreground">หน่วย: {item.unit}</span><Input className="w-28" type="number" min="1" value={quantities[item.id] ?? item.suggestedQuantity} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Number(event.target.value) }))} aria-label={`จำนวนสั่ง ${item.name}`} /></div>)}</div>}</CardContent></Card>
    <Card className="border-0 shadow-[var(--shadow-card)]"><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2 text-base"><MessageCircle className="size-5 text-[#06c755]" />รายการล่าสุด</CardTitle>{latest ? <Button variant="outline" className="gap-2" onClick={() => sendMutation.mutate({ orderId: latest.id })} disabled={sendMutation.isPending}><Send className="size-4" />ส่ง LINE</Button> : null}</CardHeader><CardContent>{latest ? <div className="space-y-3"><div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">รายการ #{latest.id} · {new Date(latest.orderedAt).toLocaleDateString("th-TH")}<Badge variant="outline">{latest.status === "sent" ? "ส่งแล้ว" : latest.status === "draft" ? "รอส่ง" : latest.status}</Badge></div><div className="divide-y rounded-xl border">{latest.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.barcode}</p></div><p className="font-semibold tabular-nums">{item.quantityOrdered} {item.unit}</p></div>)}</div><p className="text-xs text-muted-foreground">ถ้ายังไม่ได้ตั้งค่า LINE Bot ปุ่มจะช่วยตรวจสอบการตั้งค่าก่อนส่งจริง</p></div> : <p className="py-6 text-sm text-muted-foreground">ยังไม่มีรายการสั่งซื้อ กดสร้างรายการจากสินค้าที่ใกล้หมดได้เลย</p>}</CardContent></Card>
  </div>;
}
