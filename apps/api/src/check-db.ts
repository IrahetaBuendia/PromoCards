/**
 * check-db.ts — Consulta directamente Supabase y muestra las promos de un banco.
 * Uso: pnpm exec tsx src/check-db.ts banco-industrial
 */
import dotenv from "dotenv";
import { join } from "path";
dotenv.config({ path: join(process.cwd(), "../../.env") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BANK = process.argv[2] ?? "banco-industrial";

(async () => {
  const { data, error } = await supabase
    .from("promos")
    .select("id, title, category_id, is_active, expires_at, description, updated_at")
    .eq("bank_id", BANK)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }

  const active = data?.filter((p) => p.is_active) ?? [];
  const inactive = data?.filter((p) => !p.is_active) ?? [];

  console.log(`\n====== DB para ${BANK} ======`);
  console.log(`Total en DB: ${data?.length ?? 0} (${active.length} activas, ${inactive.length} inactivas)\n`);

  console.log("--- ACTIVAS ---");
  for (const p of active) {
    console.log(`  [${p.category_id.padEnd(14)}] "${p.title}"`);
    if (p.description) console.log(`               desc: "${p.description.substring(0, 100)}"`);
    console.log(`               updated: ${p.updated_at}`);
  }

  if (inactive.length > 0) {
    console.log("\n--- INACTIVAS (obsoletas) ---");
    for (const p of inactive) {
      console.log(`  [${p.category_id.padEnd(14)}] "${p.title}"`);
    }
  }

  process.exit(0);
})();
