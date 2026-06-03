import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { VortexGrid } from "@/components/aegis/VortexGrid";
import { HunterDialogue } from "@/components/aegis/HunterDialogue";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Aegis System · Hunter Registration" },
      { name: "description", content: "Awaken as a Hunter. Begin your solo quest." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

const DIALOGUE = "Welcome, Hunter. Initialization Complete. System Check-in. I am your shadow registry terminal. Let me introduce your core daily directives...";

function AuthPage() {
  const nav = useNavigate();
  const [showEmail, setShowEmail] = useState(false);
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
          options: { emailRedirectTo: `${window.location.origin}/`, data: { hunter_name: hunterName || "HUNTER" } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      nav({ to: "/" });
    } catch (e: any) { setErr(e.message || "Authentication failed"); }
    finally { setLoading(false); }
  };

  const google = async () => {
    setErr(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) throw new Error(result.error.message || "Google sign-in failed");
      if (result.redirected) return;
      nav({ to: "/" });
    } catch (e: any) { setErr(e.message || "Google sign-in failed"); }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-12">
      <VortexGrid />

      {/* Title halo */}
      <div className="pointer-events-none absolute left-1/2 top-[18%] -translate-x-1/2 text-center">
        <h1
          className="font-display text-4xl tracking-[0.25em] sm:text-6xl"
          style={{
            color: "oklch(0.95 0.08 300)",
            textShadow: "0 0 18px oklch(0.65 0.27 300 / 0.95), 0 0 48px oklch(0.65 0.27 300 / 0.6)",
          }}
        >
          AEGIS SYSTEM
        </h1>
      </div>

      {/* Auth card */}
      <div className="glass-panel angular-clip relative z-10 w-full max-w-md p-7">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.6em] cyan-text">[ HUNTER PROTOCOL ]</div>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
            {showEmail ? (mode === "login" ? "AUTHENTICATE TO ENTER DUNGEON" : "REGISTER NEW HUNTER") : "SELECT REGISTRATION MODE"}
          </p>
        </div>

        {!showEmail ? (
          <div className="mt-6 space-y-3">
            <ChoiceButton letter="A" label="Sign in with Email" onClick={() => setShowEmail(true)} active />
            <ChoiceButton letter="B" label="Sign in with Google" onClick={google}
              icon={
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-5c-2 1.4-4.4 2.1-7 2.1-5.3 0-9.7-3-11.3-7.5l-6.5 5C9.6 39 16.2 43.5 24 43.5z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4-4.3 5.3l6 5C40.9 35.9 43.5 30.5 43.5 24c0-1.2-.1-2.3-.3-3.5z"/>
                </svg>
              } />
            {err && <div className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-xs danger-text">{err}</div>}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <Field label="HUNTER NAME">
                <input value={hunterName} onChange={e => setHunterName(e.target.value)} maxLength={24} placeholder="SHADOW" required
                  className="w-full bg-transparent px-3 py-2 font-display text-sm uppercase tracking-widest outline-none" />
              </Field>
            )}
            <Field label="EMAIL">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-transparent px-3 py-2 text-sm outline-none" />
            </Field>
            <Field label="PASSCODE">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required
                className="w-full bg-transparent px-3 py-2 text-sm outline-none" />
            </Field>
            {err && <div className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-xs danger-text">{err}</div>}
            <button type="submit" disabled={loading}
              className="w-full border border-primary bg-primary/20 px-4 py-3 font-display text-sm uppercase tracking-[0.4em] neon-text transition hover:bg-primary/40 hover:shadow-[var(--glow-neon)] disabled:opacity-50">
              {loading ? "PROCESSING..." : mode === "login" ? "≫ ENTER ≫" : "≫ AWAKEN ≫"}
            </button>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <button type="button" onClick={() => setShowEmail(false)} className="hover:cyan-text">[ BACK ]</button>
              <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(null); }} className="hover:cyan-text">
                {mode === "login" ? "[ NEW HUNTER? ]" : "[ EXISTING HUNTER? ]"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Hunter + dialogue */}
      <HunterDialogue text={DIALOGUE} className="pointer-events-none absolute bottom-0 right-0 z-10 hidden md:flex" />
    </main>
  );
}

function ChoiceButton({ letter, label, onClick, active, icon }: { letter: string; label: string; onClick: () => void; active?: boolean; icon?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`group flex w-full items-center gap-3 border px-3 py-3 text-sm uppercase tracking-[0.2em] transition ${
        active
          ? "border-primary bg-primary/20 neon-text shadow-[var(--glow-neon)]"
          : "border-primary/30 bg-black/40 text-foreground hover:border-primary hover:bg-primary/10 hover:shadow-[var(--glow-neon)]"
      }`}>
      <span className="grid h-7 w-7 place-items-center border border-primary/50 font-display text-xs text-foreground/80">{letter}</span>
      <span className="flex flex-1 items-center justify-center gap-2 font-display">
        {icon}{label}
      </span>
    </button>
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
