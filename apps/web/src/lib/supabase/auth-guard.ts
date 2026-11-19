import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isPromoCardsAdmin } from "@promocards/types";
import { createClient } from "./server";

type GuardResult =
  | { authorized: true; userId: string }
  | { authorized: false; response: NextResponse };

/**
 * Verifica que la request tenga una sesión activa de Supabase (vía cookies).
 * Usar en Route Handlers de rutas protegidas.
 */
export function isAdmin(user: Pick<User, "id" | "app_metadata">): boolean {
  return isPromoCardsAdmin(user, process.env.PROMOCARDS_ADMIN_USER_IDS);
}

export async function requireAdmin(): Promise<GuardResult> {
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

  if (!isAdmin(user)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Se requiere el rol de administrador." }, { status: 403 }),
    };
  }
  return { authorized: true, userId: user.id };
}
