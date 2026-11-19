import { NextResponse } from "next/server";
import { getPromo } from "@/lib/queries";

const headers = { "Access-Control-Allow-Origin": "*" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const promo = await getPromo(id);
    return promo ? NextResponse.json(promo, { headers }) :
      NextResponse.json({ error: "Promoción no disponible." }, { status: 404, headers });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar la promoción." }, { status: 500, headers });
  }
}
