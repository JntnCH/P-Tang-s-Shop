import { and, asc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { inventory, products, stockMovements, type InsertProduct, users, type InsertUser } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export type ProductFilters = {
  search?: string;
  category?: string;
  status?: "all" | "inStock" | "low" | "out";
};

export const DEFAULT_CATEGORIES = ["ทั่วไป", "เครื่องดื่ม", "อาหาร", "ขนม", "ของใช้ทั่วไป", "ของใช้ในบ้าน", "เครื่องปรุง"];

export type ProductRow = {
  id: number;
  barcode: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: string;
  sellPrice: string;
  minimumStock: number;
  isActive: boolean;
  quantity: number;
  status: "normal" | "low" | "out";
  createdAt: Date;
  updatedAt: Date;
};

function stockStatus(quantity: number, minimumStock: number): ProductRow["status"] {
  if (quantity <= 0) return "out";
  if (quantity <= minimumStock) return "low";
  return "normal";
}

function toProductRow(row: Omit<ProductRow, "isActive" | "quantity" | "status"> & { isActive: number; quantity: number | string | null }): ProductRow {
  const quantity = Number(row.quantity ?? 0);
  return {
    ...row,
    isActive: Boolean(row.isActive),
    quantity,
    status: stockStatus(quantity, row.minimumStock),
  };
}

export async function listProducts(filters: ProductFilters = {}): Promise<ProductRow[]> {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");

  const conditions = [eq(products.isActive, 1)];
  const search = filters.search?.trim();
  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        like(products.name, searchPattern),
        like(products.sku, searchPattern),
        like(products.barcode, searchPattern),
      )!,
    );
  }
  if (filters.category && filters.category !== "all") {
    conditions.push(eq(products.category, filters.category));
  }

  const rows = await db
    .select({
      id: products.id,
      barcode: products.barcode,
      sku: products.sku,
      name: products.name,
      category: products.category,
      unit: products.unit,
      costPrice: products.costPrice,
      sellPrice: products.sellPrice,
      minimumStock: products.minimumStock,
      isActive: products.isActive,
      quantity: sql<number>`coalesce(${inventory.quantity}, 0)`,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .where(and(...conditions))
    .orderBy(asc(products.name));

  const result = rows.map((row) => toProductRow(row));
  if (!filters.status || filters.status === "all") return result;
  if (filters.status === "inStock") return result.filter((item) => item.quantity > 0);
  return result.filter((item) => item.status === filters.status);
}

export async function listCategories(): Promise<string[]> {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  const rows = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(eq(products.isActive, 1))
    .orderBy(asc(products.category));
  return Array.from(new Set([...DEFAULT_CATEGORIES, ...rows.map((row) => row.category)])).sort((a, b) => a.localeCompare(b, "th"));
}

export async function getInventorySummary() {
  const rows = await listProducts();
  const summary = rows.reduce(
    (acc, row) => {
      const value = row.quantity * Number(row.costPrice);
      acc.totalProducts += 1;
      acc.inventoryValue += value;
      if (row.quantity > 0) acc.inStock += 1;
      if (row.status === "low") acc.lowStock += 1;
      if (row.status === "out") acc.outOfStock += 1;
      if (row.status === "low" || row.status === "out") acc.toReorder += 1;
      return acc;
    },
    { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0, toReorder: 0, inventoryValue: 0 },
  );
  return summary;
}

export type ProductInput = {
  barcode: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  minimumStock: number;
  quantity: number;
};

async function ensureUniqueProduct(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, input: Pick<ProductInput, "barcode" | "sku">, exceptId?: number) {
  const conditions = [or(eq(products.barcode, input.barcode), eq(products.sku, input.sku))!];
  if (exceptId !== undefined) conditions.push(sql`${products.id} <> ${exceptId}`);
  const existing = await db.select({ id: products.id }).from(products).where(and(...conditions)).limit(1);
  if (existing[0]) throw new Error("Barcode หรือ SKU นี้มีอยู่แล้ว");
}

export async function createProduct(input: ProductInput) {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  await ensureUniqueProduct(db, input, undefined);
  return db.transaction(async (tx) => {
    const values: InsertProduct = {
      barcode: input.barcode,
      sku: input.sku,
      name: input.name,
      category: input.category,
      unit: input.unit,
      costPrice: input.costPrice.toFixed(2),
      sellPrice: input.sellPrice.toFixed(2),
      minimumStock: input.minimumStock,
      isActive: 1,
    };
    const inserted = await tx.insert(products).values(values);
    const productId = Number(inserted[0].insertId);
    await tx.insert(inventory).values({ productId, quantity: input.quantity });
    if (input.quantity > 0) {
      await tx.insert(stockMovements).values({ productId, type: "opening", quantity: input.quantity, quantityBefore: 0, quantityAfter: input.quantity, referenceType: "product_create", note: "ยอดตั้งต้นจากการเพิ่มสินค้า" });
    }
    return productId;
  });
}

export async function updateProduct(id: number, input: ProductInput) {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  const current = await db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
  if (!current[0]) throw new Error("ไม่พบสินค้าที่ต้องการแก้ไข");
  await ensureUniqueProduct(db, input, id);
  await db.transaction(async (tx) => {
    const currentInventory = (await tx.select({ quantity: inventory.quantity }).from(inventory).where(eq(inventory.productId, id)).limit(1))[0];
    const previousQuantity = currentInventory?.quantity ?? 0;
    await tx
      .update(products)
      .set({
        barcode: input.barcode,
        sku: input.sku,
        name: input.name,
        category: input.category,
        unit: input.unit,
        costPrice: input.costPrice.toFixed(2),
        sellPrice: input.sellPrice.toFixed(2),
        minimumStock: input.minimumStock,
      })
      .where(eq(products.id, id));
    await tx
      .insert(inventory)
      .values({ productId: id, quantity: input.quantity })
      .onDuplicateKeyUpdate({ set: { quantity: input.quantity } });
    if (input.quantity !== previousQuantity) {
      await tx.insert(stockMovements).values({ productId: id, type: "adjustment", quantity: Math.abs(input.quantity - previousQuantity), quantityBefore: previousQuantity, quantityAfter: input.quantity, referenceType: "product_update", note: "ปรับจำนวนจากการแก้ไขสินค้า" });
    }
  });
  return id;
}

export async function deactivateProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  await db.update(products).set({ isActive: 0 }).where(eq(products.id, id));
  return id;
}
