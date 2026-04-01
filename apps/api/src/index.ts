import dotenv from "dotenv";
import { join } from "path";
dotenv.config({ path: join(process.cwd(), "../../.env") });

import express from "express";
import cors from "cors";
import { promosRouter } from "./routes/promos";
import { adminRouter } from "./routes/admin";
import { startScheduler } from "./scheduler";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.WEB_URL ?? "http://localhost:3000" }));
app.use(express.json());

// Rutas
app.use("/api/promos", promosRouter);
app.use("/api/admin", adminRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
  startScheduler();
});
