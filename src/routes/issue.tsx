import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/issue")({
  head: () => ({
    meta: [
      { title: "จ่ายสินค้าออก | MiniMark" },
      { name: "description", content: "บันทึกการจ่ายสินค้าออกจากสต็อกพร้อมประวัติการเคลื่อนไหว" },
      { property: "og:title", content: "จ่ายสินค้าออก | MiniMark" },
      { property: "og:description", content: "บันทึกการจ่ายสินค้าออกจากสต็อก" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="จ่ายสินค้าออก"
      description="บันทึกจำนวนสินค้าที่จ่ายออก พร้อมสร้างประวัติการเคลื่อนไหวทุกครั้ง"
      phase="Phase 3"
      notice="การบันทึกจ่ายสินค้าออกและการสร้าง Stock Movement จะสร้างใน Phase 3"
      sections={[
        "ค้นหา/สแกนสินค้าเข้ารายการ",
        "รายการสินค้าที่จะจ่ายออก",
        "จำนวนก่อน / หลังเปลี่ยน",
        "บันทึกและพิมพ์ใบเสร็จ",
      ]}
    />
  ),
});
