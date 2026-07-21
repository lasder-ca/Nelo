import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
export default function NotFound() { return <main className="mx-auto grid min-h-[70svh] max-w-3xl place-items-center px-5 text-center"><div><p className="font-mono text-sm text-emerald-300">404 / request_not_found</p><h1 className="mt-5 text-6xl font-semibold tracking-tight">This route owns nothing.</h1><p className="mt-5 text-muted-foreground">The request ended exactly where it should.</p><Button asChild className="mt-8"><Link href="/"><ArrowLeft />Back home</Link></Button></div></main> }
