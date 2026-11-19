import type { BankId, CardPreferences, CardType, Promo, PromoDetails } from "./index";

const TIME_ZONE = "America/El_Salvador";
const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DAY_NAMES = DAYS.map(normalize);
const EXCLUDED_WEEKEND = /\bno (?:aplica|es valid[oa]) (?:los )?fines? de semana\b/;
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: TIME_ZONE });
const date = new Intl.DateTimeFormat("es-SV", { dateStyle: "medium", timeZone: TIME_ZONE });
const calendar = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "numeric", day: "numeric", timeZone: TIME_ZONE });

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function inferExtraCategory(value: string): "belleza" | "salud" | "regalos" | undefined {
  const text = normalize(value);
  if (/\b(?:spa|salon|belleza|capilares?|manicura|masajes?|estetica|barberia)\b/.test(text)) return "belleza";
  if (/\b(?:salud|clinica|dentales?|odontologia|laboratorio|opticas?|oftalmologia)\b/.test(text)) return "salud";
  if (/\b(?:floristerias?|florerias?|arreglos florales|ramos de flores|regalos|gift cards?)\b/.test(text)) return "regalos";
}

export function getDayInElSalvador(now = new Date()): number {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday.format(now));
}

export function formatPromoDate(value: string): string {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? date.format(parsed) : "";
}

export function daysToPromoExpiry(value: string, now = new Date()): number {
  const expires = new Date(value);
  if (!Number.isFinite(expires.getTime())) return Infinity;
  const dayIndex = (instant: Date) => {
    const parts = calendar.formatToParts(instant);
    const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value);
    return Date.UTC(part("year"), part("month") - 1, part("day")) / 86_400_000;
  };
  return dayIndex(expires) - dayIndex(now);
}

function inferWeekdays(text: string): number[] | undefined {
  if (/\b(?:todos los dias|lunes a domingo)\b/.test(text)) return [0, 1, 2, 3, 4, 5, 6];
  const range = text.match(new RegExp(`\\b(${DAY_NAMES.join("|")})\\s+(?:al?|hasta)\\s+(?:el\\s+)?(${DAY_NAMES.join("|")})\\b`));
  if (range) {
    const first = DAY_NAMES.indexOf(range[1]);
    const last = DAY_NAMES.indexOf(range[2]);
    return Array.from({ length: ((last - first + 7) % 7) + 1 }, (_, i) => (first + i) % 7);
  }
  if (/\b(?:fines? de semana)\b/.test(text)) return [0, 6];
  const schedule = text.match(/\b(?:todos los|valida? los|valid[oa]s? los|aplica los|solo los|exclusivamente los)\s+([^.;\n]+)/)?.[1];
  if (!schedule) return;
  const selected = DAY_NAMES.flatMap((name, index) =>
    new RegExp(`\\b${name}s?\\b`).test(schedule) ? [index] : [],
  );
  return selected.length ? selected : undefined;
}

export function getPromoDetails(promo: Pick<Promo, "title" | "description" | "details">): PromoDetails {
  const summary = `${promo.title}\n${promo.description ?? ""}\n${promo.details?.conditions ?? ""}`;
  const text = normalize(summary);
  const mentions = text.match(/\btarjetas? (?:de )?(?:credito|debito)(?: (?:y|o) (?:de )?(?:credito|debito))?/g)?.join(" ") ?? "";
  const credit = mentions.includes("credito");
  const debit = mentions.includes("debito");
  const cardTypes: CardType[] = [];
  if (credit) cardTypes.push("credit");
  if (debit) cardTypes.push("debit");
  return {
    ...(cardTypes.length > 0 && {
      eligibleCards: credit && debit ? "Tarjetas de crédito y débito" : credit ? "Tarjetas de crédito" : "Tarjetas de débito",
      cardTypes,
    }),
    weekdays: inferWeekdays(text.replace(EXCLUDED_WEEKEND, "")),
    ...(EXCLUDED_WEEKEND.test(text) && { excludedWeekdays: [0, 6] }),
    requiresCoupon: /\b(?:compra|comprar|adquiere|adquirir)[^.\n]{0,35}\bcupon\b/.test(text),
    requiresReport: /\b(?:reporta(?:r|ndo)?|report[eé]|reporte)\s+(?:(?:la|tu|su)\s+)?compra\b/.test(text) &&
      !/\b(?:no (?:necesitas|debes|requiere)|sin) (?:de )?reportar\b/.test(text),
    ...promo.details,
  };
}

export function matchesMyCards(promo: Promo, banks: BankId[], types: CardPreferences): boolean {
  if (!banks.includes(promo.bankId)) return false;
  const chosen = types[promo.bankId];
  const accepted = getPromoDetails(promo).cardTypes;
  return !chosen || !accepted?.length || accepted.includes(chosen);
}

export function isPromoValidToday(promo: Promo, now = new Date()): boolean {
  const details = getPromoDetails(promo);
  if (details.startsAt && Date.parse(details.startsAt) > now.getTime()) return false;
  if (promo.expiresAt && Date.parse(promo.expiresAt) < now.getTime()) return false;
  const day = getDayInElSalvador(now);
  if (details.excludedWeekdays?.includes(day)) return false;
  if (details.weekdays?.length) return details.weekdays.includes(day);
  return Boolean(details.permanent || (details.startsAt && promo.expiresAt));
}

export function promoTerms(promo: Promo): Array<{ label: string; value: string }> {
  const details = getPromoDetails(promo);
  return [
    ...(details.eligibleCards ? [{ label: "Tarjetas", value: details.eligibleCards }] : []),
    ...(details.weekdays?.length ? [{ label: "Días", value: details.weekdays.map((day) => DAYS[day]).filter(Boolean).join(", ") }] : []),
    ...(details.excludedWeekdays?.length ? [{ label: "Días excluidos", value: details.excludedWeekdays.map((day) => DAYS[day]).filter(Boolean).join(", ") }] : []),
    ...(details.startsAt ? [{ label: "Desde", value: formatPromoDate(details.startsAt) }] : []),
    { label: "Vigencia", value: promo.expiresAt ? `Hasta el ${formatPromoDate(promo.expiresAt)}` :
      details.permanent ? "Oferta permanente" : "Vigencia sin confirmar" },
    ...(details.requiresCoupon ? [{ label: "Cupón", value: "Requiere comprar un cupón" }] : []),
    ...(details.requiresReport ? [{ label: "Compra", value: "Debes reportar tu compra" }] : []),
    ...(details.redeemFrom || details.redeemUntil ? [{
      label: "Canje del cupón",
      value: [details.redeemFrom && `Desde el ${formatPromoDate(details.redeemFrom)}`,
        details.redeemUntil && `hasta el ${formatPromoDate(details.redeemUntil)}`].filter(Boolean).join(" "),
    }] : []),
  ].filter((term) => term.value);
}
