import { NextResponse } from "next/server";
import { createClient } from "./server";

type GuardResult =
  | { authorized: true; userId: string }
  | { authorized: false; response: NextResponse };

/**
 * Verifica que la request tenga una sesión activa de Supabase (vía cookies).
 * Usar en Route Handlers de rutas protegidas.
 */
export async function requireAuth(): Promise<GuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "No autorizado." }, { status: 401 }),
    };
  }

  return { authorized: true, userId: user.id };
}
