/**
 * Master Data & Application Store
 * Stores Zones, Categories, Units, Products, and Orders with persistence.
 */

export interface ZoneItem {
  id: string;
  name: string;
  code: string;
  description?: string | undefined;
}

export interface CategoryItem {
  id: string;
  name: string;
  code: string;
}

export interface UnitItem {
  id: string;
  name: string;
  shortName: string;
}

export interface ProductItem {
  id: string;
  barcode: string;
  codeType: "QR" | "Barcode";
  format?: string | undefined;
  name: string;
  categoryId: string;
  zoneId: string;
  unitId: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  reorderQuantity: number;
  updatedAt: string;
}

export interface ReceiveItem {
  id: string;
  barcode: string;
  codeType: "QR" | "Barcode";
  format?: string | undefined;
  productName: string;
  unit: string;
  quantity: number;
  scannedAt: string;
}

const DEFAULT_ZONES: ZoneItem[] = [
  {
    id: "zone-a",
    code: "Z-A",
    name: "โซน A (หน้าร้าน/เคาน์เตอร์)",
    description: "สินค้าขายดี ขนม บุหรี่",
  },
  {
    id: "zone-b",
    code: "Z-B",
    name: "โซน B (ชั้นกลาง อาหารแห้ง)",
    description: "บะหมี่สำเร็จรูป เครื่องปรุง ของแห้ง",
  },
  {
    id: "zone-c",
    code: "Z-C",
    name: "โซน C (ตู้แช่ เครื่องดื่ม)",
    description: "น้ำอัดลม นม น้ำดื่ม เบียร์",
  },
  {
    id: "zone-d",
    code: "Z-D",
    name: "โซน D (ของใช้ในบ้าน/ซักล้าง)",
    description: "ผงซักฟอก ยาสระผม สบู่",
  },
  {
    id: "zone-e",
    code: "Z-E",
    name: "โซน E (หลังร้าน/สต็อกสำรอง)",
    description: "กล่องสต็อกสำรอง",
  },
];

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: "cat-beverage", code: "BEV", name: "เครื่องดื่ม" },
  { id: "cat-snack", code: "SNK", name: "ขนมขบเคี้ยว" },
  { id: "cat-food", code: "FOD", name: "อาหารสำเร็จรูปและแห้ง" },
  { id: "cat-household", code: "HSH", name: "ของใช้ในครัวเรือน" },
  { id: "cat-personal", code: "PER", name: "ของใช้ส่วนตัว" },
  { id: "cat-general", code: "GEN", name: "สินค้าเบ็ดเตล็ด" },
];

const DEFAULT_UNITS: UnitItem[] = [
  { id: "unit-piece", name: "ชิ้น", shortName: "ชิ้น" },
  { id: "unit-pack", name: "แพ็ค", shortName: "แพ็ค" },
  { id: "unit-box", name: "กล่อง", shortName: "กล่อง" },
  { id: "unit-bottle", name: "ขวด", shortName: "ขวด" },
  { id: "unit-can", name: "กระป๋อง", shortName: "กป." },
  { id: "unit-bag", name: "ซอง", shortName: "ซอง" },
  { id: "unit-crate", name: "ลัง", shortName: "ลัง" },
];

const DEFAULT_PRODUCTS: ProductItem[] = [
  {
    id: "prod-1",
    barcode: "8850124001153",
    codeType: "Barcode",
    format: "EAN_13",
    name: "มาม่า บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้ง 55g",
    categoryId: "cat-food",
    zoneId: "zone-b",
    unitId: "unit-bag",
    costPrice: 6.0,
    sellPrice: 7.0,
    stock: 8,
    minStock: 20,
    reorderQuantity: 30,
    updatedAt: "2026-09-23 10:00",
  },
  {
    id: "prod-2",
    barcode: "8851717001018",
    codeType: "Barcode",
    format: "EAN_13",
    name: "โค้ก น้ำอัดลม ออริจินัล 325ml",
    categoryId: "cat-beverage",
    zoneId: "zone-c",
    unitId: "unit-can",
    costPrice: 12.0,
    sellPrice: 15.0,
    stock: 5,
    minStock: 24,
    reorderQuantity: 48,
    updatedAt: "2026-09-23 10:15",
  },
  {
    id: "prod-3",
    barcode: "8850718801124",
    codeType: "Barcode",
    format: "EAN_13",
    name: "เลย์ มันฝรั่งแท้ทอดกรอบ รสคลาสสิค 42g",
    categoryId: "cat-snack",
    zoneId: "zone-a",
    unitId: "unit-bag",
    costPrice: 17.5,
    sellPrice: 20.0,
    stock: 12,
    minStock: 15,
    reorderQuantity: 20,
    updatedAt: "2026-09-23 11:00",
  },
  {
    id: "prod-4",
    barcode: "QR-WATER-CRYSTAL-600",
    codeType: "QR",
    format: "QR_CODE",
    name: "น้ำดื่มคริสตัล 600ml (แพ็ค 12 ขวด)",
    categoryId: "cat-beverage",
    zoneId: "zone-c",
    unitId: "unit-pack",
    costPrice: 48.0,
    sellPrice: 60.0,
    stock: 3,
    minStock: 10,
    reorderQuantity: 15,
    updatedAt: "2026-09-23 11:30",
  },
  {
    id: "prod-5",
    barcode: "8850029010045",
    codeType: "Barcode",
    format: "EAN_13",
    name: "บรีส เอกเซล ผงซักฟอก สูตรเข้มข้น 750g",
    categoryId: "cat-household",
    zoneId: "zone-d",
    unitId: "unit-bag",
    costPrice: 72.0,
    sellPrice: 89.0,
    stock: 4,
    minStock: 8,
    reorderQuantity: 12,
    updatedAt: "2026-09-23 12:00",
  },
];

const STORAGE_KEYS = {
  ZONES: "minimark_zones",
  CATEGORIES: "minimark_categories",
  UNITS: "minimark_units",
  PRODUCTS: "minimark_products",
  RECEIVES: "minimark_receives",
};

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("minimark_store_change"));
  } catch {
    // ignore
  }
}

export const MasterStore = {
  // Zones
  getZones(): ZoneItem[] {
    return safeGet<ZoneItem[]>(STORAGE_KEYS.ZONES, DEFAULT_ZONES);
  },
  saveZones(items: ZoneItem[]) {
    safeSet(STORAGE_KEYS.ZONES, items);
  },
  addZone(item: Omit<ZoneItem, "id">) {
    const list = this.getZones();
    const newItem: ZoneItem = { ...item, id: `zone-${Date.now()}` };
    this.saveZones([...list, newItem]);
    return newItem;
  },
  updateZone(id: string, updates: Partial<ZoneItem>) {
    const list = this.getZones().map((z) => (z.id === id ? { ...z, ...updates } : z));
    this.saveZones(list);
  },
  deleteZone(id: string) {
    const list = this.getZones().filter((z) => z.id !== id);
    this.saveZones(list);
  },

  // Categories
  getCategories(): CategoryItem[] {
    return safeGet<CategoryItem[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  },
  saveCategories(items: CategoryItem[]) {
    safeSet(STORAGE_KEYS.CATEGORIES, items);
  },
  addCategory(item: Omit<CategoryItem, "id">) {
    const list = this.getCategories();
    const newItem: CategoryItem = { ...item, id: `cat-${Date.now()}` };
    this.saveCategories([...list, newItem]);
    return newItem;
  },
  updateCategory(id: string, updates: Partial<CategoryItem>) {
    const list = this.getCategories().map((c) => (c.id === id ? { ...c, ...updates } : c));
    this.saveCategories(list);
  },
  deleteCategory(id: string) {
    const list = this.getCategories().filter((c) => c.id !== id);
    this.saveCategories(list);
  },

  // Units
  getUnits(): UnitItem[] {
    return safeGet<UnitItem[]>(STORAGE_KEYS.UNITS, DEFAULT_UNITS);
  },
  saveUnits(items: UnitItem[]) {
    safeSet(STORAGE_KEYS.UNITS, items);
  },
  addUnit(item: Omit<UnitItem, "id">) {
    const list = this.getUnits();
    const newItem: UnitItem = { ...item, id: `unit-${Date.now()}` };
    this.saveUnits([...list, newItem]);
    return newItem;
  },
  updateUnit(id: string, updates: Partial<UnitItem>) {
    const list = this.getUnits().map((u) => (u.id === id ? { ...u, ...updates } : u));
    this.saveUnits(list);
  },
  deleteUnit(id: string) {
    const list = this.getUnits().filter((u) => u.id !== id);
    this.saveUnits(list);
  },

  // Products
  getProducts(): ProductItem[] {
    return safeGet<ProductItem[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
  },
  saveProducts(items: ProductItem[]) {
    safeSet(STORAGE_KEYS.PRODUCTS, items);
  },
  addProduct(item: Omit<ProductItem, "id" | "updatedAt">) {
    const list = this.getProducts();
    const newItem: ProductItem = {
      ...item,
      id: `prod-${Date.now()}`,
      updatedAt:
        new Date().toLocaleDateString("th-TH") + " " + new Date().toLocaleTimeString("th-TH"),
    };
    this.saveProducts([newItem, ...list]);
    return newItem;
  },
  updateProduct(id: string, updates: Partial<ProductItem>) {
    const nowStr =
      new Date().toLocaleDateString("th-TH") + " " + new Date().toLocaleTimeString("th-TH");
    const list = this.getProducts().map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: nowStr } : p,
    );
    this.saveProducts(list);
  },
  deleteProduct(id: string) {
    const list = this.getProducts().filter((p) => p.id !== id);
    this.saveProducts(list);
  },
  findByBarcode(code: string): ProductItem | undefined {
    const trimmed = code.trim();
    return this.getProducts().find((p) => p.barcode === trimmed);
  },

  // Receives / Scans
  getReceives(): ReceiveItem[] {
    return safeGet<ReceiveItem[]>(STORAGE_KEYS.RECEIVES, []);
  },
  addReceive(item: Omit<ReceiveItem, "id">) {
    const list = this.getReceives();
    const newItem: ReceiveItem = { ...item, id: `rec-${Date.now()}` };
    safeSet(STORAGE_KEYS.RECEIVES, [newItem, ...list]);
    return newItem;
  },
  clearReceives() {
    safeSet(STORAGE_KEYS.RECEIVES, []);
  },
};
