"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QrCodeDisplayProps {
  url: string;
  size?: number;
}

export function QrCodeDisplay({ url, size = 200 }: QrCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 2,
      color: {
        dark: "#8B5CF6",
        light: "#FFFFFF",
      },
    });
  }, [url, size]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl bg-white p-3 shadow-lg">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
