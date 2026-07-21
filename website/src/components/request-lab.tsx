"use client";

import { CheckCircle2, Circle, Loader2, Play, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";

type Scenario = "success" | "disconnect" | "failure";
type Event = { phase: "handler" | "delivery"; label: string; status: "complete" | "cancelled" | "failed"; at: number };
type Result = { requestId: string; scenario: Scenario; outcome: "completed" | "aborted" | "failed"; duration: number; events: Event[] };

const scenarios: Array<{ id: Scenario; label: string }> = [
  { id: "success", label: "Complete" },
  { id: "disconnect", label: "Disconnect" },
  { id: "failure", label: "Producer error" },
];

export function RequestLab() {
  const [scenario, setScenario] = useState<Scenario>("success");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/lifecycle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      if (!response.ok) throw new Error("The lifecycle run failed.");
      setResult((await response.json()) as Result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The lifecycle run failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bento-card bento-card-tall overflow-hidden p-0">
      <div className="flex items-start justify-between gap-4 p-6 sm:p-7">
        <div>
          <p className="eyebrow">Live request lab</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight">Watch a lifetime settle.</h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
            This server-backed demo returns a fresh request timeline for completion, disconnect, or producer failure.
          </p>
        </div>
        <span className="live-dot" aria-label="Live API"><span /></span>
      </div>

      <div className="border-y border-[var(--line)] bg-black/[.12] p-3">
        <div className="grid grid-cols-3 gap-1">
          {scenarios.map((item) => (
            <button key={item.id} type="button" className={`scenario-button ${scenario === item.id ? "scenario-active" : ""}`} onClick={() => setScenario(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[286px] p-6 sm:p-7">
        {result ? (
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.16em] text-[var(--muted)]">request</p>
                <p className="mt-1 font-mono text-xs">{result.requestId}</p>
              </div>
              <span className={`outcome outcome-${result.outcome}`}>{result.outcome} · {result.duration}ms</span>
            </div>
            <ol className="space-y-1">
              {result.events.map((event, index) => (
                <li key={`${event.label}-${index}`} className="timeline-row">
                  <span className="timeline-icon">
                    {event.status === "complete" ? <CheckCircle2 size={15} /> : event.status === "failed" ? <XCircle size={15} /> : <Circle size={15} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{event.label}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--muted)]">{event.phase} scope</span>
                  </span>
                  <span className="font-mono text-[10px] text-[var(--muted)]">+{event.at}ms</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="flex min-h-[238px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line-strong)] bg-black/[.08] text-center">
            <RotateCcw size={20} className="text-blue-400" />
            <p className="mt-4 text-sm font-medium">Choose an outcome and run the request.</p>
            <p className="mt-2 max-w-xs text-xs leading-5 text-[var(--muted)]">The API models Handler Scope, Delivery Scope, cleanup, and terminal state.</p>
          </div>
        )}
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--line)] px-6 py-4 sm:px-7">
        <span className="font-mono text-[10px] uppercase tracking-[.15em] text-[var(--muted)]">POST /api/lifecycle</span>
        <button type="button" className="primary-button h-9 px-4 text-xs" onClick={run} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Run request
        </button>
      </div>
    </div>
  );
}
