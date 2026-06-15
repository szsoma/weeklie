import { useState } from "react";
import { supabase } from "../lib/supabase";

type Mode = "password" | "code";

const inputClass =
  "w-full bg-transparent border-b border-rule-strong outline-none py-2.5 text-[17px] placeholder:text-faint focus:border-ink transition-colors";
const buttonClass =
  "w-full py-3.5 bg-ink text-bg rounded-md font-mono text-[14px] uppercase hover:opacity-80 active:scale-[0.99] transition disabled:opacity-50";

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signInPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    // on success, App's onAuthStateChange flips to the app
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setBusy(false);
    if (error) setError(error.message);
    // on success, App's onAuthStateChange flips to the app
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setSent(false);
  };

  return (
    <div className="h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-mono font-semibold text-2xl tracking-tight mb-1">
          weeklie
        </h1>
        <p className="text-sm text-muted mb-6">Sign in to sync your week.</p>

        <div className="flex gap-5 mb-6 font-mono text-[12px] uppercase tracking-[0.08em]">
          <button
            type="button"
            onClick={() => switchMode("password")}
            className={
              mode === "password"
                ? "text-ink border-b border-ink pb-1"
                : "text-faint pb-1 hover:text-muted"
            }
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => switchMode("code")}
            className={
              mode === "code"
                ? "text-ink border-b border-ink pb-1"
                : "text-faint pb-1 hover:text-muted"
            }
          >
            Email code
          </button>
        </div>

        {mode === "password" ? (
          <form onSubmit={signInPassword} className="space-y-4">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className={inputClass}
            />
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : !sent ? (
          <form onSubmit={sendCode} className="space-y-4">
            <p className="text-sm text-muted mb-2">
              Enter your email and we'll send a 6-digit code.
            </p>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <p className="text-sm text-muted mb-2">
              Enter the 6-digit code sent to {email}.
            </p>
            <input
              type="text"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className={`${inputClass} tracking-[0.4em] placeholder:tracking-normal`}
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className={buttonClass}
            >
              {busy ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setCode("");
              }}
              className="w-full text-[12px] font-mono uppercase text-muted hover:text-ink"
            >
              ← use a different email
            </button>
          </form>
        )}

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
