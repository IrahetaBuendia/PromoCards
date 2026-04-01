import { Router, type IRouter } from "express";
import { createClient } from "@supabase/supabase-js";
import { CATEGORY_ORDER } from "@promocards/types";
import type { CategoryId } from "@promocards/types";

export const promosRouter: IRouter = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): ReturnType<typeof createClient<any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/promos — lista de promos activas, ordenadas por categoría
promosRouter.get("/", async (req, res) => {
  const { category, bank } = req.query;

  let query = getSupabase()
    .from("promos")
    .select("*")
    .eq("is_active", true)
    .order("expires_at", { ascending: true });

  if (typeof category === "string") {
    query = query.eq("category_id", category);
  }
  if (typeof bank === "string") {
    query = query.eq("bank_id", bank);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Ordenar por categoría según el orden fijo
  const sorted = (data ?? []).sort(
    (a, b) =>
      (CATEGORY_ORDER[a.category_id as CategoryId] ?? 99) -
      (CATEGORY_ORDER[b.category_id as CategoryId] ?? 99)
  );

  res.json(sorted);
});

// GET /api/promos/metrics — métricas del dashboard
promosRouter.get("/metrics", async (_req, res) => {
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [{ count: total }, { data: bestDiscount }, { count: expiringThisWeek }] =
    await Promise.all([
      getSupabase()
        .from("promos")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      getSupabase()
        .from("promos")
        .select("discount_value")
        .eq("is_active", true)
        .eq("discount_type", "percentage")
        .order("discount_value", { ascending: false })
        .limit(1),
      getSupabase()
        .from("promos")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .lte("expires_at", oneWeekFromNow.toISOString()),
    ]);

  res.json({
    totalActivePromos: total ?? 0,
    bestDiscountToday: bestDiscount?.[0]?.discount_value ?? null,
    expiringThisWeek: expiringThisWeek ?? 0,
  });
});
