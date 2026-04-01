import dotenv from "dotenv";
import { join } from "path";
dotenv.config({ path: join(process.cwd(), "../../.env") });

import { runAllScrapers } from "./scrapers";

runAllScrapers().then(() => {
  console.log("✓ Todos los scrapers completados");
  process.exit(0);
});
