import { useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Edit3, Package, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { formatCurrency, statusLabels, type ProductRow, type ProductStatus } from "@/lib/product-types";

const emptyForm = {
  barcode: "",
  sku: "",
  name: "",
  category: "ทั่วไป",
  unit: "ชิ้น",
  costPrice: "0",
  sellPrice: "0",
  minimumStock: "0",
  quantity: "0",
};

type ProductForm = typeof emptyForm;

const statusClass: Record<ProductStatus, string> = {
  normal: "border-success/30 bg-success/10 text-success",
  low: "border-warning/40 bg-warning/15 text-warning-foreground",
  out: "border-destructive/30 bg-destructive/10 text-destructive",
};

export default function Products() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "inStock" | "low" | "out">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const input = useMemo(() => ({ search, category: categoryFilter, status: statusFilter }), [search, categoryFilter, statusFilter]);
  const productsQuery = trpc.products.list.useQuery(input);
  const categoriesQuery = trpc.products.categories.useQuery();
  const utils = trpc.useUtils();
  const createMutation = trpc.products.create.useMutation({
    onSuccess: async () => {
      toast.success("เพิ่มสินค้าเรียบร้อย");
      await Promise.all([utils.products.list.invalidate(), utils.products.categories.invalidate(), utils.inventory.summary.invalidate()]);
      setDialogOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMutation = trpc.products.update.useMutation({
    onSuccess: async () => {
      toast.success("บันทึกการแก้ไขแล้ว");
      await Promise.all([utils.products.list.invalidate(), utils.products.categories.invalidate(), utils.inventory.summary.invalidate()]);
      setDialogOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });
  const deactivateMutation = trpc.products.deactivate.useMutation({
    onSuccess: async () => {
      toast.success("ปิดใช้งานสินค้าแล้ว");
      await Promise.all([utils.products.list.invalidate(), utils.inventory.summary.invalidate()]);
    },
    onError: (error) => toast.error(error.message),
  });

  const products = (productsQuery.data ?? []) as ProductRow[];
  const categories = categoriesQuery.data ?? [];
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (product: ProductRow) => {
    setEditingId(product.id);
    setForm({
      barcode: product.barcode,
      sku: product.sku,
      name: product.name,
      category: product.category,
      unit: product.unit,
      costPrice: String(product.costPrice),
      sellPrice: String(product.sellPrice),
      minimumStock: String(product.minimumStock),
      quantity: String(product.quantity),
    });
    setDialogOpen(true);
  };

  const updateForm = (field: keyof ProductForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = {
      barcode: form.barcode,
      sku: form.sku,
      name: form.name,
      category: form.category,
      unit: form.unit,
      costPrice: Number(form.costPrice),
      sellPrice: Number(form.sellPrice),
      minimumStock: Number(form.minimumStock),
      quantity: Number(form.quantity),
    };
    if (editingId === null) {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate({ id: editingId, data });
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-sm font-semibold text-primary">PHASE 2</p>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">สินค้า</h1>
          <p className="mt-1 text-sm text-muted-foreground">จัดการรายการสินค้า SKU บาร์โค้ด ราคา และจำนวนเริ่มต้น</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          เพิ่มสินค้า
        </Button>
      </div>

      <Card className="mb-5 border-0 shadow-[var(--shadow-card)]">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(240px,1fr)_180px_180px]">
          <label className="relative block">
            <span className="sr-only">ค้นหาสินค้า</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อ, SKU หรือ barcode" className="pl-9" />
          </label>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="all">ทุกหมวดหมู่</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="all">ทุกสถานะ</option>
            <option value="inStock">มีสินค้า</option>
            <option value="low">ใกล้หมด</option>
            <option value="out">หมด</option>
          </select>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          {productsQuery.error ? (
            <div className="p-8 text-center text-sm text-destructive">โหลดข้อมูลสินค้าไม่สำเร็จ: {productsQuery.error.message}</div>
          ) : productsQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">กำลังโหลดรายการสินค้า…</div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary"><Package className="size-7" /></div>
              <div><p className="font-semibold">ยังไม่มีสินค้าที่ตรงกับตัวกรอง</p><p className="mt-1 text-sm text-muted-foreground">เพิ่มสินค้าใหม่เพื่อเริ่มจัดการสต็อก</p></div>
              <Button onClick={openCreate} variant="outline" className="gap-2"><Plus className="size-4" />เพิ่มสินค้า</Button>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>สินค้า</TableHead><TableHead>Barcode / SKU</TableHead><TableHead>หมวดหมู่</TableHead><TableHead className="text-right">คงเหลือ</TableHead><TableHead className="text-right">ราคาขาย</TableHead><TableHead>สถานะ</TableHead><TableHead className="text-right">จัดการ</TableHead></TableRow></TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell><div className="font-semibold">{product.name}</div><div className="text-xs text-muted-foreground">หน่วย: {product.unit} · จุดสั่งซื้อ {product.minimumStock}</div></TableCell>
                    <TableCell><div className="font-mono text-xs">{product.barcode}</div><div className="text-xs text-muted-foreground">{product.sku}</div></TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{product.quantity.toLocaleString("th-TH")} <span className="text-xs font-normal text-muted-foreground">{product.unit}</span></TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(product.sellPrice)}</TableCell>
                    <TableCell><Badge variant="outline" className={statusClass[product.status]}>{statusLabels[product.status]}</Badge></TableCell>
                    <TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label={`แก้ไข ${product.name}`} onClick={() => openEdit(product)}><Edit3 className="size-4" /></Button><Button variant="ghost" size="icon" aria-label={`ปิดใช้งาน ${product.name}`} className="text-destructive hover:text-destructive" onClick={() => { if (window.confirm(`ปิดใช้งาน ${product.name} ใช่หรือไม่`)) deactivateMutation.mutate({ id: product.id }); }}><Trash2 className="size-4" /></Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>แสดง {products.length.toLocaleString("th-TH")} รายการ</span>
        <Link href="/stock" className="font-medium text-primary hover:underline">ดูสต็อกสินค้า →</Link>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingId === null ? "เพิ่มสินค้าใหม่" : "แก้ไขข้อมูลสินค้า"}</DialogTitle><DialogDescription>กรอกข้อมูลสินค้าให้ครบเพื่อใช้ค้นหาและคำนวณสต็อก</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="product-name">ชื่อสินค้า</Label><Input id="product-name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="เช่น น้ำดื่ม 600 มล." required /></div>
              <div className="space-y-2"><Label htmlFor="product-category">หมวดหมู่</Label><Input id="product-category" value={form.category} onChange={(event) => updateForm("category", event.target.value)} placeholder="เช่น เครื่องดื่ม" required /></div>
              <div className="space-y-2"><Label htmlFor="product-barcode">Barcode</Label><Input id="product-barcode" value={form.barcode} onChange={(event) => updateForm("barcode", event.target.value)} inputMode="numeric" placeholder="885..." required /></div>
              <div className="space-y-2"><Label htmlFor="product-sku">SKU</Label><Input id="product-sku" value={form.sku} onChange={(event) => updateForm("sku", event.target.value)} placeholder="BEV-001" required /></div>
              <div className="space-y-2"><Label htmlFor="product-unit">หน่วยนับ</Label><Input id="product-unit" value={form.unit} onChange={(event) => updateForm("unit", event.target.value)} placeholder="ชิ้น" required /></div>
              <div className="space-y-2"><Label htmlFor="product-minimum">จุดสั่งซื้อขั้นต่ำ</Label><Input id="product-minimum" type="number" min="0" step="1" value={form.minimumStock} onChange={(event) => updateForm("minimumStock", event.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="product-cost">ราคาทุน (บาท)</Label><Input id="product-cost" type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => updateForm("costPrice", event.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="product-sell">ราคาขาย (บาท)</Label><Input id="product-sell" type="number" min="0" step="0.01" value={form.sellPrice} onChange={(event) => updateForm("sellPrice", event.target.value)} required /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="product-quantity">จำนวนคงเหลือเริ่มต้น</Label><Input id="product-quantity" type="number" min="0" step="1" value={form.quantity} onChange={(event) => updateForm("quantity", event.target.value)} required /><p className="text-xs text-muted-foreground">การรับเข้า/จ่ายออกและประวัติการเคลื่อนไหวจะเพิ่มใน PHASE ถัดไป</p></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button><Button type="submit" disabled={isSaving}>{isSaving ? "กำลังบันทึก…" : "บันทึกสินค้า"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
