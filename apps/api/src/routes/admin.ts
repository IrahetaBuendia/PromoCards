import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { runScraper, runAllScrapers } from "../scrapers";
import type { BankId } from "@promocards/types";

export const adminRouter = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// TODO: middleware de autenticación/autorización (rol admin o editor)

// GET /api/admin/scraper-runs — historial de ejecuciones
adminRouter.get("/scraper-runs", async (_req, res) => {
  const { data, error } = await supabase
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

  const { data, error } = await supabase
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
