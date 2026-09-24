import { Barcode as BarcodeIcon, QrCode } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MasterStore, type CategoryItem, type UnitItem, type ZoneItem } from "@/lib/store";

interface SelectProps {
  value?: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

export function CategorySelect({
  value,
  onChange,
  placeholder = "เลือกหมวดหมู่สินค้า",
  disabled,
  className,
}: SelectProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  const load = () => setCategories(MasterStore.getCategories());

  useEffect(() => {
    load();
    window.addEventListener("minimark_store_change", load);
    return () => window.removeEventListener("minimark_store_change", load);
  }, []);

  return (
    <Select value={value || ""} onValueChange={onChange} disabled={Boolean(disabled)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name} ({c.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ZoneSelect({
  value,
  onChange,
  placeholder = "เลือกโซนจัดเก็บ",
  disabled,
  className,
}: SelectProps) {
  const [zones, setZones] = useState<ZoneItem[]>([]);

  const load = () => setZones(MasterStore.getZones());

  useEffect(() => {
    load();
    window.addEventListener("minimark_store_change", load);
    return () => window.removeEventListener("minimark_store_change", load);
  }, []);

  return (
    <Select value={value || ""} onValueChange={onChange} disabled={Boolean(disabled)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {zones.map((z) => (
          <SelectItem key={z.id} value={z.id}>
            {z.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function UnitSelect({
  value,
  onChange,
  placeholder = "เลือกหน่วยนับ",
  disabled,
  className,
}: SelectProps) {
  const [units, setUnits] = useState<UnitItem[]>([]);

  const load = () => setUnits(MasterStore.getUnits());

  useEffect(() => {
    load();
    window.addEventListener("minimark_store_change", load);
    return () => window.removeEventListener("minimark_store_change", load);
  }, []);

  return (
    <Select value={value || ""} onValueChange={onChange} disabled={Boolean(disabled)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {units.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FormatBadge({
  type,
  format,
  className,
}: {
  type?: "QR" | "Barcode" | undefined;
  format?: string | undefined;
  className?: string | undefined;
}) {
  const isQr = type === "QR" || format?.toUpperCase().includes("QR");

  if (isQr) {
    return (
      <Badge
        variant="outline"
        className={`bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-medium text-xs ${className ?? ""}`}
      >
        <QrCode className="size-3" />
        QR Code
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 gap-1 font-medium text-xs ${className ?? ""}`}
    >
      <BarcodeIcon className="size-3" />
      Barcode {format ? `(${format})` : ""}
    </Badge>
  );
}
