import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Layers,
  ListRestart,
  Play,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
import {
  PrinterService,
  type PrintJobRecord,
  type PrintJobStatus,
  type PrintJobType,
} from "@/lib/printer-service";

export function PrintQueueManager() {
  const [jobs, setJobs] = useState<PrintJobRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Job Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<PrintJobRecord | null>(null);

  const loadJobs = () => {
    setJobs(PrinterService.getPrintJobs());
  };

  useEffect(() => {
    loadJobs();
    const onChange = () => loadJobs();
    window.addEventListener("minimark_print_jobs_change", onChange);
    return () => window.removeEventListener("minimark_print_jobs_change", onChange);
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = j.jobTitle.toLowerCase().includes(q);
        const matchOperator = j.operator.toLowerCase().includes(q);
        const matchPrinter = j.printerName.toLowerCase().includes(q);
        const matchSummary = j.payloadSummary.toLowerCase().includes(q);
        if (!matchTitle && !matchOperator && !matchPrinter && !matchSummary) return false;
      }

      if (typeFilter !== "ALL" && j.jobType !== typeFilter) return false;
      if (statusFilter !== "ALL" && j.status !== statusFilter) return false;

      return true;
    });
  }, [jobs, searchQuery, typeFilter, statusFilter]);

  const kpis = useMemo(() => {
    const total = jobs.length;
    const completed = jobs.filter((j) => j.status === "COMPLETED").length;
    const queued = jobs.filter((j) => j.status === "QUEUED" || j.status === "PRINTING").length;
    const failed = jobs.filter((j) => j.status === "FAILED" || j.status === "CANCELLED").length;
    return { total, completed, queued, failed };
  }, [jobs]);

  const handleReprint = (id: string, title: string) => {
    const success = PrinterService.reprintJob(id);
    if (success) {
      toast.success(`สั่งพิมพ์ซ้ำ "${title}" เรียบร้อย`);
      loadJobs();
    } else {
      toast.error("ไม่สามารถพิมพ์ซ้ำได้");
    }
  };

  const handleCancelJob = (id: string) => {
    PrinterService.updateJobStatus(id, "CANCELLED");
    toast.success("ยกเลิกงานพิมพ์เรียบร้อยแล้ว");
    loadJobs();
  };

  const handleDeleteJob = (id: string) => {
    PrinterService.deleteJob(id);
    toast.success("ลบประวัติงานพิมพ์เรียบร้อย");
    loadJobs();
  };

  const handleClearCompleted = () => {
    if (confirm("ต้องการล้างประวัติงานพิมพ์ที่เสร็จสิ้นแล้วทั้งหมดใช่หรือไม่?")) {
      PrinterService.clearCompletedJobs();
      toast.success("ล้างประวัติงานพิมพ์สำเร็จเรียบร้อย");
      loadJobs();
    }
  };

  const handleSimulateQueue = () => {
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const newJob = PrinterService.addPrintJob({
      jobTitle: `ใบเสร็จรับเงิน REC-20260925-${randomSeq}`,
      jobType: "RECEIPT",
      printerId: "ptr-thermal-58",
      printerName: "Xprinter XP-58IIH (เคาน์เตอร์ 1)",
      paperSize: "58mm",
      copies: 1,
      status: "QUEUED",
      operator: "แคชเชียร์หน้าร้าน",
      payloadSummary: "3 รายการ • ยอดสุทธิ ฿85.00 • เงินสด",
    });

    toast.info(`เพิ่มงานพิมพ์ "${newJob.jobTitle}" เข้าสู่คิวเรียบร้อย`);
    loadJobs();

    // Simulate printing and completion after 2.5s
    setTimeout(() => {
      PrinterService.updateJobStatus(newJob.id, "COMPLETED");
      toast.success(`งานพิมพ์ "${newJob.jobTitle}" พิมพ์สำเร็จแล้ว`);
      loadJobs();
    }, 2500);
  };

  const getStatusBadge = (status: PrintJobStatus) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-semibold">
            <CheckCircle2 className="size-3" /> สำเร็จ
          </Badge>
        );
      case "QUEUED":
        return (
          <Badge className="bg-amber-500 text-white text-[10px] gap-1 font-semibold animate-pulse">
            <Clock className="size-3" /> ในคิวรอพิมพ์
          </Badge>
        );
      case "PRINTING":
        return (
          <Badge className="bg-blue-600 text-white text-[10px] gap-1 font-semibold animate-pulse">
            <Printer className="size-3" /> กำลังพิมพ์
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="text-[10px] gap-1 font-semibold">
            <AlertCircle className="size-3" /> ผิดพลาด
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="secondary"
            className="text-[10px] gap-1 font-semibold text-muted-foreground"
          >
            <XCircle className="size-3" /> ยกเลิกแล้ว
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: PrintJobType) => {
    switch (type) {
      case "RECEIPT":
        return (
          <Badge variant="outline" className="text-[10px]">
            สลิปใบเสร็จ
          </Badge>
        );
      case "SHELF_TAG":
        return (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 text-[10px]">
            ป้ายราคาชั้นวาง
          </Badge>
        );
      case "BARCODE_LABEL":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-[10px]">
            สติกเกอร์บาร์โค้ด
          </Badge>
        );
      case "PURCHASE_ORDER":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px]">
            ใบสั่งซื้อ (PO)
          </Badge>
        );
      case "TEST_PRINT":
        return (
          <Badge variant="secondary" className="text-[10px]">
            ทดสอบพิมพ์
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {type}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="rounded-2xl border bg-card p-3 sm:p-4 text-center shadow-sm">
          <div className="text-[11px] sm:text-xs text-muted-foreground font-medium">
            งานพิมพ์ทั้งหมด
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-foreground mt-0.5">
            {kpis.total} งาน
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-3 sm:p-4 text-center shadow-sm">
          <div className="text-[11px] sm:text-xs text-emerald-600 font-semibold flex items-center justify-center gap-1">
            <CheckCircle2 className="size-3.5" /> พิมพ์สำเร็จ
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 mt-0.5">
            {kpis.completed} งาน
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-3 sm:p-4 text-center shadow-sm">
          <div className="text-[11px] sm:text-xs text-amber-600 font-semibold flex items-center justify-center gap-1">
            <Clock className="size-3.5" /> อยู่ในคิวรอพิมพ์
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 mt-0.5">
            {kpis.queued} งาน
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-3 sm:p-4 text-center shadow-sm">
          <div className="text-[11px] sm:text-xs text-muted-foreground font-semibold flex items-center justify-center gap-1">
            <XCircle className="size-3.5" /> ยกเลิก / ผิดพลาด
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-muted-foreground mt-0.5">
            {kpis.failed} งาน
          </div>
        </div>
      </div>

      {/* Main Queue & History Card */}
      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="p-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Printer className="size-5 text-primary" /> คิวงานพิมพ์ & ประวัติการพิมพ์ (Print
              Spooler Audit)
            </CardTitle>
            <CardDescription className="text-xs">
              ตรวจสอบสถานะงานพิมพ์, พิมพ์ซ้ำทันที (Reprint in 1-Click), และจัดการคิวงานพิมพ์ทั้งหมด
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs rounded-xl gap-1.5"
              onClick={handleSimulateQueue}
              title="จำลองส่งงานพิมพ์เข้าคิวเพื่อทดสอบระบบ Spooler"
            >
              <Play className="size-3.5 text-primary" /> ทดสอบเข้าคิว
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 text-xs rounded-xl text-muted-foreground hover:text-destructive gap-1"
              onClick={handleClearCompleted}
            >
              <Trash2 className="size-3.5" /> ล้างงานที่เสร็จแล้ว
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-1">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหางานพิมพ์, ผู้สั่ง, อุปกรณ์..."
                className="h-9 pl-8 text-xs rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="ประเภทงานพิมพ์" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกประเภทเอกสาร</SelectItem>
                <SelectItem value="RECEIPT">สลิปใบเสร็จ (Receipt)</SelectItem>
                <SelectItem value="SHELF_TAG">ป้ายราคาชั้นวาง (Shelf Tag)</SelectItem>
                <SelectItem value="BARCODE_LABEL">สติกเกอร์บาร์โค้ด (Label)</SelectItem>
                <SelectItem value="PURCHASE_ORDER">ใบสั่งซื้อสินค้า (PO)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="สถานะงานพิมพ์" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกสถานะ</SelectItem>
                <SelectItem value="COMPLETED">สำเร็จ (Completed)</SelectItem>
                <SelectItem value="QUEUED">ในคิวรอพิมพ์ (Queued)</SelectItem>
                <SelectItem value="CANCELLED">ยกเลิกแล้ว (Cancelled)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Table View */}
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">ชื่องานพิมพ์</TableHead>
                  <TableHead className="w-28">ประเภท</TableHead>
                  <TableHead className="w-36">เครื่องพิมพ์ / ขนาด</TableHead>
                  <TableHead className="w-32">ผู้สั่งพิมพ์</TableHead>
                  <TableHead className="w-36">เวลาพิมพ์</TableHead>
                  <TableHead className="text-center w-28">สถานะ</TableHead>
                  <TableHead className="text-right w-44">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-muted-foreground text-xs"
                    >
                      ไม่มีรายการงานพิมพ์ตามเงื่อนไขที่เลือก
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="font-semibold text-xs text-foreground line-clamp-1">
                          {job.jobTitle}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {job.payloadSummary}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(job.jobType)}</TableCell>
                      <TableCell>
                        <div className="text-xs text-foreground truncate max-w-[140px]">
                          {job.printerName}
                        </div>
                        <Badge variant="outline" className="font-mono text-[9px] mt-0.5">
                          {job.paperSize} ({job.copies} ฉบับ)
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {job.operator}
                      </TableCell>
                      <TableCell className="text-[11px] font-mono text-muted-foreground">
                        {job.createdAt}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(job.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs rounded-lg gap-1 font-semibold"
                            onClick={() => handleReprint(job.id, job.jobTitle)}
                            title="พิมพ์ซ้ำงานนี้"
                          >
                            <RotateCcw className="size-3 text-primary" /> พิมพ์ซ้ำ
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setSelectedJob(job);
                              setDetailModalOpen(true);
                            }}
                            title="ดูรายละเอียด"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          {job.status === "QUEUED" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-destructive"
                              onClick={() => handleCancelJob(job.id)}
                              title="ยกเลิกงานพิมพ์"
                            >
                              <XCircle className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteJob(job.id)}
                            title="ลบประวัติ"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* JOB DETAIL MODAL */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="w-[94vw] max-w-md rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <FileCheck2 className="size-5 text-primary" />
              รายละเอียดงานพิมพ์
            </DialogTitle>
            <DialogDescription className="text-xs">
              ID: {selectedJob?.id} • {selectedJob?.jobTitle}
            </DialogDescription>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-muted/50 p-3 rounded-xl space-y-2 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ประเภทเอกสาร:</span>
                  <span>{getTypeBadge(selectedJob.jobType)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">สถานะ:</span>
                  <span>{getStatusBadge(selectedJob.status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">เครื่องพิมพ์:</span>
                  <span className="font-semibold text-foreground">{selectedJob.printerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ขนาดกระดาษ / จำนวน:</span>
                  <span className="font-mono">
                    {selectedJob.paperSize} ({selectedJob.copies} สำเนา)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ผู้สั่งพิมพ์:</span>
                  <span>{selectedJob.operator}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">เวลาสร้างงาน:</span>
                  <span className="font-mono">{selectedJob.createdAt}</span>
                </div>
                {selectedJob.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">เวลาพิมพ์เสร็จ:</span>
                    <span className="font-mono text-emerald-600">{selectedJob.completedAt}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-foreground">สรุปเนื้อหาที่พิมพ์:</span>
                <p className="p-2.5 rounded-xl border bg-background font-mono text-[11px] text-muted-foreground">
                  {selectedJob.payloadSummary}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              className="h-10 text-xs font-semibold rounded-xl gap-1.5 bg-primary text-primary-foreground"
              onClick={() => {
                if (selectedJob) {
                  handleReprint(selectedJob.id, selectedJob.jobTitle);
                  setDetailModalOpen(false);
                }
              }}
            >
              <RotateCcw className="size-3.5" /> สั่งพิมพ์ซ้ำเดี๋ยวนี้ (Reprint)
            </Button>
            <Button
              variant="outline"
              className="h-10 text-xs rounded-xl"
              onClick={() => setDetailModalOpen(false)}
            >
              ปิดหน้าต่าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
