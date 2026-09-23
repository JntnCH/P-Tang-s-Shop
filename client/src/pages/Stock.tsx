import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, Boxes, CircleSlash, Package, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatCurrency, statusLabels, type ProductRow, type ProductStatus } from "@/lib/product-types";

const statusClass: Record<ProductStatus, string> = {
  normal: "border-success/30 bg-success/10 text-success",
  low: "border-warning/40 bg-warning/15 text-warning-foreground",
  out: "border-destructive/30 bg-destructive/10 text-destructive",
};

const statusIcon: Record<ProductStatus, typeof Boxes> = {
  normal: Boxes,
  low: AlertTriangle,
  out: CircleSlash,
};

export default function Stock() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"all" | "inStock" | "low" | "out">("all");
  const input = useMemo(() => ({ search, category, status }), [search, category, status]);
  const productsQuery = trpc.products.list.useQuery(input);
  const categoriesQuery = trpc.products.categories.useQuery();
  const summaryQuery = trpc.inventory.summary.useQuery();
  const rows = (productsQuery.data ?? []) as ProductRow[];
  const summary = summaryQuery.data;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-sm font-semibold text-primary">PHASE 2</p>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">สต็อกสินค้า</h1>
          <p className="mt-1 text-sm text-muted-foreground">จำนวนคงเหลือและสถานะของสินค้าแต่ละรายการ</p>
        </div>
        <Button asChild variant="outline"><Link href="/products">จัดการสินค้า</Link></Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="มีสินค้า" value={summary?.inStock} icon={Boxes} tone="text-success" loading={summaryQuery.isLoading} />
        <SummaryCard label="ใกล้หมด" value={summary?.lowStock} icon={AlertTriangle} tone="text-warning-foreground" loading={summaryQuery.isLoading} />
        <SummaryCard label="หมด" value={summary?.outOfStock} icon={CircleSlash} tone="text-destructive" loading={summaryQuery.isLoading} />
        <SummaryCard label="มูลค่าคงคลัง" value={summary?.inventoryValue} icon={Package} tone="text-primary" loading={summaryQuery.isLoading} currency />
      </div>

      <Card className="mb-5 border-0 shadow-[var(--shadow-card)]">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(240px,1fr)_220px_180px]">
          <label className="relative block"><span className="sr-only">ค้นหาสต็อก</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อ, SKU หรือ barcode" className="pl-9" /></label>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="all">ทุกหมวดหมู่</option>{(categoriesQuery.data ?? []).map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="all">ทุกสถานะ</option><option value="inStock">มีสินค้า</option><option value="low">ใกล้หมด</option><option value="out">หมด</option></select>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-[var(--shadow-card)]">
        <CardHeader className="border-b px-4 py-4 sm:px-6"><CardTitle className="text-base">รายการคงเหลือ <span className="ml-1 text-sm font-normal text-muted-foreground">({rows.length.toLocaleString("th-TH")} รายการ)</span></CardTitle></CardHeader>
        <CardContent className="p-0">
          {productsQuery.error ? <div className="p-8 text-center text-sm text-destructive">โหลดข้อมูลสต็อกไม่สำเร็จ: {productsQuery.error.message}</div> : productsQuery.isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">กำลังโหลดข้อมูลสต็อก…</div> : rows.length === 0 ? <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"><div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary"><Boxes className="size-7" /></div><p className="font-semibold">ยังไม่มีรายการสต็อก</p><Button asChild variant="outline"><Link href="/products">เพิ่มสินค้าแรก</Link></Button></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>สินค้า</TableHead><TableHead>หมวดหมู่</TableHead><TableHead className="text-right">คงเหลือ</TableHead><TableHead className="text-right">ขั้นต่ำ</TableHead><TableHead className="text-right">มูลค่าทุน</TableHead><TableHead>สถานะ</TableHead></TableRow></TableHeader>
              <TableBody>{rows.map((row) => { const Icon = statusIcon[row.status]; return <TableRow key={row.id}><TableCell><div className="font-semibold">{row.name}</div><div className="font-mono text-xs text-muted-foreground">{row.sku} · {row.barcode}</div></TableCell><TableCell>{row.category}</TableCell><TableCell className="text-right font-semibold tabular-nums">{row.quantity.toLocaleString("th-TH")} <span className="text-xs font-normal text-muted-foreground">{row.unit}</span></TableCell><TableCell className="text-right tabular-nums">{row.minimumStock.toLocaleString("th-TH")}</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(row.quantity * Number(row.costPrice))}</TableCell><TableCell><Badge variant="outline" className={statusClass[row.status]}><Icon className="size-3" />{statusLabels[row.status]}</Badge></TableCell></TableRow>; })}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, tone, loading, currency = false }: { label: string; value?: number; icon: typeof Boxes; tone: string; loading: boolean; currency?: boolean }) {
  return <Card className="gap-2 border-0 shadow-[var(--shadow-card)]"><CardHeader className="pb-0"><CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon className={`size-4 ${tone}`} />{label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold tabular-nums">{loading ? "…" : value === undefined ? "—" : currency ? formatCurrency(value) : value.toLocaleString("th-TH")}</p></CardContent></Card>;
}
