import { useEffect, useRef, useState } from "react";

type Props = { value: string; size?: number };

const ensureQrLib = () => new Promise<void>((resolve, reject) => {
  const w: any = window as any;
  if (w.QRCode) { resolve(); return; }
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";
  s.onload = () => resolve();
  s.onerror = () => reject(new Error("Falha ao carregar QRCode.js"));
  document.head.appendChild(s);
});

const QrCode = ({ value, size = 160 }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await ensureQrLib();
        if (!mounted) return;
        setReady(true);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const w: any = window as any;
    if (!ready || !ref.current || !value) return;
    ref.current.innerHTML = "";
    try {
      new w.QRCode(ref.current, {
        text: value,
        width: size,
        height: size,
        correctLevel: w.QRCode.CorrectLevel.M,
      });
    } catch {}
  }, [ready, value, size]);

  const downloadPng = () => {
    const canvas = ref.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrcode.png";
    a.click();
  };

  return (
    <div className="flex items-center gap-3">
      <div ref={ref} className="rounded-md border p-2 bg-white" />
      <button type="button" onClick={downloadPng} className="text-xs underline">Baixar PNG</button>
    </div>
  );
};

export default QrCode;