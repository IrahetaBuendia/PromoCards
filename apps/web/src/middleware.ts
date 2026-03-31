import { type NextRequest, NextResponse } from "next/server";

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // TODO: validar sesión de Supabase Auth (implementar con @supabase/ssr)
  // Por ahora deja pasar — se reforzará al integrar Supabase
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
