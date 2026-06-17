import { useEffect, useState } from "react";
import { formatWeekLabel, getWeekId, toLocalDateKey } from "../dates";
import {
  buildShareUrl,
  getOrCreateWeekShare,
  revokeWeekShare,
} from "../lib/week-share";
import type { WeekShare } from "../types";

type Props = {
  weekStart: Date;
  onClose: () => void;
};

type CopyState = "idle" | "copied" | "failed";

export default function ShareWeekDialog({ weekStart, onClose }: Props) {
  const [share, setShare] = useState<WeekShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [revoking, setRevoking] = useState(false);

  const weekId = getWeekId(weekStart);
  const weekStartKey = toLocalDateKey(weekStart);
  const shareUrl = share ? buildShareUrl(share.token) : "";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    async function loadShare() {
      setLoading(true);
      setError(null);
      setShare(null);
      setCopyState("idle");
      try {
        const nextShare = await getOrCreateWeekShare({
          weekId,
          weekStart: weekStartKey,
        });
        if (!cancelled) setShare(nextShare);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not create share link.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadShare();

    return () => {
      cancelled = true;
    };
  }, [weekId, weekStartKey]);

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const revoke = async () => {
    setRevoking(true);
    setError(null);
    try {
      await revokeWeekShare(weekStartKey);
      setShare(null);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not revoke share link.",
      );
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/20 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Share week ${formatWeekLabel(weekStart)}`}
      onClick={onClose}
    >
      <section
        className="relative w-full max-w-md rounded-2xl border border-rule-strong bg-surface p-5 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
              Share week
            </p>
            <h2 className="mt-1 font-mono text-xl font-semibold text-ink">
              {formatWeekLabel(weekStart)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            aria-label="Close"
          >
            X
          </button>
        </div>

        {loading && (
          <p className="font-mono text-sm text-muted">Creating share link...</p>
        )}

        {error && (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && shareUrl && (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                Public link
              </span>
              <input
                readOnly
                value={shareUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="h-11 w-full rounded-xl border border-rule-strong bg-bg px-3 font-mono text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
              />
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={copyLink}
                className="h-11 flex-1 rounded-xl bg-ink px-4 font-mono text-sm uppercase text-bg transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                {copyState === "copied" ? "Copied" : "Copy link"}
              </button>
              <button
                type="button"
                onClick={revoke}
                disabled={revoking}
                className="h-11 flex-1 rounded-xl border border-rule-strong px-4 font-mono text-sm uppercase text-muted transition hover:bg-ink/[0.06] hover:text-ink disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                {revoking ? "Revoking" : "Revoke"}
              </button>
            </div>

            {copyState === "failed" && (
              <p className="font-mono text-xs text-muted">
                Copy failed. Select the link field and copy it manually.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
