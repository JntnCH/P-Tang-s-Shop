import {
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  barcode: varchar("barcode", { length: 64 }).notNull().unique(),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull().default("ทั่วไป"),
  unit: varchar("unit", { length: 32 }).notNull().default("ชิ้น"),
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sellPrice: decimal("sellPrice", { precision: 10, scale: 2 }).notNull().default("0.00"),
  minimumStock: int("minimumStock").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nameIdx: index("products_name_idx").on(table.name),
  categoryIdx: index("products_category_idx").on(table.category),
  activeIdx: index("products_active_idx").on(table.isActive),
}));

export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().unique().references(() => products.id, { onDelete: "cascade" }),
  quantity: int("quantity").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ productIdx: index("inventory_product_idx").on(table.productId) }));

export const purchaseOrders = mysqlTable("purchaseOrders", {
  id: int("id").autoincrement().primaryKey(),
  status: mysqlEnum("status", ["draft", "sent", "partially_received", "received"]).default("draft").notNull(),
  orderedAt: timestamp("orderedAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ statusIdx: index("purchase_orders_status_idx").on(table.status), orderedAtIdx: index("purchase_orders_ordered_at_idx").on(table.orderedAt) }));

export const purchaseOrderItems = mysqlTable("purchaseOrderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id),
  quantityOrdered: int("quantityOrdered").notNull().default(0),
  unit: varchar("unit", { length: 32 }).notNull(),
  quantityReceived: int("quantityReceived").notNull().default(0),
  receivedAt: timestamp("receivedAt"),
}, (table) => ({ orderIdx: index("purchase_order_items_order_idx").on(table.orderId), productIdx: index("purchase_order_items_product_idx").on(table.productId) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
