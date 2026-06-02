import type { CapacitorConfig } from "@capacitor/cli";

// Phase 4: Capacitor Android shell. After `bun install`, run:
//   npx cap add android && npx cap sync android
// then `npx cap open android` to build the APK in Android Studio.
const config: CapacitorConfig = {
  appId: "app.aegis.system",
  appName: "Aegis System",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#000000",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_aegis",
      iconColor: "#a855f7",
      sound: "beep.wav",
    },
  },
};

export default config;
