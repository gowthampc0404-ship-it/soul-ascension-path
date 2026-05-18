import { useEffect, useState } from "react";
import { Volume2, MessageSquare, Bell } from "lucide-react";

interface Row {
  key: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

export function PermissionsMatrix() {
  const [rows, setRows] = useState<Row[]>([
    { key: "audio", label: "LOCAL AUDIO BRIDGE", icon: <Volume2 className="h-3.5 w-3.5" />, active: false },
    { key: "tts", label: "TEXT-TO-SPEECH CORE", icon: <MessageSquare className="h-3.5 w-3.5" />, active: false },
    { key: "notif", label: "LOCAL NOTIFICATIONS", icon: <Bell className="h-3.5 w-3.5" />, active: false },
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = typeof window.AudioContext !== "undefined" || typeof (window as any).webkitAudioContext !== "undefined";
    const tts = "speechSynthesis" in window;
    const notif = "Notification" in window && Notification.permission === "granted";
    setRows([
      { key: "audio", label: "LOCAL AUDIO BRIDGE", icon: <Volume2 className="h-3.5 w-3.5" />, active: audio },
      { key: "tts", label: "TEXT-TO-SPEECH CORE", icon: <MessageSquare className="h-3.5 w-3.5" />, active: tts },
      { key: "notif", label: "LOCAL NOTIFICATIONS", icon: <Bell className="h-3.5 w-3.5" />, active: notif },
    ]);
  }, []);

  const toggle = async (k: string) => {
    if (k === "notif" && "Notification" in window) {
      const res = await Notification.requestPermission();
      setRows(prev => prev.map(r => r.key === "notif" ? { ...r, active: res === "granted" } : r));
    }
  };

  return (
    <div className="glass-panel angular-clip p-4">
      <div className="mb-2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">[ PERMISSIONS MATRIX ]</div>
      <ul className="space-y-1.5">
        {rows.map(r => (
          <li key={r.key} className="flex items-center justify-between border border-primary/20 bg-black/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={r.active ? "cyan-text" : "text-muted-foreground"}>{r.icon}</span>
              <span className="font-display text-[11px] uppercase tracking-widest text-foreground/80">{r.label}</span>
            </div>
            <button onClick={() => toggle(r.key)} className={`relative h-5 w-9 border transition ${r.active ? "border-accent bg-accent/30" : "border-muted/50 bg-black"}`}>
              <span className={`absolute top-0.5 h-3.5 w-3.5 transition-all ${r.active ? "left-5 bg-[oklch(0.78_0.18_220)] shadow-[var(--glow-cyan)]" : "left-0.5 bg-muted"}`} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
