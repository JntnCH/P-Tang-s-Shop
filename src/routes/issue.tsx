import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, MinusCircle, PackageMinus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { FormatBadge } from "@/components/master/MasterSelects";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MasterStore, type ProductItem } from "@/lib/store";

export const Route = createFileRoute("/issue")({
  head: () => ({
    meta: [
      { title: "จ่ายสินค้าออก | MiniMark" },
      {
        name: "description",
        content: "บันทึกการจ่ายสินค้าออกจากสต็อก พร้อมตัดยอดสินค้าคงเหลือ",
      },
      { property: "og:title", content: "จ่ายสินค้าออก | MiniMark" },
      { property: "og:description", content: "บันทึกการจ่ายสินค้าออกจากสต็อก" },
    ],
  }),
  component: IssuePage,
});

interface IssueRow {
  product: ProductItem;
  quantity: number;
}

function IssuePage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProdId, setSelectedProdId] = useState("");
  const [issueQty, setIssueQty] = useState(1);
  const [issueList, setIssueList] = useState<IssueRow[]>([]);
  const [successMsg, setSuccessMsg] = useState("");

  const load = () => {
    const list = MasterStore.getProducts();
    setProducts(list);
    if (list[0]) {
      setSelectedProdId(list[0].id);
    }
  };

  useEffect(() => {
    load();
    window.addEventListener("minimark_store_change", load);
    return () => window.removeEventListener("minimark_store_change", load);
  }, []);

  const handleAddToList = () => {
    const p = products.find((prod) => prod.id === selectedProdId);
    if (!p) return;

    setIssueList((prev) => {
      const idx = prev.findIndex((r) => r.product.id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        const row = copy[idx];
        if (!row) return prev;
        copy[idx] = { ...row, quantity: row.quantity + issueQty };
        return copy;
      }
      return [...prev, { product: p, quantity: issueQty }];
    });
  };

  const handleConfirmIssue = () => {
    if (issueList.length === 0) return;

    issueList.forEach((row) => {
      MasterStore.issueStock(
        row.product.id,
        row.quantity,
        "แคชเชียร์/ผู้เบิกจ่าย",
        `จ่ายสินค้าออก (${row.quantity} รายการ)`,
      );
    });

    setSuccessMsg(
      `บันทึกจ่ายสินค้าออก ${issueList.length} รายการ (ตัดยอดและบันทึกประวัติ Movement เรียบร้อยแล้ว)`,
    );
    setIssueList([]);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const totalQuantity = issueList.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="จ่ายสินค้าออก (Stock Issue)"
        description="บันทึกตัดยอดสินค้าออกจากสต็อกสำหรับขายหรือเบิกใช้งาน"
      />

      {successMsg ? (
        <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200 rounded-2xl">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <AlertTitle className="font-semibold text-sm">ทำรายการสำเร็จ</AlertTitle>
          <AlertDescription className="text-xs">{successMsg}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        {/* ADD ITEM CARD */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MinusCircle className="size-5 text-destructive" /> เลือกสินค้าที่ต้องการจ่ายออก
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold">
                  เลือกสินค้าในร้าน
                </Label>
                <select
                  className="w-full rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm shadow-sm"
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(e.target.value)}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (คงเหลือ: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold">
                  จำนวนที่จ่ายออก
                </Label>
                <Input
                  type="number"
                  min="1"
                  className="h-10 rounded-xl"
                  value={issueQty}
                  onChange={(e) => setIssueQty(Math.max(1, Number(e.target.value)))}
                />
              </div>

              <Button
                className="w-full h-11 rounded-xl font-semibold gap-2 active:scale-95 shadow-sm"
                onClick={handleAddToList}
              >
                <Plus className="size-4" /> เพิ่มเข้ารายการตัดสต็อก
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ISSUE LIST TABLE / CARDS */}
        <div className="lg:col-span-7 space-y-3">
          {/* Quick Mobile Confirm Button */}
          {issueList.length > 0 ? (
            <div className="block lg:hidden rounded-2xl border bg-card p-3 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  เตรียมตัดสต็อก {issueList.length} รายการ ({totalQuantity} ชิ้น)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
                  onClick={() => setIssueList([])}
                >
                  <Trash2 className="size-3.5 mr-1" /> ล้าง
                </Button>
              </div>
              <Button
                size="lg"
                className="w-full h-12 gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold rounded-xl active:scale-95 shadow-sm"
                onClick={handleConfirmIssue}
              >
                <PackageMinus className="size-5" /> ยืนยันตัดสต็อก ({totalQuantity} ชิ้น)
              </Button>
            </div>
          ) : null}

          {/* MOBILE LIST CARDS */}
          <div className="block md:hidden space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-muted-foreground">
                รายการที่เลือก ({issueList.length})
              </span>
            </div>

            {issueList.length === 0 ? (
              <Card className="rounded-2xl p-8 text-center text-muted-foreground">
                <PackageMinus className="size-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">ยังไม่มีรายการตัดสินค้า</p>
                <p className="text-xs mt-1">เลือกสินค้าและจำนวนจากฟอร์มด้านบน</p>
              </Card>
            ) : (
              issueList.map((row) => (
                <div
                  key={row.product.id}
                  className="rounded-2xl border bg-card p-3 shadow-sm space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground line-clamp-2">
                        {row.product.name}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground mt-0.5">
                        {row.product.barcode}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:text-destructive shrink-0 active:scale-90"
                      onClick={() =>
                        setIssueList((prev) => prev.filter((r) => r.product.id !== row.product.id))
                      }
                      aria-label="ลบรายการ"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                    <span className="text-muted-foreground">คงเหลือเดิม: {row.product.stock}</span>
                    <span className="font-mono font-bold text-destructive text-sm">
                      ตัดออก -{row.quantity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP TABLE */}
          <Card className="hidden md:block rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PackageMinus className="size-5 text-destructive" /> รายการที่จะจ่ายออก (
                {issueList.length} รายการ)
              </CardTitle>
              {issueList.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setIssueList([])}
                >
                  ล้างรายการ
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>สินค้า</TableHead>
                      <TableHead className="w-24 text-right">คงเหลือเดิม</TableHead>
                      <TableHead className="w-28 text-right">จำนวนจ่ายออก</TableHead>
                      <TableHead className="w-24 text-right">คงเหลือหลังตัด</TableHead>
                      <TableHead className="w-16 text-right">ลบ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issueList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          ยังไม่มีรายการที่เลือก
                        </TableCell>
                      </TableRow>
                    ) : (
                      issueList.map((row) => (
                        <TableRow key={row.product.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{row.product.name}</div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {row.product.barcode}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {row.product.stock}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-destructive text-sm">
                            -{row.quantity}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-sm">
                            {Math.max(0, row.product.stock - row.quantity)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() =>
                                setIssueList((prev) =>
                                  prev.filter((r) => r.product.id !== row.product.id),
                                )
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
                disabled={issueList.length === 0}
                variant="destructive"
                className="w-full gap-2 rounded-xl"
                onClick={handleConfirmIssue}
              >
                <PackageMinus className="size-5" /> ยืนยันบันทึกตัดสต็อกสินค้า ({totalQuantity}{" "}
                ชิ้น)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
