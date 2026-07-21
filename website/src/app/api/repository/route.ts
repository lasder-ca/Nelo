import { NextResponse } from "next/server";
import { getRepositorySnapshot } from "@/lib/github";

export const revalidate = 900;

export async function GET() {
  const repository = await getRepositorySnapshot();
  return NextResponse.json(repository, {
    headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
  });
}
