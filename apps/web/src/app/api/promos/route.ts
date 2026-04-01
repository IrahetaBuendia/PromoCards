import { NextRequest, NextResponse } from "next/server";
import { getPromos } from "@/lib/queries";
import type { CategoryId, BankId } from "@promocards/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as CategoryId | null;
  const bank = searchParams.get("bank") as BankId | null;

  try {
    const promos = await getPromos({
      categoryId: category ?? undefined,
      bankId: bank ?? undefined,
    });
    return NextResponse.json(promos);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
