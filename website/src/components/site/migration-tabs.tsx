"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const examples = {
  task: { before: `const report = buildReport()\nreturn Response.json(await report)`, after: `const report = context.fork(\n  "report",\n  (signal) => buildReport({ signal }),\n)\nreturn context.json(await report)`, note: "The request owns the promise and sends it the same AbortSignal." },
  resource: { before: `const db = await database.connect()\ntry {\n  return await query(db)\n} finally {\n  await db.close()\n}`, after: `const db = await context.use(\n  "database",\n  (signal) => database.connect({ signal }),\n  (resource) => resource.close(),\n)\nreturn query(db)`, note: "Acquisition and cleanup stay together. Cleanup runs once in reverse order." },
  stream: { before: `const file = await openFile()\nreturn new Response(file.stream())`, after: `const file = await openFile()\ncontext.delivery.use(() => file.close())\nreturn new Response(file.stream())`, note: "The resource stays alive until body delivery actually ends." }
}

export function MigrationTabs() {
  return <Tabs defaultValue="task" className="gap-5"><TabsList className="w-full justify-start overflow-x-auto bg-black/20"><TabsTrigger value="task">Task</TabsTrigger><TabsTrigger value="resource">Resource</TabsTrigger><TabsTrigger value="stream">Stream</TabsTrigger></TabsList>{Object.entries(examples).map(([key, value]) => <TabsContent key={key} value={key}><div className="overflow-hidden rounded-2xl border border-white/10 bg-[#080d16]"><div className="grid md:grid-cols-2"><CodePane label="Before" code={value.before} muted /><CodePane label="With Nelo" code={value.after} /></div><p className="border-t border-white/8 px-5 py-4 text-sm text-muted-foreground"><span className="mr-2 text-emerald-300">What changed</span>{value.note}</p></div></TabsContent>)}</Tabs>
}
function CodePane({ label, code, muted = false }: { label: string; code: string; muted?: boolean }) { return <section className="min-w-0 border-white/8 first:border-b md:first:border-b-0 md:first:border-r"><div className="border-b border-white/8 px-5 py-3 text-xs text-muted-foreground">{label}</div><pre className={`min-h-56 overflow-auto p-5 text-[12px] leading-7 ${muted ? "text-slate-500" : "text-slate-200"}`}><code>{code}</code></pre></section> }
