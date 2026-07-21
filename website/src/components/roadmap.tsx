import { roadmap } from "@/lib/content";

export function Roadmap() {
  return (
    <section id="roadmap" className="section-shell py-24 sm:py-32">
      <div className="section-heading">
        <div><p className="eyebrow">Roadmap</p><h2>Built in phases.<br />Claimed with evidence.</h2></div>
        <p>Phase 4 completes the Handler and Delivery lifetime split. The next work is runtime-specific rather than a rewrite of the ownership core.</p>
      </div>
      <div className="mt-12 grid gap-3 lg:grid-cols-5">
        {roadmap.map((item) => (
          <article key={item.phase} className={`roadmap-card ${item.status === "Planned" ? "roadmap-planned" : ""}`}>
            <div className="flex items-center justify-between"><span className="roadmap-number">{item.phase}</span><span className="roadmap-status">{item.status}</span></div>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
