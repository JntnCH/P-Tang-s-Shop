import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/receive")({
  head: () => ({
    meta: [
      { title: "รับสินค้าเข้า | MiniMark" },
      { name: "description", content: "บันทึกการรับสินค้าเข้าสต็อกพร้อมประวัติการเคลื่อนไหว" },
      { property: "og:title", content: "รับสินค้าเข้า | MiniMark" },
      { property: "og:description", content: "บันทึกการรับสินค้าเข้าสต็อก" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="รับสินค้าเข้า"
      description="บันทึกจำนวนสินค้าที่รับเข้า พร้อมสร้างประวัติการเคลื่อนไหวทุกครั้ง"
      phase="Phase 3"
      notice="การบันทึกรับสินค้าเข้าและการสร้าง Stock Movement จะสร้างใน Phase 3"
      sections={[
        "ค้นหา/สแกนสินค้าเข้ารายการ",
        "รายการสินค้าที่จะรับเข้า",
        "จำนวนก่อน / หลังเปลี่ยน",
        "บันทึกและพิมพ์ใบรับสินค้า",
      ]}
    />
  ),
});
