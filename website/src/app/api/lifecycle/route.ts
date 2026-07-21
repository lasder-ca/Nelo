import { NextResponse } from "next/server";

const scenarios = ["success", "disconnect", "failure"] as const;
type Scenario = (typeof scenarios)[number];

function isScenario(value: unknown): value is Scenario {
  return typeof value === "string" && scenarios.includes(value as Scenario);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const scenario = typeof body === "object" && body !== null && "scenario" in body
    ? (body as { scenario?: unknown }).scenario
    : undefined;
  if (!isScenario(scenario)) {
    return NextResponse.json({ error: "scenario must be success, disconnect, or failure." }, { status: 400 });
  }

  const base = [
    { phase: "handler", label: "route matched", status: "complete", at: 1 },
    { phase: "handler", label: "user task settled", status: "complete", at: 8 },
    { phase: "handler", label: "handler scope closed", status: "complete", at: 12 },
    { phase: "delivery", label: "response body started", status: "complete", at: 14 },
  ] as const;

  const terminal = scenario === "success"
    ? [
        { phase: "delivery", label: "producer task settled", status: "complete", at: 28 },
        { phase: "delivery", label: "resources released (LIFO)", status: "complete", at: 31 },
      ]
    : scenario === "disconnect"
      ? [
          { phase: "delivery", label: "client disconnect propagated", status: "cancelled", at: 22 },
          { phase: "delivery", label: "resources released (LIFO)", status: "complete", at: 25 },
        ]
      : [
          { phase: "delivery", label: "producer task failed", status: "failed", at: 19 },
          { phase: "delivery", label: "cleanup completed", status: "complete", at: 23 },
        ];

  return NextResponse.json({
    requestId: crypto.randomUUID().slice(0, 8),
    scenario,
    outcome: scenario === "success" ? "completed" : scenario === "disconnect" ? "aborted" : "failed",
    duration: terminal.at(-1)?.at ?? 0,
    events: [...base, ...terminal],
  });
}
