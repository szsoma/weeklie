import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-mono font-semibold text-2xl tracking-tight mb-1">
          weeklie
        </h1>
        <p className="text-sm text-muted mb-8">
          {sent ? "Enter the 6-digit code sent to your email." : "Sign in to sync your week."}
        </p>

        {!sent ? (
          <form onSubmit={sendCode} className="space-y-4">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-transparent border-b border-rule-strong outline-none py-2.5 text-[17px] placeholder:text-faint focus:border-ink transition-colors"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 bg-ink text-bg rounded-md font-mono text-[14px] uppercase hover:opacity-80 active:scale-[0.99] transition disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
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
              className="w-full bg-transparent border-b border-rule-strong outline-none py-2.5 text-[17px] tracking-[0.4em] placeholder:text-faint placeholder:tracking-normal focus:border-ink transition-colors"
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full py-3.5 bg-ink text-bg rounded-md font-mono text-[14px] uppercase hover:opacity-80 active:scale-[0.99] transition disabled:opacity-50"
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

        {error && (
          <p className="mt-4 text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}
