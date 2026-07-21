"use client";

import { useState } from "react";
import { codeExamples } from "@/lib/content";
import { CodeBlock } from "@/components/code-block";

export function CodeShowcase() {
  const [activeId, setActiveId] = useState<(typeof codeExamples)[number]["id"]>("owned");
  const active = codeExamples.find((example) => example.id === activeId) ?? codeExamples[0];

  return (
    <div className="mt-10 grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
      <div className="glass-panel p-2">
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
          {codeExamples.map((example, index) => (
            <button key={example.id} type="button" onClick={() => setActiveId(example.id)} className={`code-tab ${activeId === example.id ? "code-tab-active" : ""}`}>
              <span className="font-mono text-[10px] text-current/50">0{index + 1}</span>
              <span>{example.label}</span>
            </button>
          ))}
        </div>
        <div className="hidden px-5 pb-5 pt-8 lg:block">
          <p className="text-xl font-semibold leading-tight">{active.title}</p>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{active.description}</p>
        </div>
      </div>
      <CodeBlock code={active.code} filename={active.filename} />
      <div className="glass-panel p-5 lg:hidden">
        <p className="text-lg font-semibold">{active.title}</p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{active.description}</p>
      </div>
    </div>
  );
}
