import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { useCallback, useEffect, useRef, useState } from "react";

import { playScanSuccessSound } from "@/lib/scanner-audio";
import { classifyScanType, ScannerDeduplicator, type CodeType } from "@/lib/scanner-dedup";

export type ScannerStatus = "idle" | "starting" | "scanning" | "error";

export interface ScannerDiagnostics {
  readerEngine: string;
  hasCameraSupport: boolean;
  activeDeviceId?: string;
  lastScannedCode?: string;
  lastScannedFormat?: string;
  lastScannedType?: CodeType;
  lastScannedAt?: string;
  errorDetail?: string;
}

export type ScanCallback = (code: string, format?: string, type?: CodeType) => void;

export interface UseBarcodeScannerOptions {
  cooldownMs?: number;
  playSound?: boolean;
  autoStart?: boolean;
  facingMode?: "environment" | "user";
}

/**
 * Modern Barcode & QR Scanner hook using @zxing/browser
 * Works across mobile and desktop browsers with audio beep, retry mounting, and error handling.
 */
export function useBarcodeScanner(
  onDetected: ScanCallback,
  options: UseBarcodeScannerOptions = {},
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const playSoundRef = useRef<boolean>(options.playSound ?? true);
  playSoundRef.current = options.playSound ?? true;

  const dedupRef = useRef<ScannerDeduplicator>(
    new ScannerDeduplicator({ cooldownMs: options.cooldownMs ?? 1800 }),
  );
  const onDetectedRef = useRef<ScanCallback>(onDetected);
  onDetectedRef.current = onDetected;

  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [supported, setSupported] = useState(true);
  const [diagnostics, setDiagnostics] = useState<ScannerDiagnostics>({
    readerEngine: "@zxing/browser (MultiFormat)",
    hasCameraSupport: true,
  });

  useEffect(() => {
    const hasMedia =
      typeof navigator !== "undefined" && Boolean(navigator?.mediaDevices?.getUserMedia);
    setSupported(hasMedia);
    setDiagnostics((prev) => ({
      ...prev,
      hasCameraSupport: hasMedia,
    }));
  }, []);

  const stop = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch {
        // Safe ignore
      }
      controlsRef.current = null;
    }
    if (videoRef.current) {
      const srcObj = videoRef.current.srcObject as MediaStream | null;
      if (srcObj) {
        srcObj.getTracks().forEach((t) => t.stop());
      }
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
  }, []);

  const start = useCallback(
    async (providedVideoEl?: HTMLVideoElement | null) => {
      if (typeof navigator === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
        setSupported(false);
        setError("เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้อง กรุณากรอกรหัสด้วยมือ");
        setStatus("error");
        return;
      }

      stop();
      setError(null);
      setPermissionDenied(false);
      setStatus("starting");

      try {
        if (!readerRef.current) {
          readerRef.current = new BrowserMultiFormatReader();
        }

        // Wait up to 500ms for video element if not mounted yet
        let video = providedVideoEl || videoRef.current;
        if (!video) {
          for (let i = 0; i < 8; i++) {
            await new Promise((resolve) => setTimeout(resolve, 60));
            video = providedVideoEl || videoRef.current;
            if (video) break;
          }
        }

        if (!video) {
          throw new Error("Video element is not mounted");
        }

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: options.facingMode || "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        const controls = await readerRef.current.decodeFromConstraints(
          constraints,
          video,
          (result, decodeErr) => {
            if (result) {
              const raw = result.getText()?.trim();
              const formatNumber = result.getBarcodeFormat();
              const formatStr = String(formatNumber);
              const type = classifyScanType(formatStr);

              if (raw) {
                const accepted = dedupRef.current.shouldAccept(raw, formatStr);
                if (accepted) {
                  const nowStr = new Date().toLocaleTimeString("th-TH");

                  if (playSoundRef.current) {
                    playScanSuccessSound();
                  }

                  setDiagnostics((prev) => ({
                    ...prev,
                    lastScannedCode: raw,
                    lastScannedFormat: formatStr,
                    lastScannedType: type,
                    lastScannedAt: nowStr,
                  }));
                  onDetectedRef.current(raw, formatStr, type);
                }
              }
            }
            if (decodeErr && decodeErr.name !== "NotFoundException") {
              // Non-fatal scanning iteration
            }
          },
        );

        controlsRef.current = controls;
        setStatus("scanning");
      } catch (err: unknown) {
        const errName = (err as { name?: string })?.name ?? "";
        const errMsg = (err as { message?: string })?.message ?? "";

        let userMsg = "เปิดกล้องไม่สำเร็จ กรุณาตรวจสอบการอนุญาตใช้งานกล้องบนเบราว์เซอร์";
        if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
          userMsg =
            "ไม่ได้รับอนุญาตให้ใช้กล้อง (Permission Denied) กรุณาอนุญาตสิทธิ์ในเบราว์เซอร์ หรือกรอกรหัสด้วยมือ";
          setPermissionDenied(true);
        } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
          userMsg = "ไม่พบอุปกรณ์กล้องบนเครื่องนี้ กรุณากรอกรหัสด้วยมือ";
        }

        setError(userMsg);
        setDiagnostics((prev) => ({
          ...prev,
          errorDetail: `${errName}: ${errMsg}`,
        }));
        setStatus("error");
        stop();
      }
    },
    [stop, options.facingMode],
  );

  useEffect(() => {
    if (options.autoStart) {
      void start();
    }
    return () => {
      stop();
    };
  }, [options.autoStart, start, stop]);

  const resetDeduplication = useCallback(() => {
    dedupRef.current.resetAll();
  }, []);

  return {
    videoRef,
    status,
    error,
    permissionDenied,
    supported,
    diagnostics,
    start,
    stop,
    resetDeduplication,
  };
}
