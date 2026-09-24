import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  MessageCircle,
  Package,
  Plus,
  Send,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { FormatBadge, UnitSelect } from "@/components/master/MasterSelects";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { getLineServerConfigFn, sendLineMessagingApiFn } from "@/lib/line-server-fn";
import {
  formatDailyOrderFlexMessage,
  formatOrderPlainText,
  getLineStatus,
  sendDailyOrderToLine,
  type LineConfigStatus,
  type OrderFlexItem,
} from "@/lib/line-service";
import {
  MasterStore,
  type CategoryItem,
  type ProductItem,
  type UnitItem,
  type ZoneItem,
} from "@/lib/store";

export const Route = createFileRoute("/reorder")({
  head: () => ({
    meta: [
      { title: "รายการสั่งซื้อประจำวัน & LINE Flex | MiniMark" },
      {
        name: "description",
        content: "สรุปสินค้าที่ต้องสั่งซื้อรายวันและส่ง Flex Message เข้ากลุ่ม LINE หรือแชทส่วนตัว",
      },
      {
        property: "og:title",
        content: "รายการสั่งซื้อประจำวัน & LINE Flex | MiniMark",
      },
      {
        property: "og:description",
        content: "ส่งใบสั่งซื้อสินค้าเข้า LINE กลุ่ม และ LINE ส่วนตัว",
      },
    ],
  }),
  component: ReorderPage,
});

function ReorderPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);

  // Selected Order Items
  const [orderList, setOrderList] = useState<
    { productId: string; quantity: number; unitId: string }[]
  >([]);

  // Add Item Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedProdId, setSelectedProdId] = useState("");
  const [manualQty, setManualQty] = useState(10);
  const [manualUnitId, setManualUnitId] = useState("");

  // Server Messaging API Push Modal
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [targetIdInput, setTargetIdInput] = useState("");

  // Sending status
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // LINE Diagnostic Info
  const [lineStatus, setLineStatus] = useState<LineConfigStatus | null>(null);
  const [serverConfig, setServerConfig] = useState<{
    hasAccessToken: boolean;
  } | null>(null);

  const reloadData = () => {
    const allProds = MasterStore.getProducts();
    const allCats = MasterStore.getCategories();
    const allZones = MasterStore.getZones();
    const allUnits = MasterStore.getUnits();

    setProducts(allProds);
    setCategories(allCats);
    setZones(allZones);
    setUnits(allUnits);

    // Default: find items reaching minStock
    const lowStockItems = allProds.filter((p) => p.stock <= p.minStock);
    setOrderList(
      lowStockItems.map((p) => ({
        productId: p.id,
        quantity: p.reorderQuantity || 10,
        unitId: p.unitId,
      })),
    );
  };

  useEffect(() => {
    reloadData();
    getLineStatus().then(setLineStatus);
    getLineServerConfigFn()
      .then(setServerConfig)
      .catch(() => setServerConfig(null));
  }, []);

  const getUnitName = (unitId: string) => units.find((u) => u.id === unitId)?.name || "ชิ้น";

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setOrderList((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const next = item.quantity + delta;
            return next > 0 ? { ...item, quantity: next } : null;
          }
          return item;
        })
        .filter((item): item is { productId: string; quantity: number; unitId: string } =>
          Boolean(item),
        ),
    );
  };

  const handleRemoveOrder = (productId: string) => {
    setOrderList((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleAddManualItem = () => {
    if (!selectedProdId) return;
    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;

    setOrderList((prev) => {
      const existing = prev.find((i) => i.productId === selectedProdId);
      if (existing) {
        return prev.map((i) =>
          i.productId === selectedProdId ? { ...i, quantity: i.quantity + Number(manualQty) } : i,
        );
      }
      return [
        ...prev,
        {
          productId: selectedProdId,
          quantity: Number(manualQty) || 1,
          unitId: manualUnitId || prod.unitId,
        },
      ];
    });

    setAddModalOpen(false);
  };

  // Convert orderList to complete items with product data
  const fullItems: (OrderFlexItem & { product: ProductItem })[] = orderList
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      return {
        product,
        name: product.name,
        quantity: item.quantity,
        unitName: getUnitName(item.unitId || product.unitId),
        barcode: product.barcode,
        priceEstimate: product.costPrice * item.quantity,
      };
    })
    .filter((i): i is OrderFlexItem & { product: ProductItem } => Boolean(i));

  const totalCost = fullItems.reduce((acc, curr) => acc + (curr.priceEstimate || 0), 0);
  const totalQuantity = fullItems.reduce((acc, curr) => acc + curr.quantity, 0);

  // Send to LINE handler
  const handleSendToLine = async (target: "group" | "personal") => {
    if (fullItems.length === 0) return;
    setIsSending(true);
    setStatusMessage(null);

    try {
      const orderDateStr = new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const res = await sendDailyOrderToLine(fullItems, target, orderDateStr);

      if (res.success) {
        setStatusMessage({
          type: "success",
          text:
            res.method === "share_target_picker"
              ? `เปิด LINE Share เรียบร้อย กรุณาเลือก${
                  target === "group" ? "กลุ่มที่ต้องการส่ง" : "เพื่อน/แชทที่ต้องการส่ง"
                }`
              : "เปิดหน้าแชร์ LINE พร้อมข้อความสั่งซื้อเรียบร้อยแล้ว",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "เกิดข้อผิดพลาดในการส่งข้อความ LINE",
        });
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: `เกิดข้อผิดพลาด: ${String(err)}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  // Send via Server Messaging API handler
  const handleSendServerPush = async () => {
    if (!targetIdInput.trim() || fullItems.length === 0) return;
    setIsSending(true);

    try {
      const orderDateStr = new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const flexMsg = formatDailyOrderFlexMessage(fullItems, orderDateStr);
      const plainText = formatOrderPlainText(fullItems, orderDateStr);

      const res = await sendLineMessagingApiFn({
        data: {
          toUserIdOrGroupId: targetIdInput.trim(),
          orderSummary: plainText,
          flexMessage: flexMsg,
        },
      });

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: `ส่งข้อความผ่าน LINE Messaging API สำเร็จไปยัง ID: ${targetIdInput}`,
        });
        setPushModalOpen(false);
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "ไม่สามารถส่งผ่าน Server Messaging API ได้",
        });
      }
    } catch (e: unknown) {
      setStatusMessage({
        type: "error",
        text: `Error: ${String(e)}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            รายการที่ต้องสั่งซื้อ (Daily Reorder)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            ส่งออกใบสั่งซื้อเป็น LINE Flex Message: รายการ ➔ จำนวน ➔ หน่วยนับ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={reloadData}
            className="h-10 px-3 rounded-xl text-xs"
          >
            คำนวณใหม่
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (products[0]) {
                setSelectedProdId(products[0].id);
                setManualQty(products[0].reorderQuantity || 10);
                setManualUnitId(products[0].unitId);
              }
              setAddModalOpen(true);
            }}
            className="h-10 px-3 rounded-xl text-xs font-semibold gap-1.5"
          >
            <Plus className="size-4" /> เพิ่มรายการสั่ง
          </Button>
        </div>
      </div>

      {/* Status feedback alert */}
      {statusMessage ? (
        <Alert
          className={
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200 rounded-xl"
              : "bg-destructive/10 border-destructive/20 text-destructive rounded-xl"
          }
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="size-4 text-emerald-600" />
          ) : (
            <AlertCircle className="size-4" />
          )}
          <AlertTitle className="font-semibold text-sm">
            {statusMessage.type === "success" ? "สำเร็จ" : "ข้อผิดพลาด"}
          </AlertTitle>
          <AlertDescription className="text-xs">{statusMessage.text}</AlertDescription>
        </Alert>
      ) : null}

      {/* QUICK MOBILE ACTIONS (Natural Thumb Reach) */}
      <div className="block lg:hidden rounded-2xl border bg-card p-3.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">สรุปสั่งซื้อด่วน</div>
            <div className="text-lg font-bold text-foreground">
              {fullItems.length} รายการ (รวม ฿{totalCost.toLocaleString("th-TH")})
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {totalQuantity} หน่วย
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            disabled={fullItems.length === 0 || isSending}
            className="h-12 w-full gap-1.5 bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold text-xs rounded-xl shadow-sm active:scale-95"
            onClick={() => handleSendToLine("group")}
          >
            <Users className="size-4 shrink-0" />
            <span className="truncate">ส่ง LINE กลุ่ม</span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            disabled={fullItems.length === 0 || isSending}
            className="h-12 w-full gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 font-semibold text-xs rounded-xl active:scale-95"
            onClick={() => handleSendToLine("personal")}
          >
            <Share2 className="size-4 shrink-0" />
            <span className="truncate">ส่ง LINE ส่วนตัว</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        {/* REORDER ITEMS LIST */}
        <div className="lg:col-span-7 space-y-3">
          {/* MOBILE LIST ITEMS (Cards with Touch Counters) */}
          <div className="block md:hidden space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-muted-foreground">
                รายการสินค้าที่ต้องสั่ง ({fullItems.length})
              </span>
              <span className="text-xs text-muted-foreground">ปรับจำนวนด้วยปุ่ม + / -</span>
            </div>

            {fullItems.length === 0 ? (
              <Card className="rounded-2xl p-8 text-center text-muted-foreground">
                <Package className="size-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">ไม่มีรายการสินค้าที่ต้องสั่งซื้อ</p>
                <p className="text-xs mt-1">สต็อกสินค้าทุกรายการยังอยู่ในเกณฑ์ปกติ</p>
              </Card>
            ) : (
              fullItems.map((item, idx) => (
                <div
                  key={item.product.id}
                  className="rounded-2xl border bg-card p-3 shadow-sm space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground line-clamp-2">
                        {idx + 1}. {item.product.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <FormatBadge type={item.product.codeType} format={item.product.format} />
                        <span className="font-mono text-[11px] truncate">
                          {item.product.barcode}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:text-destructive shrink-0 active:scale-90"
                      onClick={() => handleRemoveOrder(item.product.id)}
                      aria-label="ลบรายการสั่ง"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  {/* Stock vs Quantity Stepper */}
                  <div className="flex items-center justify-between border-t border-border/60 pt-2">
                    <div className="text-xs">
                      <span className="text-muted-foreground">คงเหลือ: </span>
                      <span className="font-mono font-bold text-destructive">
                        {item.product.stock}
                      </span>
                      <span className="text-muted-foreground text-[11px] ml-1">
                        (เตือนที่ {item.product.minStock})
                      </span>
                    </div>

                    {/* Touch Stepper (44px hitboxes) */}
                    <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-0.5 border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-lg font-bold text-base hover:bg-background active:scale-90"
                        onClick={() => handleUpdateQuantity(item.product.id, -1)}
                      >
                        -
                      </Button>
                      <span className="font-mono font-bold text-sm min-w-8 text-center text-primary px-1">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-lg font-bold text-base hover:bg-background active:scale-90"
                        onClick={() => handleUpdateQuantity(item.product.id, 1)}
                      >
                        +
                      </Button>
                      <span className="text-xs text-muted-foreground pr-2 font-medium">
                        {item.unitName}
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
                  <ClipboardList className="size-5 text-primary" /> รายการสินค้าที่ต้องสั่งซื้อ
                </CardTitle>
                <CardDescription>
                  ดึงจากสินค้าที่มีสต็อกน้อยกว่าหรือเท่ากับจุดเตือนขั้นต่ำ
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono">
                {totalQuantity} หน่วยรวม
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>รายการสินค้า</TableHead>
                      <TableHead className="w-20 text-center">คงเหลือ</TableHead>
                      <TableHead className="w-36 text-center">จำนวนสั่งซื้อ</TableHead>
                      <TableHead className="w-16 text-right">ลบ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fullItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          ไม่มีรายการสินค้าที่ต้องสั่งซื้อ หรือลบออกหมดแล้ว
                        </TableCell>
                      </TableRow>
                    ) : (
                      fullItems.map((item, idx) => (
                        <TableRow key={item.product.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">{item.product.name}</div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FormatBadge
                                type={item.product.codeType}
                                format={item.product.format}
                                className="scale-90 origin-left"
                              />
                              <span className="font-mono">{item.product.barcode}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono text-xs text-destructive font-semibold">
                              {item.product.stock}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-7 rounded-lg"
                                onClick={() => handleUpdateQuantity(item.product.id, -1)}
                              >
                                -
                              </Button>
                              <span className="font-mono font-bold text-sm w-9 text-center text-primary">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-7 rounded-lg"
                                onClick={() => handleUpdateQuantity(item.product.id, 1)}
                              >
                                +
                              </Button>
                              <span className="text-xs text-muted-foreground ml-1">
                                {item.unitName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveOrder(item.product.id)}
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

              {/* Cost Summary Box */}
              <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/60 p-3 text-sm">
                <span className="text-muted-foreground">ประมาณการราคาทุนรวม:</span>
                <span className="font-bold text-base text-foreground">
                  ฿{totalCost.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LINE FLEX PREVIEW & ACTION BUTTONS */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="rounded-2xl border-emerald-500/30 overflow-hidden shadow-sm">
            <CardHeader className="bg-emerald-600 text-white p-3.5 sm:p-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-white font-semibold">
                <MessageCircle className="size-5" /> ตัวอย่าง LINE Flex Message
              </CardTitle>
              <CardDescription className="text-emerald-100 text-xs">
                ส่งในรูปแบบ: รายการ ➔ จำนวน ➔ หน่วยนับ
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-4 space-y-3.5">
              {/* Mock LINE Flex Card */}
              <div className="rounded-xl border bg-card p-3.5 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                    📦 ใบสั่งซื้อสินค้าประจำวัน
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {new Date().toLocaleDateString("th-TH")}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {fullItems.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-4 text-center">
                      ไม่มีรายการที่ต้องสั่งซื้อ
                    </div>
                  ) : (
                    fullItems.map((item, idx) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between text-xs py-1 border-b border-dashed border-border/60"
                      >
                        <span className="font-medium text-foreground truncate max-w-[170px]">
                          {idx + 1}. {item.name}
                        </span>
                        <span className="font-bold font-mono text-emerald-600 shrink-0">
                          {item.quantity} {item.unitName}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t pt-2 text-xs space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>จำนวนรายการ</span>
                    <span className="font-bold font-mono">{fullItems.length} รายการ</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>ยอดเงินโดยประมาณ</span>
                    <span className="font-bold text-emerald-600 font-mono">
                      ฿{totalCost.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS (GROUP vs PERSONAL) */}
              <div className="space-y-2 pt-1">
                <Button
                  size="lg"
                  disabled={fullItems.length === 0 || isSending}
                  className="h-12 w-full gap-2 bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold rounded-xl active:scale-95 shadow-sm"
                  onClick={() => handleSendToLine("group")}
                >
                  <Users className="size-5" /> 👥 ส่งเข้า LINE กลุ่ม (Group Chat)
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  disabled={fullItems.length === 0 || isSending}
                  className="h-12 w-full gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 rounded-xl font-semibold active:scale-95"
                  onClick={() => handleSendToLine("personal")}
                >
                  <Share2 className="size-4" /> 👤 ส่งเข้า LINE ส่วนตัว (Personal Chat)
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={fullItems.length === 0 || isSending}
                  className="w-full gap-1.5 text-xs text-muted-foreground h-9"
                  onClick={() => setPushModalOpen(true)}
                >
                  <Send className="size-3.5" /> ส่งผ่าน Server Messaging API (Push)
                </Button>
              </div>

              {/* Environment Diagnostics Footer */}
              <div className="text-[11px] text-muted-foreground rounded-xl bg-muted/60 p-2.5 space-y-1">
                <div className="flex justify-between">
                  <span>Client LIFF:</span>
                  <span className="font-mono font-medium">
                    {lineStatus?.hasLiffId ? "เชื่อมต่อแล้ว" : "ใช้ Web Share (Auto Fallback)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Server Token:</span>
                  <span className="font-mono font-medium">
                    {serverConfig?.hasAccessToken ? "พร้อมใช้งาน" : "ยังไม่ได้ระบุ"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ADD ITEM TO REORDER MODAL */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="w-[94vw] max-w-md rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">เพิ่มสินค้าในรายการสั่งซื้อ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">เลือกสินค้า</Label>
              <select
                className="w-full rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm shadow-sm"
                value={selectedProdId}
                onChange={(e) => {
                  setSelectedProdId(e.target.value);
                  const p = products.find((prod) => prod.id === e.target.value);
                  if (p) {
                    setManualQty(p.reorderQuantity || 10);
                    setManualUnitId(p.unitId);
                  }
                }}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (คงเหลือ: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">จำนวนสั่งซื้อ</Label>
                <Input
                  type="number"
                  min="1"
                  className="h-10 rounded-xl"
                  value={manualQty}
                  onChange={(e) => setManualQty(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">หน่วยนับ</Label>
                <UnitSelect
                  value={manualUnitId}
                  onChange={setManualUnitId}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              variant="outline"
              className="h-11 rounded-xl w-full sm:w-auto"
              onClick={() => setAddModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              className="h-11 rounded-xl w-full sm:w-auto font-semibold"
              onClick={handleAddManualItem}
            >
              เพิ่มเข้ารายการ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SERVER MESSAGING API PUSH MODAL */}
      <Dialog open={pushModalOpen} onOpenChange={setPushModalOpen}>
        <DialogContent className="w-[94vw] max-w-md rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              ส่งผ่าน LINE Messaging API (Server Push)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                LINE User ID หรือ Group ID ปลายทาง
              </Label>
              <Input
                placeholder="เช่น U1234567890abcdef หรือ C1234567890..."
                className="font-mono text-sm h-10 rounded-xl"
                value={targetIdInput}
                onChange={(e) => setTargetIdInput(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                ต้องตั้งค่า LINE_CHANNEL_ACCESS_TOKEN บน Server Environment
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              variant="outline"
              className="h-11 rounded-xl w-full sm:w-auto"
              onClick={() => setPushModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              className="h-11 rounded-xl w-full sm:w-auto font-semibold"
              onClick={handleSendServerPush}
              disabled={!targetIdInput.trim() || isSending}
            >
              ส่งข้อความ Push
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
