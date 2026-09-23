import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/stock")({
  head: () => ({
    meta: [
      { title: "สต็อกสินค้า | MiniMark" },
      { name: "description", content: "ดูจำนวนคงเหลือ สินค้าใกล้หมด และสินค้าหมดของร้าน" },
      { property: "og:title", content: "สต็อกสินค้า | MiniMark" },
      { property: "og:description", content: "ดูจำนวนคงเหลือและสถานะสต็อกสินค้า" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="สต็อกสินค้า"
      description="จำนวนคงเหลือและสถานะของสินค้าแต่ละรายการ"
      phase="Phase 3–4"
      notice="ระบบสต็อกและการแจ้งเตือนสถานะ (ปกติ / ใกล้หมด / หมด / ต้องสั่งซื้อ) จะสร้างใน Phase 3–4"
      sections={[
        "สรุปตามสถานะสต็อก",
        "ตารางจำนวนคงเหลือ",
        "ตัวกรองสถานะและหมวดหมู่",
        "ลิงก์ไปรับ/จ่ายสินค้า",
      ]}
    />
  ),
});
