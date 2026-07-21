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
    <div className="runtime-panel">
      <div className="runtime-heading">
        <div><p className="eyebrow">Runtime capabilities</p><h2>Portable core. Honest adapters.</h2></div>
        <p>Support is shown only after real transport behavior and tests exist.</p>
      </div>
      <div className="runtime-table-wrap">
        <table className="runtime-table">
          <thead>
            <tr>
              <th>Capability</th>
              {["Core", "Node.js", "Cloudflare", "Deno", "Bun"].map((runtime) => <th key={runtime}>{runtime}</th>)}
            </tr>
          </thead>
          <tbody>
            {runtimeRows.map((row) => (
              <tr key={row[0]}>
                <td>{row[0]}</td>
                {row.slice(1).map((value, index) => <td key={`${row[0]}-${index}`}><Status value={value} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
