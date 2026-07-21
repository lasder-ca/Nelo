"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

const pattern = /(\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|from|const|new|async|await|return|if|else|try|catch|export|type|interface|readonly|extends|function|true|false|null|undefined)\b|\b(?:Request|Response|AbortSignal|Nelo|OwnedTask)\b|\b\d+\b)/g;

function isToken(token: string) {
  return token.startsWith("//") || /^["'`]/.test(token) || /^\d+$/.test(token) || /^(Request|Response|AbortSignal|Nelo|OwnedTask)$/.test(token) || /^(import|from|const|new|async|await|return|if|else|try|catch|export|type|interface|readonly|extends|function|true|false|null|undefined)$/.test(token);
}

function tokenClass(token: string) {
  if (token.startsWith("//")) return "code-comment";
  if (/^["'`]/.test(token)) return "code-string";
  if (/^\d+$/.test(token)) return "code-number";
  if (/^(Request|Response|AbortSignal|Nelo|OwnedTask)$/.test(token)) return "code-type";
  return "code-keyword";
}

export function CodeBlock({ code, filename, compact = false }: { code: string; filename: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="code-window">
      <div className="code-window-bar">
        <div className="flex gap-1.5" aria-hidden="true"><span /><span /><span /></div>
        <span className="truncate font-mono text-[10px] text-white/40">{filename}</span>
        <button type="button" onClick={copy} className="code-copy" aria-label="Copy code">
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
      <pre className={compact ? "code-content code-compact" : "code-content"}>
        <code>
          {code.split(pattern).map((token, index) =>
            isToken(token) ? <span key={`${index}-${token}`} className={tokenClass(token)}>{token}</span> : <span key={`${index}-${token}`}>{token}</span>,
          )}
        </code>
      </pre>
    </div>
  );
}
