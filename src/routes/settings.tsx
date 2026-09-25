import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  ExternalLink,
  Eye,
  FileCode2,
  FolderTree,
  Info,
  Layers,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Scale,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createDailySummaryFlexBubble,
  createPurchaseOrderFlexBubble,
  createStockAlertFlexBubble,
} from "@/lib/flex-templates";
import {
  getLineFollowersHistoryFn,
  getLineServerConfigFn,
  registerLineFollowerFn,
  syncMasterDatabaseFn,
} from "@/lib/line-server-fn";
import { getClientLiffId, getLineStatus, type LineConfigStatus } from "@/lib/line-service";
import {
  MasterStore,
  type CategoryItem,
  type LineUserFollower,
  type UnitItem,
  type ZoneItem,
} from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "ตั้งค่าระบบ & ฐานข้อมูล | MiniMark" },
      {
        name: "description",
        content:
          "จัดการโซนสินค้า หมวดหมู่ หน่วยนับ ผู้ใช้งานและผู้ติดตาม LINE Bot, User ID และแม่แบบ Flex Message",
      },
      { property: "og:title", content: "ตั้งค่าระบบ & ฐานข้อมูล | MiniMark" },
      {
        property: "og:description",
        content: "จัดการข้อมูลหลักและการเชื่อมต่อ LINE พร้อมฐานข้อมูลผู้ใช้งาน",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [activeTab, setActiveTab] = useState("followers");

  // Zone State
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneItem | null>(null);
  const [zoneForm, setZoneForm] = useState({ name: "", code: "", description: "" });

  // Category State
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [catForm, setCatForm] = useState({ name: "", code: "" });

  // Unit State
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);
  const [unitForm, setUnitForm] = useState({ name: "", shortName: "" });

  // Followers & Users State (ข้อมูลผู้ใช้งาน / ผู้ติดตาม LINE Bot / User ID)
  const [followers, setFollowers] = useState<LineUserFollower[]>([]);
  const [followerModalOpen, setFollowerModalOpen] = useState(false);
  const [editingFollower, setEditingFollower] = useState<LineUserFollower | null>(null);
  const [followerForm, setFollowerForm] = useState<{
    userId: string;
    displayName: string;
    pictureUrl: string;
    statusMessage: string;
    role: "admin" | "staff" | "viewer";
  }>({
    userId: "",
    displayName: "",
    pictureUrl: "",
    statusMessage: "",
    role: "staff",
  });
  const [syncStatusMsg, setSyncStatusMsg] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Flex Preview Modal State
  const [previewFlexModalOpen, setPreviewFlexModalOpen] = useState(false);
  const [previewFlexTitle, setPreviewFlexTitle] = useState("");
  const [previewFlexJson, setPreviewFlexJson] = useState<unknown>(null);

  // LINE Status
  const [lineStatus, setLineStatus] = useState<LineConfigStatus | null>(null);
  const [serverLineConfig, setServerLineConfig] = useState<{
    hasChannelId: boolean;
    hasChannelSecret: boolean;
    hasAccessToken: boolean;
    hasServerLiffId: boolean;
  } | null>(null);

  const reloadData = () => {
    setZones(MasterStore.getZones());
    setCategories(MasterStore.getCategories());
    setUnits(MasterStore.getUnits());
    setFollowers(MasterStore.getFollowers());
  };

  useEffect(() => {
    reloadData();
    getLineStatus().then(setLineStatus);
    getLineServerConfigFn()
      .then(setServerLineConfig)
      .catch(() => setServerLineConfig(null));

    // Try background sync with server
    syncWithCentralServer();

    const onStoreChange = () => reloadData();
    window.addEventListener("minimark_store_change", onStoreChange);
    return () => window.removeEventListener("minimark_store_change", onStoreChange);
  }, []);

  const syncWithCentralServer = async () => {
    setIsSyncing(true);
    try {
      const res = await syncMasterDatabaseFn({
        data: {
          products: MasterStore.getProducts(),
          categories: MasterStore.getCategories(),
          zones: MasterStore.getZones(),
          units: MasterStore.getUnits(),
          receives: MasterStore.getReceives(),
          followers: MasterStore.getFollowers(),
          movements: MasterStore.getMovements(),
          purchaseOrders: MasterStore.getPurchaseOrders(),
        },
      });

      if (res.success && res.data) {
        if (res.data.followers && res.data.followers.length > 0) {
          setFollowers(res.data.followers as LineUserFollower[]);
        }
        setSyncStatusMsg("ข้อมูลประสานตรงกันเรียบร้อยแล้ว (All Data Synchronized)");
        setTimeout(() => setSyncStatusMsg(""), 4000);
      }
    } catch (err) {
      console.error("Sync error", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Zone CRUD
  const handleSaveZone = () => {
    if (!zoneForm.name.trim()) return;
    if (editingZone) {
      MasterStore.updateZone(editingZone.id, zoneForm);
    } else {
      MasterStore.addZone(zoneForm);
    }
    setZoneModalOpen(false);
    setEditingZone(null);
    setZoneForm({ name: "", code: "", description: "" });
  };

  const handleEditZone = (item: ZoneItem) => {
    setEditingZone(item);
    setZoneForm({
      name: item.name,
      code: item.code || "",
      description: item.description || "",
    });
    setZoneModalOpen(true);
  };

  const handleDeleteZone = (id: string) => {
    if (confirm("ต้องการลบโซนสินค้านี้ใช่หรือไม่?")) {
      MasterStore.deleteZone(id);
    }
  };

  // Category CRUD
  const handleSaveCategory = () => {
    if (!catForm.name.trim()) return;
    if (editingCat) {
      MasterStore.updateCategory(editingCat.id, catForm);
    } else {
      MasterStore.addCategory(catForm);
    }
    setCatModalOpen(false);
    setEditingCat(null);
    setCatForm({ name: "", code: "" });
  };

  const handleEditCategory = (item: CategoryItem) => {
    setEditingCat(item);
    setCatForm({ name: item.name, code: item.code || "" });
    setCatModalOpen(true);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm("ต้องการลบหมวดหมู่นี้ใช่หรือไม่?")) {
      MasterStore.deleteCategory(id);
    }
  };

  // Unit CRUD
  const handleSaveUnit = () => {
    if (!unitForm.name.trim()) return;
    if (editingUnit) {
      MasterStore.updateUnit(editingUnit.id, unitForm);
    } else {
      MasterStore.addUnit(unitForm);
    }
    setUnitModalOpen(false);
    setEditingUnit(null);
    setUnitForm({ name: "", shortName: "" });
  };

  const handleEditUnit = (item: UnitItem) => {
    setEditingUnit(item);
    setUnitForm({ name: item.name, shortName: item.shortName || "" });
    setUnitModalOpen(true);
  };

  const handleDeleteUnit = (id: string) => {
    if (confirm("ต้องการลบหน่วยนับนี้ใช่หรือไม่?")) {
      MasterStore.deleteUnit(id);
    }
  };

  // Follower / User ID CRUD & Register
  const handleOpenAddFollower = () => {
    setEditingFollower(null);
    setFollowerForm({
      userId: `U${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
      displayName: "",
      pictureUrl: "",
      statusMessage: "",
      role: "staff",
    });
    setFollowerModalOpen(true);
  };

  const handleEditFollower = (follower: LineUserFollower) => {
    setEditingFollower(follower);
    setFollowerForm({
      userId: follower.userId,
      displayName: follower.displayName,
      pictureUrl: follower.pictureUrl || "",
      statusMessage: follower.statusMessage || "",
      role: follower.role || "staff",
    });
    setFollowerModalOpen(true);
  };

  const handleSaveFollower = async () => {
    if (!followerForm.displayName.trim() || !followerForm.userId.trim()) return;

    const timeStr =
      new Date().toLocaleDateString("th-TH") + " " + new Date().toLocaleTimeString("th-TH");
    const userPayload: LineUserFollower = {
      userId: followerForm.userId.trim(),
      displayName: followerForm.displayName.trim(),
      pictureUrl: followerForm.pictureUrl.trim() || undefined,
      statusMessage: followerForm.statusMessage.trim() || undefined,
      followedAt: editingFollower?.followedAt || timeStr,
      lastInteractionAt: timeStr,
      role: followerForm.role,
    };

    MasterStore.saveFollower(userPayload);

    try {
      await registerLineFollowerFn({ data: userPayload });
    } catch (e) {
      console.warn("Could not save to server directly", e);
    }

    setFollowerModalOpen(false);
    reloadData();
  };

  // Flex Previews
  const handlePreviewPOFlex = () => {
    const bubble = createPurchaseOrderFlexBubble(
      [
        {
          name: "มาม่า บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้ง",
          quantity: 30,
          unitName: "ซอง",
          costPrice: 6.0,
        },
        {
          name: "โค้ก น้ำอัดลม ออริจินัล 325ml",
          quantity: 48,
          unitName: "กระป๋อง",
          costPrice: 12.0,
        },
        { name: "เลย์ มันฝรั่งทอดกรอบ รสคลาสสิค", quantity: 20, unitName: "ซอง", costPrice: 17.5 },
      ],
      { storeName: "ร้าน MiniMark", note: "ใบสั่งซื้อสินค้าประจำวัน (ตัวอย่าง)" },
    );
    setPreviewFlexTitle("ใบสั่งซื้อสินค้า (purchase-order-flex.ts)");
    setPreviewFlexJson(bubble);
    setPreviewFlexModalOpen(true);
  };

  const handlePreviewStockAlertFlex = () => {
    const bubble = createStockAlertFlexBubble(
      [
        {
          name: "น้ำดื่มคริสตัล 600ml",
          stock: 3,
          minStock: 10,
          unitName: "แพ็ค",
          status: "LOW_STOCK",
        },
        {
          name: "บรีส เอกเซล ผงซักฟอก 750g",
          stock: 0,
          minStock: 8,
          unitName: "ซอง",
          status: "OUT_OF_STOCK",
        },
      ],
      { storeName: "ร้าน MiniMark", title: "แจ้งเตือนสินค้าใกล้หมด / หมดสต็อก" },
    );
    setPreviewFlexTitle("แจ้งเตือนสินค้าสต็อกต่ำ (stock-alert-flex.ts)");
    setPreviewFlexJson(bubble);
    setPreviewFlexModalOpen(true);
  };

  const handlePreviewDailySummaryFlex = () => {
    const bubble = createDailySummaryFlexBubble(
      {
        totalProducts: 5,
        inStockCount: 3,
        lowStockCount: 2,
        outOfStockCount: 0,
        totalEstimatedCost: 1450.0,
        reorderCount: 2,
      },
      { storeName: "ร้าน MiniMark" },
    );
    setPreviewFlexTitle("สรุปยอดสต็อกประจำวัน (daily-summary-flex.ts)");
    setPreviewFlexJson(bubble);
    setPreviewFlexModalOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      <PageHeader
        title="ตั้งค่าระบบ & ฐานข้อมูล"
        description="จัดการข้อมูลหลัก โซนสินค้า หมวดหมู่ หน่วยนับ ผู้ใช้งาน/ผู้ติดตาม LINE Bot และแม่แบบ Flex Message"
      />

      {syncStatusMsg ? (
        <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200 rounded-2xl">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <AlertTitle className="font-semibold text-sm">การเชื่อมต่อฐานข้อมูล</AlertTitle>
          <AlertDescription className="text-xs">{syncStatusMsg}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* Responsive Mobile Tabs Grid */}
        <TabsList className="grid grid-cols-2 sm:grid-cols-6 h-auto p-1.5 rounded-2xl bg-muted gap-1">
          <TabsTrigger
            value="followers"
            className="h-10 text-xs sm:text-sm gap-1.5 rounded-xl font-medium"
          >
            <Users className="size-4 text-primary" /> ผู้ใช้งาน & Bot
          </TabsTrigger>
          <TabsTrigger
            value="flex"
            className="h-10 text-xs sm:text-sm gap-1.5 rounded-xl font-medium"
          >
            <FileCode2 className="size-4 text-emerald-600" /> Flex Message
          </TabsTrigger>
          <TabsTrigger value="zones" className="h-10 text-xs sm:text-sm gap-1.5 rounded-xl">
            <Layers className="size-4" /> โซนสินค้า
          </TabsTrigger>
          <TabsTrigger value="categories" className="h-10 text-xs sm:text-sm gap-1.5 rounded-xl">
            <FolderTree className="size-4" /> หมวดหมู่
          </TabsTrigger>
          <TabsTrigger value="units" className="h-10 text-xs sm:text-sm gap-1.5 rounded-xl">
            <Scale className="size-4" /> หน่วยนับ
          </TabsTrigger>
          <TabsTrigger value="line" className="h-10 text-xs sm:text-sm gap-1.5 rounded-xl">
            <MessageSquare className="size-4" /> LINE API
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FOLLOWERS & BOT USERS / USER IDs */}
        <TabsContent value="followers" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Users className="size-5 text-primary" /> ประวัติผู้ใช้งาน & ผู้เพิ่มเพื่อน LINE Bot
                (User ID)
              </h2>
              <p className="text-xs text-muted-foreground">
                ฐานข้อมูลผู้ใช้งาน, LINE User ID, สิทธิ์การใช้งาน และบันทึกประวัติการปฏิสัมพันธ์
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-xs gap-1.5 rounded-xl"
                onClick={syncWithCentralServer}
                disabled={isSyncing}
              >
                <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin text-primary" : ""}`} />
                {isSyncing ? "กำลังประสาน..." : "ซิงค์ฐานข้อมูล"}
              </Button>
              <Button
                className="h-10 font-semibold gap-1.5 rounded-xl active:scale-95 shadow-sm"
                onClick={handleOpenAddFollower}
              >
                <UserPlus className="size-4" /> เพิ่มผู้ใช้งาน / User ID
              </Button>
            </div>
          </div>

          {/* Followers Cards for Mobile */}
          <div className="block md:hidden space-y-2.5">
            {followers.length === 0 ? (
              <Card className="rounded-2xl p-6 text-center text-muted-foreground">
                <Users className="size-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">ยังไม่มีข้อมูลผู้ใช้งาน</p>
              </Card>
            ) : (
              followers.map((u) => (
                <div
                  key={u.userId}
                  className="rounded-2xl border bg-card p-3.5 shadow-sm space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-10 rounded-full border bg-muted/60 overflow-hidden shrink-0 flex items-center justify-center">
                        {u.pictureUrl ? (
                          <img
                            src={u.pictureUrl}
                            alt={u.displayName}
                            className="size-full object-cover"
                          />
                        ) : (
                          <Users className="size-5 text-muted-foreground/60" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-foreground truncate">
                          {u.displayName}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground truncate">
                          {u.userId}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={u.role === "admin" ? "default" : "secondary"}
                      className="text-[10px] capitalize"
                    >
                      {u.role}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
                    <span>เพิ่มเพื่อน: {u.followedAt}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-primary"
                      onClick={() => handleEditFollower(u)}
                    >
                      <Pencil className="size-3 mr-1" /> แก้ไข
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table for Followers */}
          <Card className="hidden md:block rounded-2xl">
            <CardContent className="pt-4">
              <div className="rounded-xl border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">โปรไฟล์</TableHead>
                      <TableHead className="w-48">ชื่อผู้ใช้งาน (Display Name)</TableHead>
                      <TableHead className="w-64">LINE User ID</TableHead>
                      <TableHead className="w-28">สิทธิ์การใช้งาน</TableHead>
                      <TableHead>วันเวลาที่เพิ่มเพื่อน</TableHead>
                      <TableHead>ปฏิสัมพันธ์ล่าสุด</TableHead>
                      <TableHead className="w-20 text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {followers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          ยังไม่มีประวัติผู้ใช้งาน
                        </TableCell>
                      </TableRow>
                    ) : (
                      followers.map((u) => (
                        <TableRow key={u.userId}>
                          <TableCell>
                            <div className="size-9 rounded-full border bg-muted/60 overflow-hidden flex items-center justify-center">
                              {u.pictureUrl ? (
                                <img
                                  src={u.pictureUrl}
                                  alt={u.displayName}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <Users className="size-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {u.displayName}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {u.userId}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={u.role === "admin" ? "default" : "secondary"}
                              className="capitalize"
                            >
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {u.followedAt || "-"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {u.lastInteractionAt || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => handleEditFollower(u)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: FLEX MESSAGE TEMPLATES */}
        <TabsContent value="flex" className="space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <FileCode2 className="size-5 text-emerald-600" /> แม่แบบ Flex Message (Decoupled
              Templates)
            </h2>
            <p className="text-xs text-muted-foreground">
              แยกไฟล์ Flex Message แต่ละประเภทออกจากกัน เพื่อความสะดวกในการเพิ่ม แก้ไข ดีไซน์
              และบำรุงรักษา
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Card 1: Purchase Order */}
            <Card className="rounded-2xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-600 text-white text-xs">ใบสั่งซื้อสินค้า</Badge>
                <span className="font-mono text-[11px] text-muted-foreground">
                  purchase-order-flex.ts
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">ใบสั่งซื้อสินค้าประจำวัน</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  รูปแบบ: รายการ ➔ จำนวน ➔ หน่วยนับ พร้อมยอดรวมและมูลค่าราคาทุนโดยประมาณ
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl text-xs gap-1.5"
                onClick={handlePreviewPOFlex}
              >
                <Eye className="size-3.5" /> ดูตัวอย่างโครงสร้าง Flex
              </Button>
            </Card>

            {/* Card 2: Stock Alert */}
            <Card className="rounded-2xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="destructive" className="text-xs">
                  แจ้งเตือนสต็อก
                </Badge>
                <span className="font-mono text-[11px] text-muted-foreground">
                  stock-alert-flex.ts
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">แจ้งเตือนสินค้าใกล้หมด / หมด</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  เน้นสถานะความเร่งด่วน พร้อมแสดงจำนวนที่ต้องเติมสต็อกหน้าร้าน
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl text-xs gap-1.5"
                onClick={handlePreviewStockAlertFlex}
              >
                <Eye className="size-3.5" /> ดูตัวอย่างโครงสร้าง Flex
              </Button>
            </Card>

            {/* Card 3: Daily Summary */}
            <Card className="rounded-2xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-600 text-white text-xs">สรุปสต็อกรายวัน</Badge>
                <span className="font-mono text-[11px] text-muted-foreground">
                  daily-summary-flex.ts
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">รายงานภาพรวมสต็อกประจำวัน</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  สรุปสินค้าพร้อมจำหน่าย, สินค้าใกล้หมด, สินค้าหมด และมูลค่าสต็อกคงเหลือ
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl text-xs gap-1.5"
                onClick={handlePreviewDailySummaryFlex}
              >
                <Eye className="size-3.5" /> ดูตัวอย่างโครงสร้าง Flex
              </Button>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: ZONES */}
        <TabsContent value="zones" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">โซนสินค้า</h2>
              <p className="text-xs text-muted-foreground">ตำแหน่งจัดเก็บสินค้าในร้าน</p>
            </div>
            <Button
              className="h-11 sm:h-10 font-semibold gap-1.5 rounded-xl active:scale-95 shadow-sm"
              onClick={() => {
                setEditingZone(null);
                setZoneForm({ name: "", code: "", description: "" });
                setZoneModalOpen(true);
              }}
            >
              <Plus className="size-4" /> เพิ่มโซนใหม่
            </Button>
          </div>

          {/* Mobile Zone Cards */}
          <div className="block md:hidden space-y-2">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="flex items-center justify-between rounded-2xl border bg-card p-3.5 shadow-sm"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {zone.code || "—"}
                    </Badge>
                    <span className="font-semibold text-sm text-foreground truncate">
                      {zone.name}
                    </span>
                  </div>
                  {zone.description ? (
                    <p className="text-xs text-muted-foreground truncate">{zone.description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-lg active:scale-90"
                    onClick={() => handleEditZone(zone)}
                  >
                    <Pencil className="size-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-lg active:scale-90"
                    onClick={() => handleDeleteZone(zone.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <Card className="hidden md:block rounded-2xl">
            <CardContent className="pt-4">
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">รหัสย่อ</TableHead>
                      <TableHead>ชื่อโซนสินค้า</TableHead>
                      <TableHead>รายละเอียด / ตำแหน่ง</TableHead>
                      <TableHead className="w-28 text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zones.map((zone) => (
                      <TableRow key={zone.id}>
                        <TableCell className="font-mono">
                          <Badge variant="secondary">{zone.code || "—"}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{zone.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {zone.description || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => handleEditZone(zone)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive"
                              onClick={() => handleDeleteZone(zone.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: CATEGORIES */}
        <TabsContent value="categories" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">หมวดหมู่สินค้า</h2>
              <p className="text-xs text-muted-foreground">
                จัดกลุ่มประเภทสินค้าเพื่อการค้นหาที่รวดเร็ว
              </p>
            </div>
            <Button
              className="h-11 sm:h-10 font-semibold gap-1.5 rounded-xl active:scale-95 shadow-sm"
              onClick={() => {
                setEditingCat(null);
                setCatForm({ name: "", code: "" });
                setCatModalOpen(true);
              }}
            >
              <Plus className="size-4" /> เพิ่มหมวดหมู่ใหม่
            </Button>
          </div>

          {/* Mobile Category Cards */}
          <div className="block md:hidden space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-2xl border bg-card p-3.5 shadow-sm"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {cat.code || "—"}
                    </Badge>
                    <span className="font-semibold text-sm text-foreground truncate">
                      {cat.name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-lg active:scale-90"
                    onClick={() => handleEditCategory(cat)}
                  >
                    <Pencil className="size-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-lg active:scale-90"
                    onClick={() => handleDeleteCategory(cat.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <Card className="hidden md:block rounded-2xl">
            <CardContent className="pt-4">
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">รหัสย่อ</TableHead>
                      <TableHead>ชื่อหมวดหมู่สินค้า</TableHead>
                      <TableHead className="w-28 text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-mono">
                          <Badge variant="secondary">{cat.code || "—"}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{cat.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => handleEditCategory(cat)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive"
                              onClick={() => handleDeleteCategory(cat.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: UNITS */}
        <TabsContent value="units" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">หน่วยนับสินค้า</h2>
              <p className="text-xs text-muted-foreground">หน่วยสำหรับบรรจุภัณฑ์และการนับสต็อก</p>
            </div>
            <Button
              className="h-11 sm:h-10 font-semibold gap-1.5 rounded-xl active:scale-95 shadow-sm"
              onClick={() => {
                setEditingUnit(null);
                setUnitForm({ name: "", shortName: "" });
                setUnitModalOpen(true);
              }}
            >
              <Plus className="size-4" /> เพิ่มหน่วยนับใหม่
            </Button>
          </div>

          {/* Mobile Unit Cards */}
          <div className="block md:hidden space-y-2">
            {units.map((unit) => (
              <div
                key={unit.id}
                className="flex items-center justify-between rounded-2xl border bg-card p-3.5 shadow-sm"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="font-semibold text-sm text-foreground">{unit.name}</div>
                  <div className="text-xs text-muted-foreground">
                    ตัวย่อ: {unit.shortName || unit.name}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-lg active:scale-90"
                    onClick={() => handleEditUnit(unit)}
                  >
                    <Pencil className="size-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-lg active:scale-90"
                    onClick={() => handleDeleteUnit(unit.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <Card className="hidden md:block rounded-2xl">
            <CardContent className="pt-4">
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อหน่วยนับ</TableHead>
                      <TableHead className="w-36">ตัวย่อ</TableHead>
                      <TableHead className="w-28 text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-medium text-foreground">{unit.name}</TableCell>
                        <TableCell className="text-muted-foreground font-mono">
                          {unit.shortName || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => handleEditUnit(unit)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive"
                              onClick={() => handleDeleteUnit(unit.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: LINE API */}
        <TabsContent value="line" className="space-y-4">
          <Card className="rounded-2xl border-emerald-500/30">
            <CardHeader className="bg-emerald-600 text-white rounded-t-2xl p-4">
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <MessageSquare className="size-5" /> สถานะการเชื่อมต่อ LINE
              </CardTitle>
              <CardDescription className="text-emerald-100 text-xs">
                LIFF, Mini App, และ Messaging API สำหรับส่งใบสั่งซื้อประจำวัน
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <Alert className="bg-muted/70 border-border/80 rounded-xl">
                <ShieldCheck className="size-4 text-emerald-600" />
                <AlertTitle className="text-xs font-semibold">
                  Zero Secret Leakage Architecture
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  ไม่มีการฝังคีย์ลับหรือโทเค็นใดๆ ในโค้ด client-side ข้อมูลถูก inject ผ่าน
                  server-side environment variables เท่านั้น
                </AlertDescription>
              </Alert>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-3.5 space-y-2 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">
                      Client-side (LINE LIFF)
                    </span>
                    {lineStatus?.hasLiffId ? (
                      <Badge className="bg-emerald-600 text-white text-[10px]">เชื่อมต่อแล้ว</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 text-[10px]">
                        Fallback Web Share
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>VITE_LINE_LIFF_ID:</span>
                      <span className="font-mono text-foreground">
                        {clientLiffId ? `${clientLiffId.substring(0, 8)}...` : "ยังไม่ได้ตั้งค่า"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-3.5 space-y-2 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">
                      Server-side (Messaging API)
                    </span>
                    {serverLineConfig?.hasAccessToken ? (
                      <Badge className="bg-emerald-600 text-white text-[10px]">พร้อมทำงาน</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-[10px]">
                        รอตั้งค่า
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Channel Access Token:</span>
                      <span className="font-mono text-foreground">
                        {serverLineConfig?.hasAccessToken
                          ? "บันทึกใน Server แล้ว"
                          : "ยังไม่ได้ระบุ"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FOLLOWER / USER MODAL */}
      <Dialog open={followerModalOpen} onOpenChange={setFollowerModalOpen}>
        <DialogContent className="w-[94vw] max-w-md rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingFollower ? "แก้ไขข้อมูลผู้ใช้งาน / User ID" : "เพิ่มผู้ใช้งาน / LINE User ID"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              ระบุ LINE User ID เพื่อใช้ส่งการแจ้งเตือนสต็อกและใบสั่งซื้อสินค้าโดยตรง
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ชื่อผู้ใช้งาน (Display Name) *</Label>
              <Input
                placeholder="เช่น ผู้จัดการร้าน, แคชเชียร์ A"
                className="h-10 rounded-xl"
                value={followerForm.displayName}
                onChange={(e) => setFollowerForm({ ...followerForm, displayName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">LINE User ID *</Label>
              <Input
                placeholder="เช่น U88f0192a83b27b9c1..."
                className="h-10 font-mono text-xs rounded-xl"
                value={followerForm.userId}
                onChange={(e) => setFollowerForm({ ...followerForm, userId: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">URL รูปโปรไฟล์ (ไม่บังคับ)</Label>
              <Input
                placeholder="https://..."
                className="h-10 text-xs rounded-xl"
                value={followerForm.pictureUrl}
                onChange={(e) => setFollowerForm({ ...followerForm, pictureUrl: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">สิทธิ์การใช้งาน (Role)</Label>
              <Select
                value={followerForm.role}
                onValueChange={(val) =>
                  setFollowerForm({ ...followerForm, role: val as "admin" | "staff" | "viewer" })
                }
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (ผู้ดูแลระบบ)</SelectItem>
                  <SelectItem value="staff">Staff (พนักงานประจำ)</SelectItem>
                  <SelectItem value="viewer">Viewer (ดูข้อมูลได้อย่างเดียว)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              variant="outline"
              className="h-11 rounded-xl w-full sm:w-auto"
              onClick={() => setFollowerModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              className="h-11 rounded-xl w-full sm:w-auto font-semibold"
              onClick={handleSaveFollower}
              disabled={!followerForm.displayName.trim() || !followerForm.userId.trim()}
            >
              บันทึกผู้ใช้งาน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FLEX PREVIEW MODAL */}
      <Dialog open={previewFlexModalOpen} onOpenChange={setPreviewFlexModalOpen}>
        <DialogContent className="w-[94vw] max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <FileCode2 className="size-5 text-emerald-600" /> {previewFlexTitle}
            </DialogTitle>
            <DialogDescription className="text-xs">
              โครงสร้าง Flex Message JSON ที่พร้อมส่งผ่าน LINE Messaging API
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-muted/80 p-3 overflow-x-auto border font-mono text-[11px]">
            <pre className="text-foreground">{JSON.stringify(previewFlexJson, null, 2)}</pre>
          </div>
          <DialogFooter className="pt-2">
            <Button className="w-full rounded-xl" onClick={() => setPreviewFlexModalOpen(false)}>
              ปิดหน้าต่าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ZONE MODAL */}
      <Dialog open={zoneModalOpen} onOpenChange={setZoneModalOpen}>
        <DialogContent className="w-[94vw] max-w-md rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingZone ? "แก้ไขข้อมูลโซนสินค้า" : "เพิ่มโซนสินค้าใหม่"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ชื่อโซนสินค้า *</Label>
              <Input
                placeholder="เช่น หน้าร้าน แถว A, ตู้แช่เย็น 1"
                className="h-10 rounded-xl"
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">รหัสย่อโซน (Code)</Label>
              <Input
                placeholder="เช่น Z-FRONT, COOL-01"
                className="h-10 font-mono rounded-xl"
                value={zoneForm.code}
                onChange={(e) => setZoneForm({ ...zoneForm, code: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">รายละเอียดตำแหน่ง</Label>
              <Input
                placeholder="เช่น ชั้นวางแถวกลางติดประตูทางเข้า"
                className="h-10 rounded-xl"
                value={zoneForm.description}
                onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              variant="outline"
              className="h-11 rounded-xl w-full sm:w-auto"
              onClick={() => setZoneModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              className="h-11 rounded-xl w-full sm:w-auto font-semibold"
              onClick={handleSaveZone}
              disabled={!zoneForm.name.trim()}
            >
              บันทึกโซน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CATEGORY MODAL */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="w-[94vw] max-w-md rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingCat ? "แก้ไขหมวดหมู่สินค้า" : "เพิ่มหมวดหมู่สินค้าใหม่"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ชื่อหมวดหมู่ *</Label>
              <Input
                placeholder="เช่น เครื่องดื่ม, ขนมขบเคี้ยว"
                className="h-10 rounded-xl"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">รหัสหมวดหมู่ (Code)</Label>
              <Input
                placeholder="เช่น BEV, SNACK"
                className="h-10 font-mono rounded-xl"
                value={catForm.code}
                onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              variant="outline"
              className="h-11 rounded-xl w-full sm:w-auto"
              onClick={() => setCatModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              className="h-11 rounded-xl w-full sm:w-auto font-semibold"
              onClick={handleSaveCategory}
              disabled={!catForm.name.trim()}
            >
              บันทึกหมวดหมู่
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UNIT MODAL */}
      <Dialog open={unitModalOpen} onOpenChange={setUnitModalOpen}>
        <DialogContent className="w-[94vw] max-w-md rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingUnit ? "แก้ไขหน่วยนับ" : "เพิ่มหน่วยนับใหม่"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ชื่อหน่วยนับ *</Label>
              <Input
                placeholder="เช่น ชิ้น, กล่อง, แพ็ค, ขวด"
                className="h-10 rounded-xl"
                value={unitForm.name}
                onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ชื่อย่อ (ถ้ามี)</Label>
              <Input
                placeholder="เช่น ชิ้น, กก., มล."
                className="h-10 rounded-xl"
                value={unitForm.shortName}
                onChange={(e) => setUnitForm({ ...unitForm, shortName: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              variant="outline"
              className="h-11 rounded-xl w-full sm:w-auto"
              onClick={() => setUnitModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              className="h-11 rounded-xl w-full sm:w-auto font-semibold"
              onClick={handleSaveUnit}
              disabled={!unitForm.name.trim()}
            >
              บันทึกหน่วยนับ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
