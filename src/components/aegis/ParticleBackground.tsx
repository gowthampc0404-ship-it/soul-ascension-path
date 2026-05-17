import { useEffect, useRef } from "react";

type Mode = "wisp" | "fire" | "monarch";

function modeForStreak(streak: number): Mode {
  if (streak >= 15) return "monarch";
  if (streak >= 3) return "fire";
  return "wisp";
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; hue: number; core: boolean;
}

export function ParticleBackground({ streak }: { streak: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<Mode>(modeForStreak(streak));

  useEffect(() => { modeRef.current = modeForStreak(streak); }, [streak]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
    };
    resize(); window.addEventListener("resize", resize);

    const parts: Particle[] = [];

    const spawn = () => {
      const m = modeRef.current;
      const w = c.width, h = c.height;
      const count = m === "monarch" ? 6 : m === "fire" ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const baseX = w * 0.5 + (Math.random() - 0.5) * w * 0.55;
        parts.push({
          x: baseX,
          y: h + 20,
          vx: (Math.random() - 0.5) * (m === "monarch" ? 1.6 : 0.8) * dpr,
          vy: -(0.6 + Math.random() * (m === "monarch" ? 3.2 : m === "fire" ? 2.0 : 0.9)) * dpr,
          life: 0,
          max: 90 + Math.random() * (m === "monarch" ? 80 : 60),
          size: (m === "monarch" ? 10 + Math.random() * 28 : m === "fire" ? 6 + Math.random() * 18 : 3 + Math.random() * 10) * dpr,
          hue: m === "wisp" ? 285 : m === "fire" ? 290 : 270,
          core: m === "monarch" && Math.random() < 0.35,
        });
      }
    };

    const tick = () => {
      const m = modeRef.current;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(9,9,11,0.22)";
      ctx.fillRect(0, 0, c.width, c.height);

      // throne silhouette in monarch state
      if (m === "monarch") {
        const w = c.width, h = c.height;
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        const cx = w/2, by = h*0.78;
        ctx.beginPath();
        ctx.moveTo(cx - 220*dpr, by);
        ctx.lineTo(cx - 220*dpr, by - 280*dpr);
        ctx.lineTo(cx - 160*dpr, by - 360*dpr);
        ctx.lineTo(cx - 80*dpr,  by - 300*dpr);
        ctx.lineTo(cx,           by - 420*dpr);
        ctx.lineTo(cx + 80*dpr,  by - 300*dpr);
        ctx.lineTo(cx + 160*dpr, by - 360*dpr);
        ctx.lineTo(cx + 220*dpr, by - 280*dpr);
        ctx.lineTo(cx + 220*dpr, by);
        ctx.closePath();
        ctx.fill();
        // blue inner glow rim
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "oklch(0.78 0.18 220)";
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();
        ctx.restore();
      }

      spawn();

      ctx.globalCompositeOperation = "lighter";
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life++;
        p.x += p.vx + Math.sin((p.life + i) * 0.05) * (m === "monarch" ? 1.2 : 0.4);
        p.y += p.vy;
        p.vy *= 0.995;
        const t = p.life / p.max;
        if (t >= 1) { parts.splice(i, 1); continue; }
        const alpha = (1 - t) * (m === "wisp" ? 0.35 : m === "fire" ? 0.55 : 0.75);
        const r = p.size * (1 + t * 0.6);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        if (m === "wisp") {
          grad.addColorStop(0, `rgba(120, 80, 180, ${alpha})`);
          grad.addColorStop(1, "rgba(10, 8, 20, 0)");
        } else if (m === "fire") {
          grad.addColorStop(0, `rgba(40, 10, 60, ${alpha})`);
          grad.addColorStop(0.6, `rgba(168, 85, 247, ${alpha * 0.7})`);
          grad.addColorStop(1, "rgba(0,0,0,0)");
        } else {
          if (p.core) {
            grad.addColorStop(0, `rgba(120, 200, 255, ${alpha})`);
            grad.addColorStop(0.4, `rgba(60, 100, 220, ${alpha * 0.8})`);
            grad.addColorStop(1, "rgba(0,0,0,0)");
          } else {
            grad.addColorStop(0, `rgba(20, 0, 40, ${alpha})`);
            grad.addColorStop(0.5, `rgba(80, 30, 140, ${alpha * 0.6})`);
            grad.addColorStop(1, "rgba(0,0,0,0)");
          }
        }
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 h-full w-full"
      aria-hidden
    />
  );
}
