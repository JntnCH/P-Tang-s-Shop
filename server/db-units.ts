import { asc, eq, like, sql } from "drizzle-orm";
import { getDb } from "./db";
import { products, units, type InsertUnit } from "../drizzle/schema";

export const DEFAULT_UNITS = ["ชิ้น", "ขวด", "กระป๋อง", "กล่อง", "แพ็ก", "ถุง", "กิโลกรัม", "ลิตร"];

export function normalizeUnitName(name: string) {
  const normalized = name.trim();
  if (!normalized) throw new Error("กรุณาระบุชื่อหน่วยนับ");
  if (normalized.length > 32) throw new Error("ชื่อหน่วยนับยาวเกินไป");
  return normalized;
}

export function buildSkuPrefix(name: string, category: string) {
  const categoryCodes: Record<string, string> = { "เครื่องดื่ม": "BEV", "อาหาร": "FOOD", "ขนม": "SNK", "ของใช้ทั่วไป": "GEN", "ของใช้ในบ้าน": "HOM", "เครื่องปรุง": "ING" };
  const categoryPrefix = categoryCodes[category.trim()] ?? (category.trim().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "") || "GEN");
  const namePrefix = name.trim().slice(0, 2).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `${categoryPrefix}${namePrefix ? `-${namePrefix}` : ""}`;
}

export function pickNextSku(prefix: string, existingSkus: string[]) {
  const used = new Set(existingSkus);
  let sequence = 1;
  while (used.has(`${prefix}-${String(sequence).padStart(3, "0")}`)) sequence += 1;
  return `${prefix}-${String(sequence).padStart(3, "0")}`;
}

export async function listUnits(includeInactive = false) {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  const rows = await db.select().from(units).where(includeInactive ? undefined : eq(units.isActive, 1)).orderBy(asc(units.name));
  return rows.map((row) => ({ ...row, isActive: Boolean(row.isActive) }));
}

export async function seedDefaultUnits() {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  await db.insert(units).values(DEFAULT_UNITS.map((name) => ({ name, isActive: 1 }))).onDuplicateKeyUpdate({ set: { isActive: 1 } });
  return listUnits();
}

export async function createUnit(name: string) {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  const normalized = normalizeUnitName(name);
  const inserted = await db.insert(units).values({ name: normalized, isActive: 1 } satisfies InsertUnit);
  return Number(inserted[0].insertId);
}

export async function updateUnit(id: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  const normalized = normalizeUnitName(name);
  const current = (await db.select({ name: units.name }).from(units).where(eq(units.id, id)).limit(1))[0];
  if (!current) throw new Error("ไม่พบหน่วยนับที่ต้องการแก้ไข");
  const used = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.unit, current.name));
  if (Number(used[0]?.count ?? 0) > 0 && normalized !== current.name) throw new Error("หน่วยนับนี้ถูกใช้กับสินค้าแล้ว ไม่สามารถเปลี่ยนชื่อได้");
  await db.update(units).set({ name: normalized }).where(eq(units.id, id));
  return id;
}

export async function deactivateUnit(id: number) {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  const unit = (await db.select({ name: units.name }).from(units).where(eq(units.id, id)).limit(1))[0];
  if (!unit) throw new Error("ไม่พบหน่วยนับที่ต้องการปิดใช้งาน");
  const used = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.unit, unit.name));
  if (Number(used[0]?.count ?? 0) > 0) throw new Error("หน่วยนับนี้ยังถูกใช้งานกับสินค้า ไม่สามารถปิดใช้งานได้");
  await db.update(units).set({ isActive: 0 }).where(eq(units.id, id));
  return id;
}

export async function suggestSku(name: string, category: string) {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  const prefix = buildSkuPrefix(name, category);
  const rows = await db.select({ sku: products.sku }).from(products).where(like(products.sku, `${prefix}-%`)).orderBy(asc(products.sku));
  return pickNextSku(prefix, rows.map((row) => row.sku));
}
