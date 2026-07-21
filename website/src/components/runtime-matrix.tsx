import { Check, Minus } from "lucide-react";
import { runtimeRows } from "@/lib/content";

function Status({ value }: { value: string }) {
  if (value === "Supported") return <span className="matrix-supported"><Check size={13} /></span>;
  if (value === "Planned") return <span className="matrix-planned">Planned</span>;
  if (value === "Core") return <span className="matrix-core">Core</span>;
  return <span className="matrix-none"><Minus size={13} /></span>;
}

export function RuntimeMatrix() {
  return (
    <div className="bento-card bento-card-wide overflow-hidden p-0" id="runtimes">
      <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div><p className="eyebrow">Runtime capabilities</p><h3 className="mt-3 text-2xl font-semibold tracking-tight">Portable core. Honest adapters.</h3></div>
        <p className="max-w-md text-sm leading-6 text-[var(--muted)]">Support is documented only after real transport behavior and tests exist.</p>
      </div>
      <div className="overflow-x-auto border-t border-[var(--line)]">
        <table className="w-full min-w-[780px] text-left text-xs">
          <thead className="bg-black/[.12] text-[var(--muted)]">
            <tr>
              <th className="px-6 py-4 font-medium">Capability</th>
              {["Core", "Node.js", "Cloudflare", "Deno", "Bun"].map((runtime) => <th key={runtime} className="px-4 py-4 text-center font-medium">{runtime}</th>)}
            </tr>
          </thead>
          <tbody>
            {runtimeRows.map((row) => (
              <tr key={row[0]} className="border-t border-[var(--line)] transition-colors hover:bg-blue-400/[.025]">
                <td className="px-6 py-4 text-sm font-medium">{row[0]}</td>
                {row.slice(1).map((value, index) => <td key={`${row[0]}-${index}`} className="px-4 py-4 text-center"><Status value={value} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
