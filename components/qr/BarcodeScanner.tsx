"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const scannerId = "barcode-reader";

    async function startScanner() {
      try {
        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 120 } },
          (decodedText) => {
            if (mountedRef.current) {
              onScan(decodedText);
              scanner.stop().catch(() => {});
            }
          },
          () => {}
        );
      } catch {
        if (mountedRef.current) {
          setError("Camera access denied. Please allow camera permissions and try again.");
        }
      }
    }

    startScanner();

    return () => {
      mountedRef.current = false;
      scannerRef.current?.stop().catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-white font-semibold text-lg">Scan Product Barcode</p>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 min-h-0"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {error ? (
          <div className="bg-red-900/50 border border-red-500 rounded-2xl p-4 text-center">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        ) : (
          <div className="relative">
            <div id="barcode-reader" className="rounded-2xl overflow-hidden" />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-24 border-2 border-white/60 rounded-xl">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-xl" />
              </div>
            </div>
          </div>
        )}

        <p className="text-white/60 text-sm text-center mt-4">
          Point your camera at the barcode on the product
        </p>
      </div>
    </div>
  );
}
