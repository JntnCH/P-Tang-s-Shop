import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/reorder")({
  head: () => ({
    meta: [
      { title: "รายการที่ต้องสั่งซื้อ | MiniMark" },
      { name: "description", content: "สินค้าที่ถึงจุดสั่งซื้อพร้อมจำนวนที่แนะนำให้สั่ง" },
      { property: "og:title", content: "รายการที่ต้องสั่งซื้อ | MiniMark" },
      { property: "og:description", content: "สินค้าที่ถึงจุดสั่งซื้อและจำนวนที่แนะนำ" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="รายการสินค้าที่ต้องสั่งซื้อ"
      description="สินค้าที่ถึงจุดสั่งซื้อ พร้อมจำนวนแนะนำและมูลค่าโดยประมาณ"
      phase="Phase 4–6"
      notice="การคำนวณจำนวนที่ควรสั่งและใบสั่งซื้อ (Purchase Order) จะสร้างใน Phase 4–6"
      sections={[
        "ตารางสินค้าที่ต้องสั่งซื้อ",
        "จำนวนปัจจุบัน / ขั้นต่ำ / แนะนำให้สั่ง",
        "มูลค่าการสั่งซื้อโดยประมาณ",
        "สร้างใบสั่งซื้อ",
      ]}
    />
  ),
});
