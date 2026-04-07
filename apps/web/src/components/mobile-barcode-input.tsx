"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DetectedCode = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement | ImageBitmap) => Promise<DetectedCode[]>;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

type MobileBarcodeInputProps = {
  inputId: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (nextValue: string) => void;
};

const supportedFormats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"];

function getBarcodeDetectorCtor() {
  if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
    return null;
  }
  return (window as Window & { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
}

export function MobileBarcodeInput({
  inputId,
  label,
  placeholder = "바코드 숫자를 입력하세요",
  value,
  onChange,
}: MobileBarcodeInputProps) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [helperText, setHelperText] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const detectorCtor = useMemo(() => getBarcodeDetectorCtor(), []);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const isMobileDevice = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const userAgent = navigator.userAgent;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) || window.matchMedia("(max-width: 1100px)").matches;
  }, []);

  const stopCamera = () => {
    if (frameRef.current != null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScannerOpen(false);
    setIsCameraStarting(false);
    setIsDetecting(false);
  };

  useEffect(() => stopCamera, []);

  useEffect(() => {
    if (!scannerOpen || !detectorCtor || !videoRef.current) {
      return;
    }

    const detector = new detectorCtor({ formats: supportedFormats });
    let cancelled = false;

    const scanFrame = async () => {
      if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
        frameRef.current = window.requestAnimationFrame(scanFrame);
        return;
      }

      try {
        const results = await detector.detect(videoRef.current);
        const detectedValue = results.find((result) => result.rawValue?.trim())?.rawValue?.trim();
        if (detectedValue) {
          onChange(detectedValue);
          setHelperText(`바코드 ${detectedValue} 를 인식했습니다.`);
          stopCamera();
          return;
        }
      } catch {
        setHelperText("카메라에서 바코드를 읽지 못했습니다. 이미지 인식이나 직접 입력을 사용해 주세요.");
        stopCamera();
        return;
      }

      frameRef.current = window.requestAnimationFrame(scanFrame);
    };

    frameRef.current = window.requestAnimationFrame(scanFrame);

    return () => {
      cancelled = true;
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [detectorCtor, onChange, scannerOpen]);

  const startCamera = async () => {
    if (!detectorCtor) {
      setHelperText("이 브라우저는 모바일 바코드 인식을 지원하지 않습니다.");
      return;
    }

    try {
      setHelperText("");
      setIsCameraStarting(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setScannerOpen(true);
      setIsDetecting(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setHelperText("카메라를 열 수 없습니다. 권한을 허용하거나 이미지 인식을 사용해 주세요.");
      stopCamera();
    } finally {
      setIsCameraStarting(false);
    }
  };

  const detectFromImage = async (file: File | null) => {
    if (!file) {
      return;
    }
    if (!detectorCtor) {
      setHelperText("이 브라우저는 이미지 바코드 인식을 지원하지 않습니다.");
      return;
    }

    setIsDetecting(true);
    setHelperText("");
    try {
      const detector = new detectorCtor({ formats: supportedFormats });
      const bitmap = await createImageBitmap(file);
      const results = await detector.detect(bitmap);
      bitmap.close();
      const detectedValue = results.find((result) => result.rawValue?.trim())?.rawValue?.trim();
      if (!detectedValue) {
        setHelperText("이미지에서 바코드를 찾지 못했습니다.");
        return;
      }
      onChange(detectedValue);
      setHelperText(`바코드 ${detectedValue} 를 인식했습니다.`);
    } catch {
      setHelperText("이미지 인식에 실패했습니다.");
    } finally {
      setIsDetecting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="input-cluster">
      <label className="input-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="input-shell"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      {isMobileDevice ? (
        <div className="barcode-helper-stack">
          <div className="barcode-helper-actions">
            <button
              className="button secondary"
              disabled={isCameraStarting || isDetecting}
              onClick={() => void startCamera()}
              type="button"
            >
              {scannerOpen || isCameraStarting ? "카메라 준비 중..." : "카메라 인식"}
            </button>
            <button
              className="button"
              disabled={isDetecting}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              이미지 인식
            </button>
          </div>

          <input
            ref={fileInputRef}
            accept="image/*"
            className="barcode-file-input"
            onChange={(event) => void detectFromImage(event.target.files?.[0] ?? null)}
            type="file"
          />

          {scannerOpen ? (
            <div className="barcode-scanner-sheet">
              <video ref={videoRef} className="barcode-video" muted playsInline />
              <div className="barcode-scanner-actions">
                <span className="subtle">{isDetecting ? "바코드를 찾는 중입니다." : "카메라 준비 중입니다."}</span>
                <button className="button" onClick={stopCamera} type="button">
                  닫기
                </button>
              </div>
            </div>
          ) : null}

          {helperText ? <div className="subtle">{helperText}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
