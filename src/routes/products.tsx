import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "สินค้า | MiniMark" },
      { name: "description", content: "จัดการรายการสินค้า SKU บาร์โค้ด และราคาของร้านโชว์ห่วย" },
      { property: "og:title", content: "สินค้า | MiniMark" },
      { property: "og:description", content: "จัดการรายการสินค้าของร้านโชว์ห่วย" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="สินค้า"
      description="รายการสินค้าทั้งหมด พร้อมค้นหา กรองหมวดหมู่ และค้นหาด้วยบาร์โค้ด"
      phase="Phase 2"
      notice="ระบบจัดการสินค้า (เพิ่ม/แก้ไข/ลบ/ค้นหา/กันข้อมูลซ้ำ SKU และ Barcode) จะสร้างใน Phase 2"
      sections={[
        "ช่องค้นหาสินค้า / บาร์โค้ด",
        "ตัวกรองหมวดหมู่และสถานะ",
        "ตารางรายการสินค้า",
        "ฟอร์มเพิ่ม/แก้ไขสินค้า",
      ]}
    />
  ),
});
