import { and, desc, eq, gte, lte, like, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { inventory, products, stockMovements } from "../drizzle/schema";

export type MovementType = "receive" | "issue" | "adjustment" | "opening";
export type MovementFilters = { search?: string; type?: MovementType | "all"; from?: Date; to?: Date };
export type MovementInput = { productId: number; type: MovementType; quantity: number; note?: string; referenceType?: string; referenceId?: number; createdBy?: number; lineUserId?: string; lineOperationKey?: string };

export function calculateMovement(quantityBefore: number, signedDelta: number) {
  const quantityAfter = quantityBefore + signedDelta;
  if (quantityAfter < 0) throw new Error("จำนวนคงเหลือไม่พอสำหรับรายการนี้");
  return { quantityBefore, quantityAfter, quantity: Math.abs(signedDelta) };
}

export async function applySignedStockMovement(tx: any, input: Omit<MovementInput, "quantity"> & { signedDelta: number }) {
  if (!Number.isInteger(input.signedDelta) || input.signedDelta === 0) throw new Error("จำนวนรายการต้องเป็นจำนวนเต็มและไม่เป็นศูนย์");
  if (input.lineUserId && input.lineOperationKey) {
    const previous = (await tx.select({ id: stockMovements.id, quantity: stockMovements.quantity, quantityBefore: stockMovements.quantityBefore, quantityAfter: stockMovements.quantityAfter }).from(stockMovements).where(and(eq(stockMovements.lineUserId, input.lineUserId), eq(stockMovements.lineOperationKey, input.lineOperationKey))).limit(1))[0];
    if (previous) return { movementId: previous.id, productName: "รายการเดิม", quantityBefore: previous.quantityBefore, quantityAfter: previous.quantityAfter, quantity: previous.quantity, idempotent: true };
  }
  const row = (await tx.select({ quantity: inventory.quantity, name: products.name }).from(inventory).innerJoin(products, eq(products.id, inventory.productId)).where(eq(inventory.productId, input.productId)).limit(1))[0];
  if (!row) throw new Error("ไม่พบสต็อกของสินค้านี้");
  const values = calculateMovement(row.quantity, input.signedDelta);
  await tx.update(inventory).set({ quantity: values.quantityAfter }).where(eq(inventory.productId, input.productId));
  const inserted = await tx.insert(stockMovements).values({ productId: input.productId, type: input.type, quantity: values.quantity, quantityBefore: values.quantityBefore, quantityAfter: values.quantityAfter, referenceType: input.referenceType, referenceId: input.referenceId, note: input.note, createdBy: input.createdBy, lineUserId: input.lineUserId, lineOperationKey: input.lineOperationKey });
  return { movementId: Number(inserted[0].insertId), productName: row.name, ...values, idempotent: false };
}

export async function applyStockMovement(tx: any, input: MovementInput) {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("จำนวนรายการต้องเป็นจำนวนเต็มมากกว่า 0");
  return applySignedStockMovement(tx, { ...input, signedDelta: input.type === "issue" ? -input.quantity : input.quantity });
}

export async function issueStock(input: Omit<MovementInput, "type">) {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  return db.transaction((tx) => applyStockMovement(tx, { ...input, type: "issue", referenceType: input.referenceType ?? "manual_issue" }));
}

export async function receiveStock(input: Omit<MovementInput, "type">) {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  return db.transaction((tx) => applyStockMovement(tx, { ...input, type: "receive", referenceType: input.referenceType ?? "manual_receive" }));
}

export async function adjustStock(input: Omit<MovementInput, "type" | "quantity"> & { targetQuantity: number }) {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  if (!Number.isInteger(input.targetQuantity) || input.targetQuantity < 0) throw new Error("ยอดสต็อกใหม่ต้องเป็นจำนวนเต็มไม่ติดลบ");
  if (!input.note?.trim()) throw new Error("กรุณาระบุเหตุผลการปรับยอด");
  return db.transaction(async (tx) => {
    if (input.lineUserId && input.lineOperationKey) {
      const previous = (await tx.select({ id: stockMovements.id, quantity: stockMovements.quantity, quantityBefore: stockMovements.quantityBefore, quantityAfter: stockMovements.quantityAfter }).from(stockMovements).where(and(eq(stockMovements.lineUserId, input.lineUserId), eq(stockMovements.lineOperationKey, input.lineOperationKey))).limit(1))[0];
      if (previous) return { movementId: previous.id, productName: "รายการเดิม", quantityBefore: previous.quantityBefore, quantityAfter: previous.quantityAfter, quantity: previous.quantity, idempotent: true };
    }
    const row = (await tx.select({ quantity: inventory.quantity, name: products.name }).from(inventory).innerJoin(products, eq(products.id, inventory.productId)).where(eq(inventory.productId, input.productId)).limit(1))[0];
    if (!row) throw new Error("ไม่พบสต็อกของสินค้านี้");
    const delta = input.targetQuantity - row.quantity;
    if (delta === 0) throw new Error("ยอดใหม่เท่ากับยอดเดิม ไม่มีรายการให้บันทึก");
    return applySignedStockMovement(tx, { productId: input.productId, type: "adjustment", signedDelta: delta, note: input.note, referenceType: input.referenceType ?? "manual_adjustment", referenceId: input.referenceId, createdBy: input.createdBy, lineUserId: input.lineUserId, lineOperationKey: input.lineOperationKey });
  });
}

export async function listMovements(filters: MovementFilters = {}) {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  const conditions = [] as any[];
  if (filters.type && filters.type !== "all") conditions.push(eq(stockMovements.type, filters.type));
  if (filters.from) conditions.push(gte(stockMovements.createdAt, filters.from));
  if (filters.to) conditions.push(lte(stockMovements.createdAt, filters.to));
  const search = filters.search?.trim();
  const searchCondition = search ? or(like(products.name, `%${search}%`), like(products.sku, `%${search}%`), like(products.barcode, `%${search}%`)) : undefined;
  const where = conditions.length > 0 || searchCondition ? and(...conditions, searchCondition) : undefined;
  const rows = await db.select({ id: stockMovements.id, productId: stockMovements.productId, name: products.name, barcode: products.barcode, sku: products.sku, unit: products.unit, type: stockMovements.type, quantity: stockMovements.quantity, quantityBefore: stockMovements.quantityBefore, quantityAfter: stockMovements.quantityAfter, referenceType: stockMovements.referenceType, referenceId: stockMovements.referenceId, note: stockMovements.note, lineUserId: stockMovements.lineUserId, createdAt: stockMovements.createdAt }).from(stockMovements).innerJoin(products, eq(products.id, stockMovements.productId)).where(where).orderBy(desc(stockMovements.createdAt)).limit(200);
  return rows;
}

export async function getMovementSummary() {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  const rows = await db.select({ type: stockMovements.type, quantity: sql<number>`coalesce(sum(${stockMovements.quantity}), 0)` }).from(stockMovements).groupBy(stockMovements.type);
  return rows.reduce((summary, row) => ({ ...summary, [row.type]: Number(row.quantity) }), { receive: 0, issue: 0, adjustment: 0, opening: 0 });
}
