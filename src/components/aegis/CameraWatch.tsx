import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCcw, X, Zap } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  current: number;
  target: number;
  onRep: () => void;            // called each detected rep
  onClose: () => void;
}

// AI Watch: opens MediaDevices camera, supports front/back toggle, and uses a
// downscaled frame-diff motion estimator to auto-increment reps. Designed as a
// drop-in upgrade that works in browsers AND inside the Capacitor WebView.
export function CameraWatch({ open, title, current, target, onRep, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const stateRef = useRef<"idle" | "armed">("idle");
  const lastRepAtRef = useRef<number>(0);

  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [error, setError] = useState<string | null>(null);
  const [motion, setMotion] = useState(0);

  // (Re)open camera when facing changes or modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e: any) {
        setError(e?.message || "Camera access denied.");
      }
    })();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open, facing]);

  // Motion loop
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvas.width = 80; canvas.height = 60;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const tick = () => {
      const v = videoRef.current;
      if (v && v.readyState >= 2) {
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const prev = prevFrameRef.current;
        if (prev && prev.length === frame.length) {
          let diff = 0;
          // sample every 4th pixel, luma only
          for (let i = 0; i < frame.length; i += 16) {
            const a = (frame[i] + frame[i + 1] + frame[i + 2]) / 3;
            const b = (prev[i] + prev[i + 1] + prev[i + 2]) / 3;
            diff += Math.abs(a - b);
          }
          const score = diff / (frame.length / 16);  // 0..255
          setMotion(score);
          const now = performance.now();
          // Hysteresis: high threshold to arm, then low to fire one rep
          if (stateRef.current === "idle" && score > 24) {
            stateRef.current = "armed";
          } else if (stateRef.current === "armed" && score < 8 && now - lastRepAtRef.current > 450) {
            stateRef.current = "idle";
            lastRepAtRef.current = now;
            onRep();
          }
        }
        prevFrameRef.current = new Uint8ClampedArray(frame);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      prevFrameRef.current = null;
      stateRef.current = "idle";
    };
  }, [open, onRep]);

  if (!open) return null;

  const pct = Math.min(100, (current / Math.max(target, 1)) * 100);
  const motionPct = Math.min(100, (motion / 40) * 100);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/90 backdrop-blur-md p-4">
      <div className="glass-panel glass-panel-cyan angular-clip relative w-full max-w-md p-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.5em] cyan-text"><Camera className="mr-1 inline h-3 w-3" /> [ AI WATCH ]</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1 font-display text-sm uppercase tracking-wider text-foreground/90">{title}</div>

        <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden border border-accent/40 bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          {/* HUD overlay */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-2 border border-primary/30" />
            <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 border border-primary/60" />
          </div>
          {/* Motion meter */}
          <div className="absolute bottom-1 left-1 right-1 flex items-center gap-2 bg-black/60 px-2 py-1">
            <Zap className="h-3 w-3 cyan-text" />
            <div className="relative h-1 flex-1 bg-black/60">
              <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${motionPct}%`, background: "linear-gradient(90deg, oklch(0.78 0.18 220), oklch(0.65 0.27 300))", boxShadow: "0 0 8px oklch(0.65 0.27 300)" }} />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{Math.round(motion)}</span>
          </div>
          {error && (
            <div className="absolute inset-0 grid place-items-center bg-black/85 p-4 text-center">
              <div className="font-mono text-xs danger-text">{error}</div>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 border border-primary/30 bg-black/40 px-3 py-2">
          <div className="flex-1">
            <div className="font-display text-lg neon-text tabular-nums" style={{ textShadow: "0 0 8px oklch(0.65 0.27 300)" }}>{current} / {target}</div>
            <div className="relative mt-1 h-1 w-full bg-black/60">
              <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg, oklch(0.85 0.18 220), oklch(0.65 0.27 300))", boxShadow: "0 0 8px oklch(0.65 0.27 300)" }} />
            </div>
          </div>
          <button
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            className="grid h-9 w-9 place-items-center border border-accent/60 cyan-text hover:bg-accent/20"
            title="Flip camera"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full border border-accent/60 bg-accent/10 px-4 py-2 font-display text-xs uppercase tracking-[0.4em] cyan-text transition hover:bg-accent/20"
        >
          DISENGAGE WATCH
        </button>
      </div>
    </div>
  );
}
