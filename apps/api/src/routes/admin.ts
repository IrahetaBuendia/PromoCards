import { Router, type Request, type Response, type NextFunction, type IRouter } from "express";
import { createClient } from "@supabase/supabase-js";
import { runScraper, runAllScrapers } from "../scrapers";
import type { BankId } from "@promocards/types";

export const adminRouter: IRouter = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): ReturnType<typeof createClient<any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Middleware de autenticación ─────────────────────────────────────────────
// Verifica el JWT de Supabase enviado en el header Authorization: Bearer <token>
async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No autorizado: token requerido." });
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();

  const { data: { user }, error } = await getSupabase().auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "No autorizado: token inválido o expirado." });
    return;
  }

  next();
}

// Aplicar middleware a todas las rutas admin
adminRouter.use(requireAuth);

// GET /api/admin/scraper-runs — historial de ejecuciones
adminRouter.get("/scraper-runs", async (_req, res) => {
  const { data, error } = await getSupabase()
    .from("scraper_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(100);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

// POST /api/admin/scrape — dispara un scrape manual
adminRouter.post("/scrape", async (req, res) => {
  const { bankId } = req.body as { bankId?: BankId };

  try {
    if (bankId) {
      await runScraper(bankId);
      res.json({ message: `Scrape de ${bankId} completado` });
    } else {
      // Corre todos en background para no bloquear la respuesta
      void runAllScrapers();
      res.json({ message: "Scrape de todos los bancos iniciado" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

// GET /api/admin/promos — todas las promos (activas e inactivas) para moderación
adminRouter.get("/promos", async (req, res) => {
  const { bank } = req.query;

  let query = getSupabase()
    .from("promos")
    .select("*")
    .order("updated_at", { ascending: false });

  if (typeof bank === "string") {
    query = query.eq("bank_id", bank);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data ?? []);
});

// PATCH /api/admin/promos/:id — moderar una promo (categoría, título, estado)
adminRouter.patch("/promos/:id", async (req, res) => {
  const { id } = req.params;
  const { categoryId, title, description, isActive } = req.body as {
    categoryId?: string;
    title?: string;
    description?: string;
    isActive?: boolean;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (categoryId !== undefined) updates.category_id = categoryId;
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (isActive !== undefined) updates.is_active = isActive;

  const { data, error } = await getSupabase()
    .from("promos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});
