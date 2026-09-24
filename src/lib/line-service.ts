/**
 * LINE Integration Service
 * Handles LINE LIFF, Mini App detection, and LINE Flex Message for Purchase Orders.
 * Strictly adheres to Zero-Secret-Leakage: All keys come from Environment Injection.
 */

import type { ProductItem } from "./store";

export interface LineOrderItem {
  product: ProductItem;
  quantity: number;
  unitName: string;
}

export interface LineConfigStatus {
  hasLiffId: boolean;
  liffIdDisplay: string;
  isInClient: boolean;
  isLoggedIn: boolean;
  profileName?: string | undefined;
  profilePicture?: string | undefined;
  error?: string | undefined;
}

// Strictly retrieve LIFF ID from Vite env without any hardcoded fallback
export function getClientLiffId(): string | null {
  if (typeof window === "undefined") return null;
  const id = import.meta.env["VITE_LINE_LIFF_ID"];
  if (!id || typeof id !== "string" || id.trim() === "") {
    return null;
  }
  return id.trim();
}

let liffInstance: typeof import("@line/liff").default | null = null;
let liffInitPromise: Promise<boolean> | null = null;

/**
 * Initializes LINE LIFF SDK safely (Browser-only, no fallback secrets)
 */
export async function initLiff(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const liffId = getClientLiffId();
  if (!liffId) {
    return false;
  }

  if (liffInitPromise) {
    return liffInitPromise;
  }

  liffInitPromise = (async () => {
    try {
      const liffMod = await import("@line/liff");
      const liff = liffMod.default;
      liffInstance = liff;
      await liff.init({ liffId });
      return true;
    } catch (err) {
      console.warn("LIFF initialization note:", err);
      return false;
    }
  })();

  return liffInitPromise;
}

/**
 * Gets current LIFF and LINE environment diagnostics.
 */
export async function getLineStatus(): Promise<LineConfigStatus> {
  const liffId = getClientLiffId();
  if (!liffId) {
    return {
      hasLiffId: false,
      liffIdDisplay: "ไม่ได้ตั้งค่า (รอ VITE_LINE_LIFF_ID)",
      isInClient: false,
      isLoggedIn: false,
    };
  }

  const initialized = await initLiff();
  if (!initialized || !liffInstance) {
    return {
      hasLiffId: true,
      liffIdDisplay: `${liffId.slice(0, 4)}...${liffId.slice(-4)}`,
      isInClient: false,
      isLoggedIn: false,
      error: "LIFF Init ไม่สำเร็จ หรือรหัส LIFF ID ไม่ถูกต้อง",
    };
  }

  const inClient = liffInstance.isInClient();
  const loggedIn = liffInstance.isLoggedIn();
  let profileName: string | undefined;
  let profilePicture: string | undefined;

  if (loggedIn) {
    try {
      const profile = await liffInstance.getProfile();
      profileName = profile.displayName;
      profilePicture = profile.pictureUrl;
    } catch {
      // Profile fetch optional
    }
  }

  return {
    hasLiffId: true,
    liffIdDisplay: `${liffId.slice(0, 4)}...${liffId.slice(-4)}`,
    isInClient: inClient,
    isLoggedIn: loggedIn,
    profileName,
    profilePicture,
  };
}

/**
 * Generates LINE Flex Message payload for Daily Purchase Order.
 * Specifications: รายการ -> จำนวน -> หน่วยนับ
 */
export function buildOrderFlexMessage(
  orders: LineOrderItem[],
  note: string = "ใบสั่งซื้อสินค้าประจำวัน",
  storeName: string = "ร้าน MiniMark",
) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalItems = orders.reduce((sum, o) => sum + o.quantity, 0);
  const totalCost = orders.reduce((sum, o) => sum + o.quantity * (o.product.costPrice || 0), 0);

  const itemRows = orders.map((item, index) => ({
    type: "box" as const,
    layout: "horizontal" as const,
    spacing: "sm" as const,
    contents: [
      {
        type: "text" as const,
        text: `${index + 1}. ${item.product.name}`,
        size: "sm" as const,
        color: "#1f2937",
        flex: 6,
        wrap: true,
      },
      {
        type: "text" as const,
        text: `${item.quantity} ${item.unitName}`,
        size: "sm" as const,
        color: "#059669",
        weight: "bold" as const,
        align: "end" as const,
        flex: 4,
      },
    ],
  }));

  return {
    type: "flex" as const,
    altText: `📦 ${note} (${totalItems} ชิ้น) - ${storeName}`,
    contents: {
      type: "bubble" as const,
      size: "giga" as const,
      header: {
        type: "box" as const,
        layout: "vertical" as const,
        backgroundColor: "#06c755",
        paddingAll: "lg" as const,
        contents: [
          {
            type: "text" as const,
            text: "📦 ใบสั่งซื้อสินค้าประจำวัน",
            weight: "bold" as const,
            color: "#ffffff",
            size: "lg" as const,
          },
          {
            type: "text" as const,
            text: `${storeName} • ${dateStr} ${timeStr} น.`,
            color: "#e6fffa",
            size: "xs" as const,
            margin: "xs" as const,
          },
        ],
      },
      body: {
        type: "box" as const,
        layout: "vertical" as const,
        contents: [
          {
            type: "box" as const,
            layout: "horizontal" as const,
            contents: [
              {
                type: "text" as const,
                text: "รายการสินค้าที่จะสั่งซื้อ",
                size: "xs" as const,
                color: "#6b7280",
                weight: "bold" as const,
                flex: 6,
              },
              {
                type: "text" as const,
                text: "จำนวน / หน่วยนับ",
                size: "xs" as const,
                color: "#6b7280",
                weight: "bold" as const,
                align: "end" as const,
                flex: 4,
              },
            ],
          },
          {
            type: "separator" as const,
            margin: "sm" as const,
          },
          {
            type: "box" as const,
            layout: "vertical" as const,
            margin: "md" as const,
            spacing: "md" as const,
            contents:
              itemRows.length > 0
                ? itemRows
                : [
                    {
                      type: "text" as const,
                      text: "ไม่มีรายการสินค้า",
                      size: "sm" as const,
                      color: "#9ca3af",
                    },
                  ],
          },
          {
            type: "separator" as const,
            margin: "lg" as const,
          },
          {
            type: "box" as const,
            layout: "horizontal" as const,
            margin: "md" as const,
            contents: [
              {
                type: "text" as const,
                text: "รวมจำนวนสินค้าทั้งหมด",
                size: "sm" as const,
                color: "#374151",
              },
              {
                type: "text" as const,
                text: `${totalItems} รายการ`,
                size: "sm" as const,
                weight: "bold" as const,
                color: "#111827",
                align: "end" as const,
              },
            ],
          },
          {
            type: "box" as const,
            layout: "horizontal" as const,
            margin: "xs" as const,
            contents: [
              {
                type: "text" as const,
                text: "ประมาณการยอดเงินสั่งซื้อ",
                size: "sm" as const,
                color: "#374151",
              },
              {
                type: "text" as const,
                text: `฿${totalCost.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`,
                size: "md" as const,
                weight: "bold" as const,
                color: "#059669",
                align: "end" as const,
              },
            ],
          },
        ],
      },
    },
  };
}

/**
 * Creates plain text fallback for web share intent
 */
export function buildOrderPlainText(
  orders: LineOrderItem[],
  storeName: string = "ร้าน MiniMark",
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("th-TH");
  const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  let text = `📦 ใบสั่งซื้อสินค้าประจำวัน — ${storeName}\n`;
  text += `📅 วันที่: ${dateStr} เวลา ${timeStr} น.\n`;
  text += `────────────────────\n`;
  text += `รายการสินค้า (รายการ -> จำนวน -> หน่วยนับ):\n`;

  orders.forEach((item, index) => {
    text += `${index + 1}. ${item.product.name} ➔ ${item.quantity} ${item.unitName}\n`;
  });

  const totalItems = orders.reduce((sum, o) => sum + o.quantity, 0);
  const totalCost = orders.reduce((sum, o) => sum + o.quantity * (o.product.costPrice || 0), 0);

  text += `────────────────────\n`;
  text += `รวมสินค้า: ${totalItems} หน่วย\n`;
  text += `ประมาณการค่าใช้จ่าย: ฿${totalCost.toLocaleString("th-TH", { minimumFractionDigits: 2 })}\n`;
  text += `ส่งจากระบบ MiniMark`;

  return text;
}

export type LineShareTarget = "group" | "personal";

export interface LineShareResult {
  success: boolean;
  channel: "liff_picker" | "liff_send" | "line_intent";
  message: string;
}

/**
 * Dispatches the order to LINE either via LIFF Target Picker (Group / Personal)
 * or via standard LINE Share Intent when running outside LIFF.
 */
export async function sendOrderToLine(
  orders: LineOrderItem[],
  target: LineShareTarget = "group",
  storeName: string = "ร้าน MiniMark",
): Promise<LineShareResult> {
  const flex = buildOrderFlexMessage(
    orders,
    `ใบสั่งซื้อประจำวัน (${target === "group" ? "กลุ่ม" : "ส่วนตัว"})`,
    storeName,
  );
  const plain = buildOrderPlainText(orders, storeName);

  const liffId = getClientLiffId();

  if (liffId) {
    const initialized = await initLiff();
    if (initialized && liffInstance) {
      // If inside LINE LIFF with shareTargetPicker capability
      if (liffInstance.isApiAvailable("shareTargetPicker")) {
        try {
          const res = await liffInstance.shareTargetPicker([flex]);
          if (res) {
            return {
              success: true,
              channel: "liff_picker",
              message:
                target === "group" ? "ส่งเข้า LINE กลุ่มสำเร็จ" : "ส่งเข้า LINE ส่วนตัวสำเร็จ",
            };
          }
          return {
            success: false,
            channel: "liff_picker",
            message: "ผู้ใช้ยกเลิกการเลือกแชท LINE",
          };
        } catch (pickerErr) {
          console.warn("LIFF shareTargetPicker error:", pickerErr);
        }
      }

      // If already in client chat and can send messages directly
      if (liffInstance.isInClient()) {
        try {
          await liffInstance.sendMessages([flex]);
          return {
            success: true,
            channel: "liff_send",
            message: "ส่งข้อความ Flex Message เข้าแชท LINE เรียบร้อยแล้ว",
          };
        } catch (sendErr) {
          console.warn("LIFF sendMessages error:", sendErr);
        }
      }
    }
  }

  // Fallback: Open LINE Share Intent URL (works on all web browsers & mobile)
  const lineIntentUrl = `https://line.me/R/share?text=${encodeURIComponent(plain)}`;
  if (typeof window !== "undefined") {
    // In iframe or web environment, open share intent
    const link = document.createElement("a");
    link.href = lineIntentUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    success: true,
    channel: "line_intent",
    message: `เปิดหน้าแชร์ LINE สำหรับส่งเข้า${target === "group" ? "กลุ่ม" : "ส่วนตัว"}เรียบร้อย`,
  };
}

export interface OrderFlexItem {
  name: string;
  quantity: number;
  unitName: string;
  barcode?: string;
  priceEstimate?: number;
}

export function formatDailyOrderFlexMessage(items: OrderFlexItem[], dateStr?: string) {
  const lineOrders: LineOrderItem[] = items.map((i) => ({
    product: {
      id: i.barcode || i.name,
      barcode: i.barcode || "",
      codeType: "Barcode",
      name: i.name,
      categoryId: "",
      zoneId: "",
      unitId: "",
      costPrice: i.priceEstimate && i.quantity ? i.priceEstimate / i.quantity : 0,
      sellPrice: 0,
      stock: 0,
      minStock: 0,
      reorderQuantity: i.quantity,
    },
    quantity: i.quantity,
    unitName: i.unitName,
  }));
  return buildOrderFlexMessage(lineOrders, `ใบสั่งซื้อประจำวัน (${dateStr || "วันนี้"})`);
}

export function formatOrderPlainText(items: OrderFlexItem[], dateStr?: string): string {
  const lineOrders: LineOrderItem[] = items.map((i) => ({
    product: {
      id: i.barcode || i.name,
      barcode: i.barcode || "",
      codeType: "Barcode",
      name: i.name,
      categoryId: "",
      zoneId: "",
      unitId: "",
      costPrice: i.priceEstimate && i.quantity ? i.priceEstimate / i.quantity : 0,
      sellPrice: 0,
      stock: 0,
      minStock: 0,
      reorderQuantity: i.quantity,
    },
    quantity: i.quantity,
    unitName: i.unitName,
  }));
  return buildOrderPlainText(lineOrders);
}

export async function sendDailyOrderToLine(
  items: (OrderFlexItem & { product?: ProductItem })[],
  target: LineShareTarget = "group",
  dateStr?: string,
): Promise<{ success: boolean; method?: string; error?: string }> {
  const lineOrders: LineOrderItem[] = items.map((i) => ({
    product: i.product || {
      id: i.barcode || i.name,
      barcode: i.barcode || "",
      codeType: "Barcode",
      name: i.name,
      categoryId: "",
      zoneId: "",
      unitId: "",
      costPrice: i.priceEstimate && i.quantity ? i.priceEstimate / i.quantity : 0,
      sellPrice: 0,
      stock: 0,
      minStock: 0,
      reorderQuantity: i.quantity,
    },
    quantity: i.quantity,
    unitName: i.unitName,
  }));

  const res = await sendOrderToLine(lineOrders, target);
  return {
    success: res.success,
    method: res.channel === "liff_picker" ? "share_target_picker" : "web_intent",
    error: res.success ? undefined : res.message,
  };
}
