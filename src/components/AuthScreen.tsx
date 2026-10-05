import { useState } from "react";
import { ownerEmail, supabase } from "../lib/supabase";

const inputClass =
  "w-full bg-transparent border-b border-rule-strong outline-none py-2.5 text-[17px] placeholder:text-faint focus-visible:outline-none focus-visible:bg-ink/[0.03] transition-colors";
const buttonClass =
  "w-full py-3.5 bg-ink text-bg rounded-md font-mono text-[14px] uppercase hover:opacity-80 active:scale-[0.99] transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export default function AuthScreen() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const unlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ownerEmail || !password || busy) return;

    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: ownerEmail,
        password,
      });
      if (error) {
        setError(
          /invalid login credentials/i.test(error.message)
            ? "Incorrect PIN code."
            : error.message,
        );
      }
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setPassword("");
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center bg-cover bg-center px-4 py-8 sm:px-6"
      style={{ backgroundImage: "url('/hero-bg-p-2600.jpg')" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/60 bg-white/80 p-6 text-ink shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-8"
        style={{
          "--bg": "#fffdfc",
          "--surface": "#fff",
          "--ink": "#1a1a1a",
          "--muted": "#514b3f",
          "--faint": "#6f6657",
          "--rule": "rgba(26, 26, 26, 0.12)",
          "--rule-strong": "rgba(26, 26, 26, 0.22)",
        } as React.CSSProperties}
      >
        <h1 className="mb-2">
          <img src="/weekly-logo-light.svg" alt="Weekly" className="h-8 w-auto" />
        </h1>
        <p className="text-sm text-muted mb-6">
          Enter your PIN code to unlock this device.
        </p>

        {ownerEmail ? (
          <form onSubmit={unlock} className="space-y-4" aria-busy={busy}>
            <input
              type="password"
              required
              autoFocus
              inputMode="numeric"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="PIN code"
              name="password"
              autoComplete="current-password"
              aria-label="PIN code"
              className={inputClass}
            />
            <button type="submit" disabled={busy} className={buttonClass}>
              Unlock
            </button>
          </form>
        ) : (
          <p role="alert" className="text-sm text-red-700">
            Set VITE_OWNER_EMAIL to the existing Supabase account email.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
