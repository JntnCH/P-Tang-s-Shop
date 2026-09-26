import JsBarcode from "jsbarcode";
import { Copy, Download, Printer, QrCode as QrIcon } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BarcodeFormatType } from "@/lib/barcode-engine";

interface BarcodeDisplayProps {
  value: string;
  format?: BarcodeFormatType | string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  title?: string;
  price?: number;
  className?: string;
  showActions?: boolean;
}

export function BarcodeDisplay({
  value,
  format = "EAN_13",
  width = 2,
  height = 70,
  displayValue = true,
  fontSize = 14,
  title,
  price,
  className = "",
  showActions = true,
}: BarcodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const isQr =
    format === "QR_CODE" ||
    format === "QR" ||
    value.startsWith("QR-") ||
    value.includes("http://") ||
    value.includes("https://");

  useEffect(() => {
    if (!value) return;
    setRenderError(null);

    if (isQr) {
      if (canvasRef.current) {
        QRCode.toCanvas(
          canvasRef.current,
          value,
          {
            width: Math.max(120, height * 2),
            margin: 1.5,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          },
          (error) => {
            if (error) {
              console.error("QR Code generation error:", error);
              setRenderError("ไม่สามารถสร้าง QR Code ได้");
            }
          },
        );
      }
    } else {
      if (svgRef.current) {
        try {
          // Map to JsBarcode compatible format
          let jsFormat = "CODE128";
          const cleanDigits = value.replace(/\D/g, "");

          if ((format === "EAN_13" || format === "EAN13") && cleanDigits.length === 13) {
            jsFormat = "EAN13";
          } else if ((format === "EAN_8" || format === "EAN8") && cleanDigits.length === 8) {
            jsFormat = "EAN8";
          } else if ((format === "UPC_A" || format === "UPC") && cleanDigits.length === 12) {
            jsFormat = "UPC";
          }

          JsBarcode(svgRef.current, value, {
            format: jsFormat,
            width: width || 2,
            height: height || 60,
            displayValue: displayValue,
            fontSize: fontSize || 13,
            margin: 8,
            font: "monospace",
            textAlign: "center",
            textPosition: "bottom",
            background: "#ffffff",
            lineColor: "#000000",
          });
        } catch (err: unknown) {
          console.warn("JsBarcode primary format failed, falling back to CODE128", err);
          try {
            JsBarcode(svgRef.current, value, {
              format: "CODE128",
              width: width || 2,
              height: height || 60,
              displayValue: displayValue,
              fontSize: fontSize || 13,
              margin: 8,
            });
          } catch (fallbackErr: unknown) {
            console.error("Fallback Code 128 failed:", fallbackErr);
            setRenderError("รูปแบบรหัสไม่ตรงกับมาตรฐานบาร์โค้ด");
          }
        }
      }
    }
  }, [value, format, width, height, displayValue, fontSize, isQr]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(value);
    toast.success(`คัดลอกรหัส ${value} เรียบร้อยแล้ว`);
  };

  const handleDownload = () => {
    if (isQr && canvasRef.current) {
      const url = canvasRef.current.toDataURL("image/png");
      const a = document.createElement("a");
      a.download = `qrcode-${value}.png`;
      a.href = url;
      a.click();
      toast.success("ดาวน์โหลดรูป QR Code เรียบร้อยแล้ว");
    } else if (svgRef.current) {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgRef.current);
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = `barcode-${value}.svg`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ดาวน์โหลดรูป Barcode SVG เรียบร้อยแล้ว");
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    let visualContent = "";
    if (isQr && canvasRef.current) {
      visualContent = `<img src="${canvasRef.current.toDataURL("image/png")}" style="width: 140px; height: 140px; margin: 0 auto; display: block;" />`;
    } else if (svgRef.current) {
      const serializer = new XMLSerializer();
      visualContent = serializer.serializeToString(svgRef.current);
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>พิมพ์บาร์โค้ด - ${value}</title>
          <style>
            body {
              font-family: sans-serif;
              text-align: center;
              padding: 20px;
              margin: 0;
            }
            .label-card {
              border: 1px dashed #ccc;
              padding: 12px;
              width: 240px;
              margin: 0 auto;
              border-radius: 8px;
            }
            .product-name {
              font-size: 13px;
              font-weight: bold;
              margin-bottom: 6px;
            }
            .product-price {
              font-size: 16px;
              font-weight: bold;
              color: #000;
              margin-top: 4px;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="label-card">
            ${title ? `<div class="product-name">${title}</div>` : ""}
            ${visualContent}
            ${price ? `<div class="product-price">฿${price.toFixed(2)}</div>` : ""}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-3 bg-white text-black rounded-xl border shadow-sm ${className}`}
    >
      {title && (
        <div className="text-xs font-bold text-gray-800 text-center mb-1 line-clamp-1 max-w-full">
          {title}
        </div>
      )}

      {renderError ? (
        <div className="text-xs text-destructive p-3 text-center">{renderError}</div>
      ) : isQr ? (
        <div className="flex flex-col items-center">
          <canvas ref={canvasRef} className="max-w-full h-auto" />
          {displayValue && (
            <span className="font-mono text-xs font-semibold text-gray-700 mt-1">{value}</span>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center overflow-x-auto max-w-full">
          <svg ref={svgRef} className="max-w-full h-auto" />
        </div>
      )}

      {price !== undefined && (
        <div className="text-sm font-bold text-gray-900 mt-1">
          ราคา ฿{price.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
        </div>
      )}

      {showActions && (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-gray-200 w-full justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 text-gray-700 hover:text-black hover:bg-gray-100"
            onClick={handleCopyCode}
          >
            <Copy className="size-3 mr-1" /> คัดลอก
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 text-gray-700 hover:text-black hover:bg-gray-100"
            onClick={handleDownload}
          >
            <Download className="size-3 mr-1" /> บันทึก
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 text-gray-700 hover:text-black hover:bg-gray-100"
            onClick={handlePrint}
          >
            <Printer className="size-3 mr-1" /> พิมพ์
          </Button>
        </div>
      )}
    </div>
  );
}
