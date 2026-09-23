import { BrowserMultiFormatReader } from "@zxing/browser";
import { useCallback, useEffect, useRef, useState } from "react";

type ScannerStatus = "idle" | "starting" | "scanning" | "error";

const SCANNER_ERROR = "เปิดกล้องไม่สำเร็จ กรุณาอนุญาตการใช้งานกล้อง ตรวจว่าใช้ HTTPS และลองกรอก barcode ด้วยมือ";

export function shouldAcceptScan(last: { code: string; at: number } | null, code: string, now: number) {
  return Boolean(code.trim()) && (!last || last.code !== code || now - last.at > 2000);
}

export function useBarcodeScanner(onDetected: (code: string) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastRef = useRef<{ code: string; at: number } | null>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(Boolean(navigator?.mediaDevices?.getUserMedia));
  }, []);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setSupported(false);
      setError("เบราว์เซอร์นี้ไม่รองรับกล้อง กรุณาใช้ Safari/Chrome รุ่นล่าสุด หรือกรอก barcode ด้วยมือ");
      setStatus("error");
      return;
    }

    stop();
    setError(null);
    setStatus("starting");

    try {
      const video = videoRef.current;
      if (!video) throw new Error("ไม่พบพื้นที่แสดงกล้อง");
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        video,
        (result) => {
          const code = result?.getText()?.trim();
          if (!code) return;
          const now = Date.now();
          const last = lastRef.current;
          if (shouldAcceptScan(last, code, now)) {
            lastRef.current = { code, at: now };
            onDetectedRef.current(code);
          }
        },
      );
      controlsRef.current = controls;
      setStatus("scanning");
    } catch (scanError) {
      console.warn("[Scanner] Failed to start camera decoder", scanError);
      setError(SCANNER_ERROR);
      setStatus("error");
      stop();
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { videoRef, status, error, supported, start, stop };
}
