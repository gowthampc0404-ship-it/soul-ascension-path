// Unified notification helper: uses Capacitor LocalNotifications when running
// inside a native shell, otherwise falls back to the Web Notification API.

let nativeMod: typeof import("@capacitor/local-notifications") | null = null;

async function getNative() {
  if (nativeMod !== null) return nativeMod;
  try {
    // Only load native module in a Capacitor webview to keep web bundle slim.
    if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
      nativeMod = await import("@capacitor/local-notifications");
      return nativeMod;
    }
  } catch { /* ignore */ }
  return null;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const native = await getNative();
  if (native) {
    const r = await native.LocalNotifications.requestPermissions();
    return r.display === "granted";
  }
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const p = await Notification.requestPermission();
  return p === "granted";
}

export async function notify(title: string, body: string) {
  const native = await getNative();
  if (native) {
    await native.LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Math.random() * 1_000_000),
        title, body,
        schedule: { at: new Date(Date.now() + 500) },
      }],
    });
    return;
  }
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

// Schedule a one-shot reminder at a specific Date (used for strict wake-up
// windows, midnight ambush warnings, quest deadlines).
export async function scheduleAt(at: Date, title: string, body: string, id?: number) {
  const native = await getNative();
  if (native) {
    await native.LocalNotifications.schedule({
      notifications: [{
        id: id ?? Math.floor(Math.random() * 1_000_000),
        title, body,
        schedule: { at },
      }],
    });
    return;
  }
  // Web fallback: in-tab setTimeout (best-effort while page is open)
  const ms = at.getTime() - Date.now();
  if (ms <= 0 || ms > 86400_000) return;
  setTimeout(() => notify(title, body), ms);
}
