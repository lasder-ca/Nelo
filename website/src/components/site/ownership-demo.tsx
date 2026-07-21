import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"

const keyword = "text-[#c58cff]"
const type = "text-[#8cb7ff]"
const string = "text-[#8bd5b5]"
const punctuation = "text-[#c9d4e6]"
const plain = "text-[#d6dfec]"

export function OwnershipDemo() {
  return (
    <Card className="relative isolate overflow-hidden rounded-[2rem] border-white/15 bg-[#0a0f19] p-0 shadow-2xl shadow-black/45 [filter:none] [transform:none]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_8%,rgba(92,119,220,.18),transparent_34%),radial-gradient(circle_at_8%_78%,rgba(111,77,176,.14),transparent_32%)]" />

      <div className="relative flex items-center justify-between border-b border-white/8 px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78859b] sm:px-6">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-[#5f6c80]" />
          <span className="size-1.5 rounded-full bg-[#5f6c80]" />
          <span className="size-1.5 rounded-full bg-[#5f6c80]" />
        </div>
        <span className="normal-case tracking-normal text-[#758197]">app.ts</span>
        <span>Handler scope</span>
      </div>

      <div className="relative px-4 py-5 sm:px-7 sm:py-7">
        <pre className="overflow-x-auto subpixel-antialiased [filter:none] [font-synthesis:none] [text-rendering:geometricPrecision]">
          <code className="block min-w-[32rem] font-mono text-[10px] leading-[1.72] sm:min-w-0 sm:text-[11px] lg:text-[12px]">
            <CodeLine>
              <Token className={keyword}>import</Token>
              <Token className={punctuation}> {"{ "}</Token>
              <Token className={type}>Nelo</Token>
              <Token className={punctuation}>{" } "}</Token>
              <Token className={keyword}>from</Token>
              <Token className={string}> &quot;nelo&quot;</Token>
              <Token className={punctuation}>;</Token>
            </CodeLine>
            <CodeLine />
            <CodeLine>
              <Token className={keyword}>const</Token>
              <Token className={plain}> app </Token>
              <Token className={punctuation}>= </Token>
              <Token className={keyword}>new</Token>
              <Token className={type}> Nelo</Token>
              <Token className={punctuation}>();</Token>
            </CodeLine>
            <CodeLine />
            <CodeLine>
              <Token className={plain}>app</Token>
              <Token className={punctuation}>.</Token>
              <Token className={type}>get</Token>
              <Token className={punctuation}>(</Token>
              <Token className={string}>&quot;/users/:id&quot;</Token>
              <Token className={punctuation}>, </Token>
              <Token className={keyword}>async</Token>
              <Token className={punctuation}> (</Token>
              <Token className={plain}>context</Token>
              <Token className={punctuation}>{") => {"}</Token>
            </CodeLine>
            <CodeLine indent={1}>
              <Token className={keyword}>const</Token>
              <Token className={plain}> user </Token>
              <Token className={punctuation}>= </Token>
              <Token className={plain}>context</Token>
              <Token className={punctuation}>.</Token>
              <Token className={type}>fork</Token>
              <Token className={punctuation}>(</Token>
              <Token className={string}>&quot;user&quot;</Token>
              <Token className={punctuation}>, (</Token>
              <Token className={plain}>signal</Token>
              <Token className={punctuation}>{") =>"}</Token>
            </CodeLine>
            <CodeLine indent={2}>
              <Token className={plain}>fetchUser</Token>
              <Token className={punctuation}>(</Token>
              <Token className={plain}>context.params.id</Token>
              <Token className={punctuation}>, {"{ "}</Token>
              <Token className={plain}>signal</Token>
              <Token className={punctuation}>{" })"}</Token>
            </CodeLine>
            <CodeLine indent={1}>
              <Token className={punctuation}>);</Token>
            </CodeLine>
            <CodeLine />
            <CodeLine indent={1}>
              <Token className={keyword}>const</Token>
              <Token className={plain}> feed </Token>
              <Token className={punctuation}>= </Token>
              <Token className={plain}>context</Token>
              <Token className={punctuation}>.</Token>
              <Token className={type}>fork</Token>
              <Token className={punctuation}>(</Token>
              <Token className={string}>&quot;feed&quot;</Token>
              <Token className={punctuation}>, (</Token>
              <Token className={plain}>signal</Token>
              <Token className={punctuation}>{") =>"}</Token>
            </CodeLine>
            <CodeLine indent={2} highlighted>
              <Token className={plain}>fetchFeed</Token>
              <Token className={punctuation}>(</Token>
              <Token className={plain}>context.params.id</Token>
              <Token className={punctuation}>, {"{ "}</Token>
              <Token className={plain}>signal</Token>
              <Token className={punctuation}>{" })"}</Token>
            </CodeLine>
            <CodeLine indent={1}>
              <Token className={punctuation}>);</Token>
            </CodeLine>
            <CodeLine />
            <CodeLine indent={1}>
              <Token className={keyword}>return</Token>
              <Token className={plain}> context</Token>
              <Token className={punctuation}>.</Token>
              <Token className={type}>json</Token>
              <Token className={punctuation}>({"{"}</Token>
            </CodeLine>
            <CodeLine indent={2}>
              <Token className={plain}>user</Token>
              <Token className={punctuation}>: </Token>
              <Token className={keyword}>await</Token>
              <Token className={plain}> user,</Token>
            </CodeLine>
            <CodeLine indent={2}>
              <Token className={plain}>feed</Token>
              <Token className={punctuation}>: </Token>
              <Token className={keyword}>await</Token>
              <Token className={plain}> feed,</Token>
            </CodeLine>
            <CodeLine indent={1}>
              <Token className={punctuation}>{"});"}</Token>
            </CodeLine>
            <CodeLine>
              <Token className={punctuation}>{"});"}</Token>
            </CodeLine>
          </code>
        </pre>
      </div>

      <div className="relative grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-3 border-t border-white/8 px-5 py-3.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#758197] sm:px-6">
        <span>Request</span>
        <span className="h-px bg-gradient-to-r from-[#617092] to-[#36425a]" />
        <span>Handler</span>
        <span className="h-px bg-gradient-to-r from-[#53698e] to-[#42577b]" />
        <span>Delivery</span>
      </div>
    </Card>
  )
}

function CodeLine({
  children,
  highlighted = false,
  indent = 0,
}: {
  children?: ReactNode
  highlighted?: boolean
  indent?: number
}) {
  return (
    <span
      className={
        highlighted
          ? "-mx-4 block min-h-[1.72em] border-l border-[#6b86d8] bg-[#263556]/70 px-4"
          : "block min-h-[1.72em]"
      }
    >
      {indent > 0 ? "  ".repeat(indent) : null}
      {children}
    </span>
  )
}

function Token({ children, className }: { children: ReactNode; className: string }) {
  return <span className={className}>{children}</span>
}
