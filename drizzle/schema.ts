import {
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
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

export const lineUsers = mysqlTable("lineUsers", {
  id: int("id").autoincrement().primaryKey(),
  lineUserId: varchar("lineUserId", { length: 64 }).notNull().unique(),
  channelId: varchar("channelId", { length: 64 }).notNull(),
  displayName: varchar("displayName", { length: 255 }),
  pictureUrl: varchar("pictureUrl", { length: 1000 }),
  canWrite: int("canWrite").notNull().default(0),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ channelIdx: index("line_users_channel_idx").on(table.channelId) }));

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

export const stockMovements = mysqlTable("stockMovements", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id),
  type: mysqlEnum("type", ["receive", "issue", "adjustment", "opening"]).notNull(),
  quantity: int("quantity").notNull(),
  quantityBefore: int("quantityBefore").notNull(),
  quantityAfter: int("quantityAfter").notNull(),
  referenceType: varchar("referenceType", { length: 64 }),
  referenceId: int("referenceId"),
  note: varchar("note", { length: 500 }),
  createdBy: int("createdBy").references(() => users.id),
  lineUserId: varchar("lineUserId", { length: 64 }),
  lineOperationKey: varchar("lineOperationKey", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  productIdx: index("stock_movements_product_idx").on(table.productId),
  typeIdx: index("stock_movements_type_idx").on(table.type),
  createdAtIdx: index("stock_movements_created_at_idx").on(table.createdAt),
  referenceIdx: index("stock_movements_reference_idx").on(table.referenceType, table.referenceId),
  lineOperationIdx: uniqueIndex("stock_movements_line_operation_idx").on(table.lineUserId, table.lineOperationKey),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type LineUser = typeof lineUsers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
