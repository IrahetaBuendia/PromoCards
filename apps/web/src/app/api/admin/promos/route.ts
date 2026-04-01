import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-guard";
import { getAdminPromosFromDB } from "@/lib/queries";
import type { BankId } from "@promocards/types";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const bank = searchParams.get("bank") as BankId | null;

  try {
    const promos = await getAdminPromosFromDB(bank ?? undefined);
    return NextResponse.json(promos);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
