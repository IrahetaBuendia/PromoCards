import type { BankId, CategoryId, DiscountType } from "@promocards/types";

export type ScraperFn = () => Promise<void>;

/**
 * Datos crudos extraídos por un scraper antes de normalizarse.
 */
export interface RawPromo {
  bankId: BankId;
  title: string;
  description: string | null;
  categoryId: CategoryId;
  discountType: DiscountType;
  discountValue: string;
  expiresAt: string | null;
  imageUrl: string | null;
  sourceUrl: string;
}

/**
 * Palabras clave para clasificar una promo en su categoría.
 * El orden importa: se evalúa de arriba hacia abajo y se usa el primero que hace match.
 * IMPORTANTE: streaming va antes de gasolina para evitar que "Disney+" caiga en gasolina.
 */
export const CATEGORY_KEYWORDS: Array<{ categoryId: CategoryId; keywords: string[] }> = [
  {
    // Streaming primero — evita que promos de Netflix/Disney caigan en gasolina
    categoryId: "streaming",
    keywords: [
      "netflix", "disney+", "disney plus", "disney", "hbo max", "hbo",
      "amazon prime", "prime video", "spotify", "youtube premium", "youtube",
      "streaming", "paramount", "apple tv", "entretenimiento digital",
      "plataforma digital", "plataformas de streaming",
      "plataformas de entretenimiento", "suscripcion digital", "suscripción digital",
    ],
  },
  {
    categoryId: "gasolina",
    keywords: [
      "gasolina", "gasolinera", "gasolineras", "combustible",
      "shell", "texaco", "puma energy", "puma pris",
      "estacion de servicio", "estación de servicio",
    ],
  },
  {
    categoryId: "supermercados",
    keywords: [
      "super selectos", "súper selectos",
      "walmart", "supermercado", "supermercados",
      "despensa de don juan", "maxi despensa",
      "la colonia",
    ],
  },
  {
    categoryId: "farmacias",
    keywords: [
      "farmacia", "farmacias", "similares",
      "san nicolás", "san nicolas", "farmacia san",
      "droguería", "droguerías", "medicamento",
    ],
  },
  {
    categoryId: "restaurantes",
    keywords: [
      "restaurante", "restaurant", "pizza", "burger", "pollo campero",
      "comida", "food", "café", "cafe", "sushi",
      "wendy", "mcdonald", "subway", "delivery", "pedidosya",
      "domino", "little caesars",
    ],
  },
];

export function detectCategory(text: string): CategoryId {
  const normalized = text.toLowerCase();
  for (const { categoryId, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      return categoryId;
    }
  }
  return "otros";
}

export function detectDiscountType(text: string): DiscountType {
  const normalized = text.toLowerCase();
  if (normalized.includes("2x1") || normalized.includes("2 por 1")) return "2x1";
  if (normalized.includes("cashback") || normalized.includes("reembolso")) return "cashback";
  if (/\d+\s*%/.test(normalized)) return "percentage";
  return "other";
}

export function extractDiscountValue(text: string): string {
  // Busca patrones como "30%", "2x1", "5% cashback"
  const percentMatch = text.match(/(\d+)\s*%/);
  if (percentMatch) return `${percentMatch[1]}%`;
  if (/2x1/i.test(text)) return "2x1";
  if (/cashback/i.test(text)) return "cashback";
  return "";
}

/**
 * Convierte fechas en español a ISO string.
 * Soporta formatos como "30 de marzo de 2026", "30/03/2026"
 */
const MESES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

export function parseSpanishDate(text: string): string | null {
  if (!text) return null;

  // Formato "30 de marzo de 2026" o "lunes 30 de marzo de 2026"
  const longMatch = text.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (longMatch) {
    const day = parseInt(longMatch[1]);
    const month = MESES[longMatch[2].toLowerCase()];
    const year = parseInt(longMatch[3]);
    if (month !== undefined) {
      return new Date(year, month, day).toISOString();
    }
  }

  // Formato "30/03/2026" o "30-03-2026"
  const shortMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (shortMatch) {
    const [, day, month, year] = shortMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString();
  }

  return null;
}
