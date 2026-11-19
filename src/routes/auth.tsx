import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Aegis System · Hunter Registration" },
      { name: "description", content: "Awaken as a Hunter. Begin your solo quest." },
      { property: "og:title", content: "Aegis System · Hunter Registration" },
      { property: "og:description", content: "Sign in or create your Hunter profile to begin your solo quest." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hunterName, setHunterName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { hunter_name: hunterName || "HUNTER" },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      nav({ to: "/" });
    } catch (e: any) {
      setErr(e.message || "Authentication failed");
    } finally { setLoading(false); }
  };

  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-12">
      <div className="absolute inset-0 system-grid opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.25_0.2_290/0.3),transparent_70%)]" />

      <div className="glass-panel angular-clip relative w-full max-w-md p-7 scanlines">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.6em] cyan-text">[ AEGIS SYSTEM ]</div>
          <h1 className="mt-2 font-display text-3xl neon-text">HUNTER PROTOCOL</h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
            {mode === "login" ? "AUTHENTICATE TO ENTER DUNGEON" : "REGISTER NEW HUNTER"}
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "signup" && (
            <Field label="HUNTER NAME">
              <input value={hunterName} onChange={(e) => setHunterName(e.target.value)} maxLength={24}
                placeholder="SHADOW" required
                className="w-full bg-transparent px-3 py-2 font-display text-sm uppercase tracking-widest outline-none" />
            </Field>
          )}
          <Field label="EMAIL">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-transparent px-3 py-2 text-sm outline-none" />
          </Field>
          <Field label="PASSCODE">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required
              className="w-full bg-transparent px-3 py-2 text-sm outline-none" />
          </Field>

          {err && (
            <div className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-xs danger-text">{err}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full border border-primary bg-primary/15 px-4 py-3 font-display text-sm uppercase tracking-[0.4em] neon-text transition hover:bg-primary/30 hover:shadow-[var(--glow-neon)] disabled:opacity-50">
            {loading ? "PROCESSING..." : mode === "login" ? "≫ ENTER ≫" : "≫ AWAKEN ≫"}
          </button>
        </form>

        <div className="mt-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-primary/30" />
          <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-primary/30" />
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setErr(null);
            try {
              const result = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (result.error) throw new Error(result.error.message || "Google sign-in failed");
              if (result.redirected) return;
              nav({ to: "/" });
            } catch (e: any) {
              setErr(e.message || "Google sign-in failed");
            }
          }}
          className="mt-3 flex w-full items-center justify-center gap-3 border border-primary/50 bg-black/40 px-4 py-3 font-display text-sm uppercase tracking-[0.3em] text-foreground transition hover:border-primary hover:bg-primary/10 hover:shadow-[var(--glow-neon)] disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-5c-2 1.4-4.4 2.1-7 2.1-5.3 0-9.7-3-11.3-7.5l-6.5 5C9.6 39 16.2 43.5 24 43.5z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4-4.3 5.3l6 5C40.9 35.9 43.5 30.5 43.5 24c0-1.2-.1-2.3-.3-3.5z"/>
          </svg>
          CONTINUE WITH GOOGLE
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(null); }}
          className="mt-5 w-full text-center text-[11px] uppercase tracking-widest text-muted-foreground hover:cyan-text"
        >
          {mode === "login" ? "[ NEW HUNTER? AWAKEN HERE ]" : "[ EXISTING HUNTER? ENTER HERE ]"}
        </button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block border border-primary/30 bg-black/40 focus-within:border-primary focus-within:shadow-[var(--glow-neon)]"
      style={{ clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}>
      <div className="px-3 pt-2 text-[9px] uppercase tracking-[0.4em] text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
