"use client";

import { useRef, useState } from "react";
import { Braces, CircleStop, Database, Play, Radio } from "lucide-react";

const scenarios = [
  {
    id: "health",
    label: "Health",
    description: "Run a request through Nelo and inspect the runtime.",
    icon: Braces,
  },
  {
    id: "tasks",
    label: "Owned tasks",
    description: "Start two named tasks and join both before the request settles.",
    icon: CircleStop,
  },
  {
    id: "resource",
    label: "Resource",
    description: "Acquire a scoped resource and observe its cleanup event.",
    icon: Database,
  },
  {
    id: "delivery",
    label: "Delivery",
    description: "Stream NDJSON while Nelo owns the response delivery lifetime.",
    icon: Radio,
  },
] as const;

type Scenario = (typeof scenarios)[number]["id"];

type RunState = "idle" | "running" | "success" | "error" | "cancelled";

export function NeloLiveLab() {
  const [scenario, setScenario] = useState<Scenario>("tasks");
  const [delay, setDelay] = useState(350);
  const [state, setState] = useState<RunState>("idle");
  const [output, setOutput] = useState("Choose a scenario and run the live API.");
  const controllerRef = useRef<AbortController | null>(null);

  const selected = scenarios.find((item) => item.id === scenario)!;

  async function run(): Promise<void> {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState("running");
    setOutput(JSON.stringify({ status: "running", scenario }, null, 2));

    try {
      const response = await fetch(buildUrl(scenario, delay), {
        headers: { accept: "application/json, application/x-ndjson" },
        signal: controller.signal,
        cache: "no-store",
      });

      if (scenario === "delivery") {
        await readStream(response);
      } else {
        const payload: unknown = await response.json();
        setOutput(
          JSON.stringify(
            {
              http: {
                status: response.status,
                serverTiming: response.headers.get("server-timing"),
                neloLab: response.headers.get("x-nelo-lab"),
              },
              payload,
            },
            null,
            2,
          ),
        );
      }

      setState(response.ok ? "success" : "error");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setState("cancelled");
        setOutput(JSON.stringify({ status: "cancelled", scenario }, null, 2));
      } else {
        setState("error");
        setOutput(
          JSON.stringify(
            {
              status: "failed",
              message: error instanceof Error ? error.message : String(error),
            },
            null,
            2,
          ),
        );
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }

  async function readStream(response: Response): Promise<void> {
    if (response.body === null) {
      throw new Error("The delivery response did not include a body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      setOutput(
        JSON.stringify(
          {
            http: {
              status: response.status,
              delivery: response.headers.get("x-nelo-delivery"),
              neloLab: response.headers.get("x-nelo-lab"),
            },
            stream: parseLines(text),
          },
          null,
          2,
        ),
      );
    }
  }

  function cancel(): void {
    controllerRef.current?.abort();
  }

  return (
    <section className="page-shell py-20" id="live-lab" aria-labelledby="live-lab-title">
      <div className="mb-8 grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <p className="eyebrow brand-kicker">Live Nelo API</p>
          <h2 className="brand-heading mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl" id="live-lab-title">
            Run the framework, not a mock.
          </h2>
        </div>
        <p className="m-0 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
          Every action calls <code>/api/nelo</code> on this deployment. The route creates a Nelo app,
          executes request-owned work, and returns lifecycle data from the real server runtime.
        </p>
      </div>

      <div className="glass-surface overflow-hidden rounded-[28px]">
        <div className="grid lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="border-b border-[var(--line)] p-5 lg:border-b-0 lg:border-r">
            <div className="grid grid-cols-2 gap-2">
              {scenarios.map((item) => {
                const Icon = item.icon;
                const active = item.id === scenario;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    disabled={state === "running"}
                    onClick={() => setScenario(item.id)}
                    className={`flex min-h-24 flex-col items-start justify-between rounded-2xl border p-3 text-left transition ${
                      active
                        ? "border-[var(--line-strong)] bg-[var(--surface-strong)] text-[var(--fg)]"
                        : "border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--fg)]"
                    }`}
                  >
                    <Icon size={17} />
                    <span className="text-xs font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-5 min-h-14 text-sm leading-6 text-[var(--muted)]">{selected.description}</p>

            {(scenario === "tasks" || scenario === "delivery") && (
              <label className="mt-5 grid gap-2 text-xs text-[var(--muted)]">
                Delay per operation
                <input
                  type="number"
                  min={scenario === "delivery" ? 20 : 10}
                  max={scenario === "delivery" ? 1000 : 3000}
                  value={delay}
                  disabled={state === "running"}
                  onChange={(event) => setDelay(Number(event.target.value))}
                  className="h-11 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 font-mono text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                />
              </label>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={run}
                disabled={state === "running"}
                className="glass-button primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play size={14} /> Run API
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={state !== "running"}
                className="glass-button secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                Abort
              </button>
            </div>

            <p className="mt-4 font-mono text-[11px] text-[var(--muted)]" aria-live="polite">
              {statusText(state)}
            </p>
          </div>

          <pre className="m-0 min-h-[440px] max-h-[620px] overflow-auto bg-[var(--code)] p-5 text-xs leading-6 text-slate-200 sm:p-7">
            <code>{output}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

function buildUrl(scenario: Scenario, delay: number): string {
  const params = new URLSearchParams({ scenario });
  if (scenario === "tasks" || scenario === "delivery") {
    params.set("delay", String(delay));
  }
  if (scenario === "delivery") {
    params.set("chunks", "5");
  }
  return `/api/nelo?${params.toString()}`;
}

function parseLines(value: string): unknown[] {
  return value
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as unknown;
      } catch {
        return line;
      }
    });
}

function statusText(state: RunState): string {
  switch (state) {
    case "running":
      return "Request running…";
    case "success":
      return "Request completed.";
    case "error":
      return "Request returned an error.";
    case "cancelled":
      return "Request aborted by the browser.";
    case "idle":
      return "Ready.";
  }
}
