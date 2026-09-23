import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "ตั้งค่า | MiniMark" },
      { name: "description", content: "ตั้งค่าข้อมูลร้าน หมวดหมู่ หน่วยนับ และผู้ใช้งาน" },
      { property: "og:title", content: "ตั้งค่า | MiniMark" },
      { property: "og:description", content: "ตั้งค่าระบบจัดการร้านโชว์ห่วย" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="ตั้งค่า"
      description="ข้อมูลร้าน หมวดหมู่สินค้า หน่วยนับ และสิทธิ์ผู้ใช้งาน"
      phase="Phase 12"
      notice="ระบบผู้ใช้งาน สิทธิ์ (Admin/Staff) และ Audit Log จะสร้างใน Phase 12"
      sections={["ข้อมูลร้าน", "หมวดหมู่และหน่วยนับ", "ผู้ใช้งานและสิทธิ์", "Audit Log"]}
    />
  ),
});
