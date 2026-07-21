import { ArrowDown, Check, Radio, ShieldCheck } from "lucide-react";
import { brandAssets } from "@/lib/brand";

export function OwnershipMap() {
  return (
    <div className="bento-card bento-card-wide relative overflow-hidden p-6 sm:p-8">
      <div className="absolute -right-10 -top-12 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
        <div>
          <p className="eyebrow">The ownership model</p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-.035em]">One request.<br />Two explicit lifetimes.</h3>
          <p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">
            The handler can return while the response body is still delivering. Nelo keeps those boundaries separate without losing cancellation or cleanup.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Await", "Cancel", "Release", "Transfer"].map((item) => <span key={item} className="mini-chip"><Check size={11} /> {item}</span>)}
          </div>
        </div>

        <div className="lifetime-map">
          <div className="lifetime-line" />
          <div className="scope-card scope-handler">
            <span className="scope-icon"><ShieldCheck size={17} /></span>
            <div><p className="scope-label">Handler Scope</p><p className="scope-code">middleware · fork() · use()</p></div>
            <span className="scope-status">settled</span>
          </div>
          <ArrowDown className="mx-auto my-2 text-blue-400/60" size={18} />
          <div className="scope-card scope-delivery">
            <span className="scope-icon"><Radio size={17} /></span>
            <div><p className="scope-label">Delivery Scope</p><p className="scope-code">Response.body · delivery.fork()</p></div>
            <span className="scope-status scope-live">streaming</span>
          </div>
          <div className="absolute -bottom-8 -right-5 hidden rotate-6 sm:block">
            <img src={brandAssets.icon} alt="" width={84} height={84} className="rounded-[24px] opacity-35 grayscale" />
          </div>
        </div>
      </div>
    </div>
  );
}
