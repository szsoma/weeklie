import { useState } from "react";
import { supabase } from "../lib/supabase";

type Mode = "password" | "code";

const inputClass =
  "w-full bg-transparent border-b border-rule-strong outline-none py-2.5 text-[17px] placeholder:text-faint focus-visible:outline-none focus-visible:bg-ink/[0.03] transition-colors";
const buttonClass =
  "w-full py-3.5 bg-ink text-bg rounded-md font-mono text-[14px] uppercase hover:opacity-80 active:scale-[0.99] transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const modeButtonBaseClass =
  "pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

type ModeButtonProps = {
  mode: Mode;
  activeMode: Mode;
  onSelect: (mode: Mode) => void;
  ariaLabel: string;
  children: string;
};

function getModeButtonClassName(isActive: boolean): string {
  if (isActive) return `${modeButtonBaseClass} text-ink border-b border-ink`;
  return `${modeButtonBaseClass} text-faint hover:text-muted`;
}

function ModeButton({
  mode,
  activeMode,
  onSelect,
  ariaLabel,
  children,
}: ModeButtonProps) {
  const isActive = mode === activeMode;
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={getModeButtonClassName(isActive)}
      aria-pressed={isActive}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

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

  function renderPasswordForm() {
    return (
      <form onSubmit={signInPassword} className="space-y-4">
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          name="email"
          autoComplete="email"
          aria-label="Email address"
          className={inputClass}
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          name="password"
          autoComplete="current-password"
          aria-label="Password"
          className={inputClass}
        />
        <button type="submit" disabled={busy} className={buttonClass}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    );
  }

  function renderCodeRequestForm() {
    return (
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
          name="email"
          autoComplete="email"
          aria-label="Email address"
          className={inputClass}
        />
        <button type="submit" disabled={busy} className={buttonClass}>
          {busy ? "Sending…" : "Send code"}
        </button>
      </form>
    );
  }

  function renderVerificationForm() {
    return (
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
          name="one-time-code"
          aria-label="Email verification code"
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
          className="w-full text-[12px] font-mono uppercase text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          ← use a different email
        </button>
      </form>
    );
  }

  function renderAuthForm() {
    if (mode === "password") return renderPasswordForm();
    if (!sent) return renderCodeRequestForm();
    return renderVerificationForm();
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center bg-cover bg-center px-4 py-8 sm:px-6"
      style={{ backgroundImage: "url('/hero-bg-p-2600.jpg')" }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/60 bg-white/80 p-6 text-ink shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-8">
        <h1 className="mb-2">
          <img
            src="/weekly-logo.svg"
            alt="Weekly"
            className="h-8 w-auto"
          />
        </h1>
        <p className="text-sm text-muted mb-6">Sign in to sync your week.</p>

        <div className="flex gap-5 mb-6 font-mono text-[12px] uppercase tracking-[0.08em]">
          <ModeButton
            mode="password"
            activeMode={mode}
            onSelect={switchMode}
            ariaLabel="Password sign in"
          >
            Password
          </ModeButton>
          <ModeButton
            mode="code"
            activeMode={mode}
            onSelect={switchMode}
            ariaLabel="Email code sign in"
          >
            Email code
          </ModeButton>
        </div>

        {renderAuthForm()}

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
