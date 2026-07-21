import { roadmap } from "@/lib/content";

export function Roadmap() {
  return (
    <section id="roadmap" className="section-shell section-block roadmap-section">
      <div className="section-index">05 / Roadmap</div>
      <div className="section-content">
        <div className="section-intro compact-intro">
          <p className="eyebrow">Built in phases</p>
          <h2>Claims backed by tests.</h2>
          <p>Phase 4 completes the Handler and Delivery lifetime split. The next work is runtime-specific.</p>
        </div>
        <div className="roadmap-list">
          {roadmap.map((item) => (
            <article key={item.phase} className={item.status === "Planned" ? "planned" : ""}>
              <span>{item.phase}</span>
              <div><h3>{item.title}</h3><p>{item.detail}</p></div>
              <small>{item.status}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
