import { NextResponse } from "next/server";
import { getMetrics } from "@/lib/queries";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const metrics = await getMetrics();
    return NextResponse.json(metrics, { headers: CORS_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS });
  }
}
