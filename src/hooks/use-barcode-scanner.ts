import { useCallback, useEffect, useRef, useState } from "react";

type DetectedBarcode = { rawValue: string; format: string };

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"];

function getDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return ctor ?? null;
}

export type ScannerStatus = "idle" | "starting" | "scanning" | "error";

/**
 * อ่านบาร์โค้ดจากกล้องหลังของมือถือด้วย BarcodeDetector API ของเบราว์เซอร์
 * (ไม่มี dependency เพิ่ม) — ถ้าเบราว์เซอร์ไม่รองรับ จะแจ้งให้กรอกด้วยมือแทน
 */
export function useBarcodeScanner(onDetected: (code: string) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<{ code: string; at: number } | null>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(Boolean(getDetectorCtor()) && Boolean(navigator?.mediaDevices?.getUserMedia));
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    const Ctor = getDetectorCtor();
    if (!Ctor || !navigator?.mediaDevices?.getUserMedia) {
      setSupported(false);
      setError("เบราว์เซอร์นี้ยังไม่รองรับการสแกนด้วยกล้อง กรุณากรอกบาร์โค้ดด้วยมือ");
      setStatus("error");
      return;
    }

    setError(null);
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      await video.play();
      setStatus("scanning");

      const detector = new Ctor({ formats: FORMATS });
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          const code = results[0]?.rawValue?.trim();
          if (code) {
            const now = Date.now();
            const last = lastRef.current;
            if (!last || last.code !== code || now - last.at > 2000) {
              lastRef.current = { code, at: now };
              onDetectedRef.current(code);
            }
          }
        } catch {
          /* เฟรมที่อ่านไม่ได้ ข้ามไป */
        }
        rafRef.current = requestAnimationFrame(() => void tick());
      };
      rafRef.current = requestAnimationFrame(() => void tick());
    } catch {
      setError("เปิดกล้องไม่สำเร็จ กรุณาอนุญาตการใช้งานกล้อง หรือกรอกบาร์โค้ดด้วยมือ");
      setStatus("error");
      stop();
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { videoRef, status, error, supported, start, stop };
}
