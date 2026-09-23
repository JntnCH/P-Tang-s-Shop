import {
  LayoutDashboard,
  Package,
  Boxes,
  PackagePlus,
  PackageMinus,
  ClipboardList,
  History,
  Printer,
  Settings,
  ScanLine,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

/** เมนูหลักของระบบ (Phase 1: โครงสร้างหน้าเท่านั้น) */
export const navItems: NavItem[] = [
  { to: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { to: "/products", label: "สินค้า", icon: Package },
  { to: "/stock", label: "สต็อกสินค้า", icon: Boxes },
  { to: "/receive", label: "รับสินค้าเข้า", icon: PackagePlus },
  { to: "/issue", label: "จ่ายสินค้าออก", icon: PackageMinus },
  { to: "/reorder", label: "รายการที่ต้องสั่งซื้อ", icon: ClipboardList },
  { to: "/history", label: "ประวัติรายการ", icon: History },
  { to: "/scan", label: "สแกนบาร์โค้ด", icon: ScanLine },
  { to: "/printers", label: "เครื่องพิมพ์", icon: Printer },
  { to: "/settings", label: "ตั้งค่า", icon: Settings },
];

/** เมนูลัดด้านล่างสำหรับมือถือ */
export const mobileNavItems: NavItem[] = [
  navItems[0],
  navItems[1],
  navItems[7],
  navItems[3],
  navItems[5],
];
