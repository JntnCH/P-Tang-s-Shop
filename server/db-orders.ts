import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, listProducts, type ProductRow } from "./db";
import { inventory, products, purchaseOrderItems, purchaseOrders } from "../drizzle/schema";

export type OrderItemInput = { productId: number; quantityOrdered: number };
export type OrderItemRow = {
  id: number;
  productId: number;
  name: string;
  barcode: string;
  quantityOrdered: number;
  quantityReceived: number;
  unit: string;
  status: "pending" | "matched" | "shortage" | "over";
};
export type PurchaseOrderRow = {
  id: number;
  status: "draft" | "sent" | "partially_received" | "received";
  orderedAt: Date;
  sentAt: Date | null;
  items: OrderItemRow[];
};

export function getOrderItemStatus(ordered: number, received: number): OrderItemRow["status"] {
  if (received > ordered) return "over";
  if (received === ordered) return "matched";
  if (received > 0) return "shortage";
  return "pending";
}

async function loadOrder(orderId: number): Promise<PurchaseOrderRow | undefined> {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  const order = (await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, orderId)).limit(1))[0];
  if (!order) return undefined;
  const rows = await db.select({ id: purchaseOrderItems.id, productId: purchaseOrderItems.productId, name: products.name, barcode: products.barcode, quantityOrdered: purchaseOrderItems.quantityOrdered, quantityReceived: purchaseOrderItems.quantityReceived, unit: purchaseOrderItems.unit }).from(purchaseOrderItems).innerJoin(products, eq(products.id, purchaseOrderItems.productId)).where(eq(purchaseOrderItems.orderId, orderId)).orderBy(products.name);
  const items = rows.map((row) => ({ ...row, status: getOrderItemStatus(row.quantityOrdered, row.quantityReceived) }));
  return { id: order.id, status: order.status, orderedAt: order.orderedAt, sentAt: order.sentAt, items };
}

export async function getLatestPurchaseOrder() {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  const latest = (await db.select({ id: purchaseOrders.id }).from(purchaseOrders).orderBy(desc(purchaseOrders.orderedAt)).limit(1))[0];
  return latest ? loadOrder(latest.id) : undefined;
}

export async function getSuggestedOrderItems(): Promise<(ProductRow & { suggestedQuantity: number })[]> {
  const productsRows = await listProducts();
  return productsRows.filter((row) => row.status === "low" || row.status === "out").map((row) => ({ ...row, suggestedQuantity: Math.max(row.minimumStock - row.quantity, 1) }));
}

export async function createPurchaseOrder(items: OrderItemInput[]) {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  const cleanItems = items.filter((item) => item.quantityOrdered > 0);
  if (cleanItems.length === 0) throw new Error("กรุณาระบุสินค้าที่ต้องการสั่งอย่างน้อย 1 รายการ");
  return db.transaction(async (tx) => {
    const inserted = await tx.insert(purchaseOrders).values({ status: "draft" });
    const orderId = Number(inserted[0].insertId);
    const productRows = await tx.select({ id: products.id, unit: products.unit }).from(products).where(sql`${products.id} in (${sql.join(cleanItems.map((item) => sql`${item.productId}`), sql`, `)})`);
    const units = new Map(productRows.map((product) => [product.id, product.unit]));
    await tx.insert(purchaseOrderItems).values(cleanItems.map((item) => ({ orderId, productId: item.productId, quantityOrdered: item.quantityOrdered, unit: units.get(item.productId) ?? "ชิ้น" })));
    return orderId;
  });
}

function buildFlexMessage(order: PurchaseOrderRow) {
  const bodyContents = order.items.flatMap((item) => [
    { type: "box", layout: "horizontal", spacing: "sm", contents: [{ type: "text", text: item.name, size: "sm", flex: 4, wrap: true }, { type: "text", text: `${item.quantityOrdered} ${item.unit}`, size: "sm", align: "end", flex: 2, weight: "bold" }] },
    { type: "separator", margin: "sm" },
  ]);
  return {
    type: "flex",
    altText: `รายการสั่งซื้อประจำวัน (${order.items.length} รายการ)`,
    contents: { type: "bubble", header: { type: "box", layout: "vertical", backgroundColor: "#27834f", paddingAll: "lg", contents: [{ type: "text", text: "รายการสั่งซื้อประจำวัน", color: "#ffffff", weight: "bold", size: "lg" }, { type: "text", text: new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(order.orderedAt), color: "#e9f7df", size: "xs", margin: "sm" }] }, body: { type: "box", layout: "vertical", spacing: "md", contents: bodyContents.slice(0, -1) }, footer: { type: "box", layout: "vertical", contents: [{ type: "text", text: `รวม ${order.items.length} รายการ`, size: "sm", color: "#68756b", align: "end" }] } },
  };
}

export async function sendPurchaseOrderToLine(orderId: number) {
  const order = await loadOrder(orderId);
  if (!order) throw new Error("ไม่พบรายการสั่งซื้อ");
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_TO_ID;
  if (!token || !to) throw new Error("ยังไม่ได้ตั้งค่า LINE Bot (LINE_CHANNEL_ACCESS_TOKEN และ LINE_TO_ID)");
  const response = await fetch("https://api.line.me/v2/bot/message/push", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ to, messages: [buildFlexMessage(order)] }) });
  if (!response.ok) throw new Error(`ส่ง LINE ไม่สำเร็จ (${response.status})`);
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  await db.update(purchaseOrders).set({ status: "sent", sentAt: new Date() }).where(eq(purchaseOrders.id, orderId));
  return { sent: true } as const;
}

export async function recordReceivedItem(itemId: number, quantityReceived: number) {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  if (quantityReceived < 0) throw new Error("จำนวนที่ได้รับต้องไม่ติดลบ");
  await db.transaction(async (tx) => {
    const current = (await tx.select({ item: purchaseOrderItems, order: purchaseOrders }).from(purchaseOrderItems).innerJoin(purchaseOrders, eq(purchaseOrders.id, purchaseOrderItems.orderId)).where(eq(purchaseOrderItems.id, itemId)).limit(1))[0];
    if (!current) throw new Error("ไม่พบรายการตรวจรับ");
    const delta = quantityReceived - current.item.quantityReceived;
    await tx.update(purchaseOrderItems).set({ quantityReceived, receivedAt: new Date() }).where(eq(purchaseOrderItems.id, itemId));
    await tx.update(inventory).set({ quantity: sql`greatest(0, ${inventory.quantity} + ${delta})` }).where(eq(inventory.productId, current.item.productId));
    const siblingItems = await tx.select({ quantityOrdered: purchaseOrderItems.quantityOrdered, quantityReceived: purchaseOrderItems.quantityReceived }).from(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, current.order.id));
    const allMatched = siblingItems.every((item) => item.quantityReceived === item.quantityOrdered) && quantityReceived === current.item.quantityOrdered;
    const anyReceived = siblingItems.some((item) => item.quantityReceived > 0) || quantityReceived > 0;
    await tx.update(purchaseOrders).set({ status: allMatched ? "received" : anyReceived ? "partially_received" : current.order.status }).where(eq(purchaseOrders.id, current.order.id));
  });
  return { saved: true } as const;
}
