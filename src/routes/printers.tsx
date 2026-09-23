import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/printers")({
  head: () => ({
    meta: [
      { title: "เครื่องพิมพ์ | MiniMark" },
      { name: "description", content: "ตั้งค่าเครื่องพิมพ์ A4, Thermal 58/80mm และ Label Printer" },
      { property: "og:title", content: "เครื่องพิมพ์ | MiniMark" },
      { property: "og:description", content: "จัดการเครื่องพิมพ์หลายรูปแบบของร้าน" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="เครื่องพิมพ์"
      description="จัดการเครื่องพิมพ์หลายเครื่อง ทั้ง A4, Thermal 58/80mm และ Label Printer"
      phase="Phase 8–10"
      notice="ระบบจัดการเครื่องพิมพ์และ Print Service Layer จะสร้างใน Phase 8–10"
      sections={[
        "รายการเครื่องพิมพ์",
        "ประเภทและขนาดกระดาษ",
        "เครื่องพิมพ์เริ่มต้นตามประเภทเอกสาร",
        "Margin และจำนวนสำเนา",
      ]}
    />
  ),
});
