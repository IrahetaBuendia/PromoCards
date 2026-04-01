import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Ruta de callback para Supabase Auth.
 * Supabase redirige aquí tras confirmar email o login con OAuth.
 * Intercambia el `code` por una sesión activa y redirige al dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Si falla, redirigir a login con mensaje de error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
