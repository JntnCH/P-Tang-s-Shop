import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FolderTree,
  Info,
  Layers,
  MessageSquare,
  Pencil,
  Plus,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLineServerConfigFn } from "@/lib/line-server-fn";
import {
  getClientLiffId,
  getLineStatus,
  type LineConfigStatus,
} from "@/lib/line-service";
import {
  MasterStore,
  type CategoryItem,
  type UnitItem,
  type ZoneItem,
} from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "ตั้งค่าระบบ | MiniMark" },
      {
        name: "description",
        content:
          "จัดการโซนสินค้า หมวดหมู่ หน่วยนับ และการเชื่อมต่อ LINE LIFF / Messaging API",
      },
      { property: "og:title", content: "ตั้งค่าระบบ | MiniMark" },
      {
        property: "og:description",
        content: "จัดการข้อมูลหลักและการเชื่อมต่อ LINE",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [activeTab, setActiveTab] = useState("zones");

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
  };

  useEffect(() => {
    reloadData();
    getLineStatus().then(setLineStatus);
    getLineServerConfigFn()
      .then(setServerLineConfig)
      .catch(() => setServerLineConfig(null));

    const onStoreChange = () => reloadData();
    window.addEventListener("minimark_store_change", onStoreChange);
    return () => window.removeEventListener("minimark_store_change", onStoreChange);
  }, []);

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
    setUnitForm({ name: item.name, shortName: item.shortName });
    setUnitModalOpen(true);
  };

  const handleDeleteUnit = (id: string) => {
    if (confirm("ต้องการลบหน่วยนับนี้ใช่หรือไม่?")) {
      MasterStore.deleteUnit(id);
    }
  };

  const clientLiffId = getClientLiffId();

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="ตั้งค่าข้อมูลหลักและระบบ"
        description="จัดการโซนสินค้า หมวดหมู่ หน่วยนับ และตรวจสอบการเชื่อมต่อ LINE"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* Responsive Mobile Tabs (2x2 on mobile, 4 on desktop) */}
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto p-1.5 rounded-2xl bg-muted gap-1">
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

        {/* TAB: ZONES */}
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

        {/* TAB: CATEGORIES */}
        <TabsContent value="categories" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">หมวดหมู่สินค้า</h2>
              <p className="text-xs text-muted-foreground">จำแนกประเภทสินค้าสำหรับกรองในสต็อก</p>
            </div>
            <Button
              className="h-11 sm:h-10 font-semibold gap-1.5 rounded-xl active:scale-95 shadow-sm"
              onClick={() => {
                setEditingCat(null);
                setCatForm({ name: "", code: "" });
                setCatModalOpen(true);
              }}
            >
              <Plus className="size-4" /> เพิ่มหมวดหมู่
            </Button>
          </div>

          {/* Mobile Category Cards */}
          <div className="block md:hidden space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-2xl border bg-card p-3.5 shadow-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Badge variant="outline" className="font-mono text-xs">
                    {cat.code}
                  </Badge>
                  <span className="font-semibold text-sm text-foreground truncate">
                    {cat.name}
                  </span>
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
                      <TableHead className="w-28">รหัสหมวด</TableHead>
                      <TableHead>ชื่อหมวดหมู่</TableHead>
                      <TableHead className="w-28 text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-mono">
                          <Badge variant="outline">{cat.code}</Badge>
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

        {/* TAB: UNITS */}
        <TabsContent value="units" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">หน่วยนับสินค้า</h2>
              <p className="text-xs text-muted-foreground">เช่น ชิ้น กล่อง แพ็ค ขวด ลัง</p>
            </div>
            <Button
              className="h-11 sm:h-10 font-semibold gap-1.5 rounded-xl active:scale-95 shadow-sm"
              onClick={() => {
                setEditingUnit(null);
                setUnitForm({ name: "", shortName: "" });
                setUnitModalOpen(true);
              }}
            >
              <Plus className="size-4" /> เพิ่มหน่วยนับ
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

        {/* TAB: LINE API */}
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
              {/* Security Banner */}
              <Alert className="bg-muted/70 border-border/80 rounded-xl">
                <ShieldCheck className="size-4 text-emerald-600" />
                <AlertTitle className="text-xs font-semibold">
                  Zero Secret Leakage Architecture
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  ไม่มีการฝังคีย์ลับหรือโทเค็นใดๆ ในโค้ด client-side ข้อมูลถูก inject ผ่าน server-side
                  environment variables เท่านั้น
                </AlertDescription>
              </Alert>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Client LIFF Box */}
                <div className="rounded-xl border p-3.5 space-y-2 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">
                      Client-side (LINE LIFF)
                    </span>
                    {lineStatus?.hasLiffId ? (
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        เชื่อมต่อแล้ว
                      </Badge>
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

                {/* Server Messaging API Box */}
                <div className="rounded-xl border p-3.5 space-y-2 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">
                      Server-side (Messaging API)
                    </span>
                    {serverLineConfig?.hasAccessToken ? (
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        พร้อมทำงาน
                      </Badge>
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
                        {serverLineConfig?.hasAccessToken ? "บันทึกใน Server แล้ว" : "ยังไม่ได้ระบุ"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
