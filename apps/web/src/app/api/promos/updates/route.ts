import { NextResponse } from "next/server";
import { getBankUpdates } from "@/lib/queries";

const headers = { "Access-Control-Allow-Origin": "*" };
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getBankUpdates(), { headers });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar la actualización de las fuentes." }, { status: 500, headers });
  }
}
