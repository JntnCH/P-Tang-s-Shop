export type ProductStatus = "normal" | "low" | "out";

export type ProductRow = {
  id: number;
  barcode: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: string;
  sellPrice: string;
  minimumStock: number;
  isActive: boolean;
  quantity: number;
  status: ProductStatus;
};

export const statusLabels: Record<ProductStatus, string> = {
  normal: "ปกติ",
  low: "ใกล้หมด",
  out: "หมด",
};

export const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(Number(value));
