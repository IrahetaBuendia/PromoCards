import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con service role key.
 * Solo para uso server-side (Route Handlers y Server Components).
 * Nunca exponer al browser.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: ReturnType<typeof createClient<any>> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getServiceClient(): ReturnType<typeof createClient<any>> {
  if (!_client) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _client = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _client;
}
