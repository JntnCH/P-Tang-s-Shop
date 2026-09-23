import { Info } from "lucide-react";

/**
 * แจ้งชัดเจนว่าหน้านี้ยังเป็นโครงสร้าง UI (Phase 1) และยังไม่มีข้อมูลจริง
 * ห้ามใช้ข้อมูลปลอมแทนข้อมูลจริง
 */
export function PhaseNotice({ phase, children }: { phase: string; children: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/50 p-4 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-5 shrink-0 text-info" />
      <p>
        <span className="font-semibold text-foreground">{phase}: </span>
        {children}
      </p>
    </div>
  );
}
