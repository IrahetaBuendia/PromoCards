import type { BankId, CategoryId } from "./types";
import { CATEGORY_ORDER } from "./types";
export { CATEGORY_ICONS, CATEGORY_LABELS } from "./types";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://tu-dominio.vercel.app";

export const BANK_COLORS: Record<BankId, string> = {
  fedecredito: "#e30613",
  "banco-industrial": "#004b8d",
  credicomer: "#f7931e",
  "bac-credomatic": "#e31837",
  credisiman: "#009245",
  "banco-agricola": "#00843d",
  "banco-cuscatlan": "#01426a",
};

export const BANK_NAMES: Record<BankId, string> = {
  fedecredito: "Fedecrédito",
  "banco-industrial": "Banco Industrial",
  credicomer: "Credicomer",
  "bac-credomatic": "BAC Credomatic",
  credisiman: "Credisiman",
  "banco-agricola": "Banco Agrícola",
  "banco-cuscatlan": "Banco Cuscatlán",
};

export const SORTED_CATEGORIES = (
  Object.keys(CATEGORY_ORDER) as CategoryId[]
).sort((a, b) => CATEGORY_ORDER[a] - CATEGORY_ORDER[b]);

export const BANK_IDS: BankId[] = [
  "fedecredito",
  "banco-industrial",
  "credicomer",
  "bac-credomatic",
  "credisiman",
  "banco-agricola",
  "banco-cuscatlan",
];
