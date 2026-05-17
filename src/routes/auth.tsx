import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

        <button
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
