import type { Promo } from "@promocards/types";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function searchPromos(promos: Promo[], search: string): Promo[] {
  const terms = normalize(search).match(/[\p{L}\p{N}]+/gu);
  if (!terms) return promos;

  return promos.filter((promo) => {
    const merchant = promo.sourceUrl.match(/^https:\/\/(?:www\.)?mipromo\.com\/sv\/deal\/\d+\/([^/?#]+)/i)?.[1];
    const text = normalize(`${promo.title} ${promo.description ?? ""} ${merchant ?? ""}`);
    return terms.every((term) => text.includes(term));
  });
}
