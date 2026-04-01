import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-guard";
import { getScraperRunsFromDB } from "@/lib/queries";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  try {
    const runs = await getScraperRunsFromDB();
    return NextResponse.json(runs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
