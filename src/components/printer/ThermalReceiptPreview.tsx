import {
  Barcode as BarcodeIcon,
  Code2,
  Copy,
  Download,
  Printer,
  QrCode,
  Sparkles,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { BarcodeDisplay } from "@/components/barcode/BarcodeDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PrinterService,
  type ReceiptDesignConfig,
  type ReceiptPrintData,
} from "@/lib/printer-service";

interface ThermalReceiptPreviewProps {
  config: ReceiptDesignConfig;
  data: ReceiptPrintData;
  className?: string;
  onPrint?: () => void;
}

export function ThermalReceiptPreview({
  config,
  data,
  className = "",
  onPrint,
}: ThermalReceiptPreviewProps) {
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const is58mm = config.paperWidth === "58mm";

  useEffect(() => {
    if (config.showPromptPayQR && config.promptPayId) {
      QRCode.toDataURL(
        `PROMPTPAY:${config.promptPayId}:${data.grandTotal}`,
        { width: 100, margin: 1 },
        (err, url) => {
          if (!err && url) setQrDataUrl(url);
        },
      );
    }
  }, [config.showPromptPayQR, config.promptPayId, data.grandTotal]);

  const handleBrowserPrint = () => {
    if (!receiptRef.current) return;
    const html = receiptRef.current.innerHTML;
    PrinterService.printReceiptDirect(html, config.paperWidth);

    PrinterService.addPrintJob({
      jobTitle: `ใบเสร็จรับเงิน ${data.receiptNumber}`,
      jobType: "RECEIPT",
      printerId: "ptr-thermal-58",
      printerName: `เครื่องพิมพ์ความร้อน (${config.paperWidth})`,
      paperSize: config.paperWidth,
      copies: 1,
      status: "COMPLETED",
      operator: data.cashierName || "แคชเชียร์หน้าร้าน",
      payloadSummary: `${data.items.length} รายการ • ยอดสุทธิ ฿${data.grandTotal.toFixed(2)} • ${data.paymentMethod}`,
      rawHtml: html,
    });

    if (onPrint) onPrint();
  };

  const handleCopyESCPOS = () => {
    const raw = PrinterService.generateESCPOS(data, config);
    navigator.clipboard.writeText(raw);
    toast.success("คัดลอกคำสั่ง ESC/POS เรียบร้อยแล้ว");
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Paper Container with Real Thermal Appearance */}
      <div
        ref={receiptRef}
        className={`bg-white text-black p-4 shadow-xl border border-gray-300 font-mono text-xs select-none transition-all duration-200 relative ${
          is58mm ? "w-[280px]" : "w-[360px]"
        }`}
        style={{
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Top Paper Tear Border Graphic */}
        <div className="absolute -top-1 left-0 right-0 h-1 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-200 to-transparent" />

        {/* 1. Header & Store Info */}
        <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-gray-400">
          {config.showLogo && (
            <div className="text-sm font-bold tracking-wider uppercase mb-1">
              🏪 {config.storeName}
            </div>
          )}
          <div className="text-[11px] font-semibold text-gray-800">{config.branchName}</div>
          <div className="text-[10px] text-gray-600">เลขประจำตัวผู้เสียภาษี: {config.taxId}</div>
          <div className="text-[10px] text-gray-600">{config.address}</div>
          <div className="text-[10px] text-gray-600">โทร: {config.phone}</div>
          {config.headerMessage && (
            <div className="text-[10px] text-gray-700 italic pt-1">
              *** {config.headerMessage} ***
            </div>
          )}
        </div>

        {/* 2. Receipt Metadata */}
        <div className="py-2 text-[11px] space-y-0.5 border-b border-dashed border-gray-400">
          <div className="flex justify-between">
            <span>เลขที่ใบเสร็จ:</span>
            <span className="font-bold">{data.receiptNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>วันที่-เวลา:</span>
            <span>{data.date}</span>
          </div>
          {config.showCashierName && (
            <div className="flex justify-between">
              <span>พนักงาน:</span>
              <span>{data.cashierName}</span>
            </div>
          )}
        </div>

        {/* 3. Items Table */}
        <div className="py-2 border-b border-dashed border-gray-400">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-gray-300 text-gray-700">
                <th className="text-left pb-1">รายการ</th>
                <th className="text-center pb-1 w-8">จน.</th>
                <th className="text-right pb-1 w-14">ยอด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-gray-200">
              {data.items.map((item, idx) => (
                <tr key={idx} className="align-top">
                  <td className="py-1 pr-1">
                    <div className="truncate font-sans font-medium text-[11px]">{item.name}</div>
                    <div className="text-[9px] text-gray-500 font-mono">
                      @{item.unitPrice.toFixed(2)}
                    </div>
                  </td>
                  <td className="py-1 text-center font-mono">{item.quantity}</td>
                  <td className="py-1 text-right font-mono font-semibold">
                    {item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. Totals Breakdown */}
        <div className="py-2 text-[11px] space-y-1 border-b border-dashed border-gray-400">
          <div className="flex justify-between text-gray-600">
            <span>ยอดรวมสินค้า:</span>
            <span>฿{data.subtotal.toFixed(2)}</span>
          </div>
          {data.discount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>ส่วนลด:</span>
              <span>-฿{data.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>VAT (7% รวมในยอด):</span>
            <span>฿{data.vatAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold pt-1 border-t border-dotted border-gray-300 text-black">
            <span>ยอดสุทธิ (Total):</span>
            <span className="text-sm">฿{data.grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-700 pt-0.5">
            <span>ชำระด้วย ({data.paymentMethod}):</span>
            <span>฿{data.paidAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>เงินทอน:</span>
            <span>฿{data.changeAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* 5. PromptPay QR Code or Barcode */}
        <div className="py-2 text-center flex flex-col items-center justify-center space-y-1">
          {config.showPromptPayQR && qrDataUrl && (
            <div className="flex flex-col items-center my-1">
              <img src={qrDataUrl} alt="PromptPay QR" className="size-20" />
              <span className="text-[9px] text-gray-600">สแกนชำระผ่าน PromptPay</span>
            </div>
          )}

          {config.showBarcode && (
            <div className="w-full flex flex-col items-center">
              <BarcodeDisplay
                value={data.receiptNumber}
                format="CODE_128"
                width={1.2}
                height={35}
                fontSize={10}
                showActions={false}
                className="p-1 border-0 shadow-none"
              />
            </div>
          )}
        </div>

        {/* 6. Footer Message */}
        <div className="text-center text-[10px] text-gray-600 pt-1 space-y-0.5">
          <p>{config.footerMessage}</p>
          {config.lineAccountId && <p className="font-semibold">LINE: {config.lineAccountId}</p>}
        </div>

        {/* Bottom Paper Tear Effect */}
        <div className="absolute -bottom-2 left-0 right-0 h-2 bg-[radial-gradient(circle_at_bottom,_transparent_2px,_#fff_2px)] bg-[length:6px_4px]" />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
        <Button
          onClick={handleBrowserPrint}
          className="h-10 text-xs font-semibold rounded-xl gap-1.5 shadow-sm bg-primary text-primary-foreground"
        >
          <Printer className="size-4" /> พิมพ์สลิปความร้อน ({config.paperWidth})
        </Button>
        <Button
          variant="outline"
          onClick={handleCopyESCPOS}
          className="h-10 text-xs rounded-xl gap-1.5"
          title="คัดลอกรหัสคำสั่ง ESC/POS ไบนารีสำหรับต่อเครื่องพิมพ์โดยตรง"
        >
          <Code2 className="size-4" /> ดูคำสั่ง ESC/POS
        </Button>
      </div>
    </div>
  );
}
