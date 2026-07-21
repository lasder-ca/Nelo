import type { Metadata } from "next";
import { DocsShell } from "@/components/site/docs-shell";

export const metadata: Metadata = { title: "API reference" };

const groups = [
  {
    title: "Tasks",
    items: [
      ["context.fork(name, operation)", "Create a named child task owned by the current handler scope."],
      ["context.delivery.fork(name, operation)", "Create work that remains owned while the response body is delivered."],
    ],
  },
  {
    title: "Cancellation",
    items: [
      ["context.signal", "Cooperative AbortSignal shared with handler-owned work."],
      ["context.delivery.signal", "Signal tied to the delivery lifetime."],
      ["signal.reason", "The first typed abort reason retained for diagnostics."],
    ],
  },
  {
    title: "Resources",
    items: [
      ["context.use(name, acquire, cleanup)", "Acquire a handler-scoped resource and release it exactly once."],
      ["context.delivery.use(name, acquire, cleanup)", "Keep a resource alive until delivery closes."],
    ],
  },
] as const;

export default function ApiPage() {
  return (
    <DocsShell
      eyebrow="API reference"
      title="A small surface for explicit ownership."
      description="The core API is organized by lifetime rather than by adapter. Each operation states what owns the work and when it must stop."
    >
      <div className="api-reference">
        {groups.map((group) => (
          <section key={group.title}>
            <h2>{group.title}</h2>
            <div>
              {group.items.map(([signature, description]) => (
                <article key={signature}>
                  <code>{signature}</code>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DocsShell>
  );
}
