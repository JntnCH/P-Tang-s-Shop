import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "ประวัติรายการ | MiniMark" },
      { name: "description", content: "ประวัติการรับเข้าและจ่ายออกของสินค้าทุกรายการ" },
      { property: "og:title", content: "ประวัติรายการ | MiniMark" },
      { property: "og:description", content: "ประวัติการเคลื่อนไหวของสต็อกสินค้า" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="ประวัติรายการ"
      description="ประวัติการเคลื่อนไหวของสต็อก ทั้งรับเข้าและจ่ายออก"
      phase="Phase 3"
      notice="ประวัติ Stock Movement (วันที่ สินค้า ประเภท จำนวนก่อน/หลัง ผู้ทำรายการ หมายเหตุ) จะสร้างใน Phase 3"
      sections={[
        "ตัวกรองช่วงวันที่",
        "ตัวกรองประเภทการเคลื่อนไหว",
        "ตารางประวัติรายการ",
        "ส่งออกและพิมพ์รายงาน",
      ]}
    />
  ),
});
