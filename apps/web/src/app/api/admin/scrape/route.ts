import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { logScraperTrigger } from "@/lib/queries";
import type { BankId } from "@promocards/types";

/**
 * Dispara un workflow de GitHub Actions para correr los scrapers.
 * Requiere las variables de entorno: GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = await request.json().catch(() => ({})) as { bankId?: BankId };
  const bankId = body.bankId ?? null;

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const pat = process.env.GITHUB_PAT;

  if (!owner || !repo || !pat) {
    return NextResponse.json(
      { error: "Scrape manual no configurado. Agrega GITHUB_PAT, GITHUB_OWNER y GITHUB_REPO." },
      { status: 503 }
    );
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/scraper.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: { bank_id: bankId ?? "" },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return NextResponse.json(
      { error: `Error al disparar workflow: ${response.status} ${text}` },
      { status: 500 }
    );
  }

  // Registrar quién disparó el scrape
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await logScraperTrigger({
      userId: user.id,
      userEmail: user.email ?? "",
      userName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      bankId: bankId,
    });
  }

  return NextResponse.json({
    message: bankId
      ? `Scrape de ${bankId} iniciado en GitHub Actions`
      : "Scrape de todos los bancos iniciado en GitHub Actions",
  });
}
