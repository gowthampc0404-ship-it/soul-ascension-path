import { useCallback, useEffect, useState } from "react";
import { Volume2, MessageSquare, Bell } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

interface Row {
  key: "audio" | "tts" | "notif";
  label: string;
  icon: React.ReactNode;
  active: boolean;
  detail: string;
}

const ICONS: Record<Row["key"], React.ReactNode> = {
  audio: <Volume2 className="h-3.5 w-3.5" />,
  tts: <MessageSquare className="h-3.5 w-3.5" />,
  notif: <Bell className="h-3.5 w-3.5" />,
};

const LABELS: Record<Row["key"], string> = {
  audio: "LOCAL AUDIO BRIDGE",
  tts: "TEXT-TO-SPEECH CORE",
  notif: "LOCAL NOTIFICATIONS",
};

export function PermissionsMatrix() {
  const [rows, setRows] = useState<Row[]>(
    (["audio", "tts", "notif"] as const).map(k => ({
      key: k, label: LABELS[k], icon: ICONS[k], active: false, detail: "PROBING...",
    }))
  );

  const probe = useCallback(async () => {
    const native = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();

    // AUDIO — WebAudio available on both web & native webview
    const audio = typeof window !== "undefined" &&
      (typeof window.AudioContext !== "undefined" || typeof (window as any).webkitAudioContext !== "undefined");

    // TTS — native plugin if available, else SpeechSynthesis
    let tts = false; let ttsDetail = "OFFLINE";
    try {
      if (native && Capacitor.isPluginAvailable("TextToSpeech")) {
        const langs = await TextToSpeech.getSupportedLanguages();
        tts = (langs?.languages?.length ?? 0) > 0;
        ttsDetail = tts ? `NATIVE · ${langs.languages.length} LANG` : "NATIVE · NO VOICES";
      } else if ("speechSynthesis" in window) {
        tts = true; ttsDetail = "WEB SPEECH API";
      }
    } catch { tts = "speechSynthesis" in window; ttsDetail = tts ? "WEB FALLBACK" : "UNAVAILABLE"; }

    // NOTIFICATIONS — native plugin perm check, else Notification API
    let notif = false; let notifDetail = "DENIED";
    try {
      if (native && Capacitor.isPluginAvailable("LocalNotifications")) {
        const p = await LocalNotifications.checkPermissions();
        notif = p.display === "granted";
        notifDetail = `NATIVE · ${p.display.toUpperCase()}`;
      } else if ("Notification" in window) {
        notif = Notification.permission === "granted";
        notifDetail = `WEB · ${Notification.permission.toUpperCase()}`;
      } else {
        notifDetail = "UNSUPPORTED";
      }
    } catch { notifDetail = "ERROR"; }

    setRows([
      { key: "audio", label: LABELS.audio, icon: ICONS.audio, active: audio,
        detail: `${platform.toUpperCase()} · ${audio ? "WEBAUDIO READY" : "BLOCKED"}` },
      { key: "tts", label: LABELS.tts, icon: ICONS.tts, active: tts, detail: ttsDetail },
      { key: "notif", label: LABELS.notif, icon: ICONS.notif, active: notif, detail: notifDetail },
    ]);
  }, []);

  useEffect(() => {
    probe();
    const onVis = () => { if (document.visibilityState === "visible") probe(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [probe]);

  const toggle = useCallback(async (k: Row["key"]) => {
    const native = Capacitor.isNativePlatform();
    try {
      if (k === "notif") {
        if (native && Capacitor.isPluginAvailable("LocalNotifications")) {
          await LocalNotifications.requestPermissions();
        } else if ("Notification" in window) {
          await Notification.requestPermission();
        }
      } else if (k === "tts") {
        if (native && Capacitor.isPluginAvailable("TextToSpeech")) {
          await TextToSpeech.speak({ text: "Aegis System online.", lang: "en-US", rate: 1.0 });
        } else if ("speechSynthesis" in window) {
          window.speechSynthesis.speak(new SpeechSynthesisUtterance("Aegis System online."));
        }
      } else if (k === "audio") {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (Ctx) { const ctx = new Ctx(); await ctx.resume(); await ctx.close(); }
      }
    } catch (e) { console.warn("[permissions]", k, e); }
    probe();
  }, [probe]);

  return (
    <div className="glass-panel angular-clip p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">[ PERMISSIONS MATRIX ]</div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{Capacitor.getPlatform().toUpperCase()}</div>
      </div>
      <ul className="space-y-1.5">
        {rows.map(r => (
          <li key={r.key} className="flex items-center justify-between border border-primary/20 bg-black/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={r.active ? "cyan-text" : "text-muted-foreground"}>{r.icon}</span>
              <div className="flex flex-col">
                <span className="font-display text-[11px] uppercase tracking-widest text-foreground/80">{r.label}</span>
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/80">{r.detail}</span>
              </div>
            </div>
            <button
              onClick={() => toggle(r.key)}
              aria-label={`Toggle ${r.label}`}
              className={`relative h-5 w-9 border transition ${r.active ? "border-accent bg-accent/30" : "border-muted/50 bg-black"}`}
            >
              <span className={`absolute top-0.5 h-3.5 w-3.5 transition-all ${r.active ? "left-5 bg-[oklch(0.78_0.18_220)] shadow-[var(--glow-cyan)]" : "left-0.5 bg-muted"}`} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
