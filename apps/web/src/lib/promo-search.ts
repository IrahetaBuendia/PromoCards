import type { Promo } from "@promocards/types";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function matchesOneEdit(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) return false;
  const first = [...left].findIndex((char, index) => char !== right[index]);
  if (first < 0) return true;
  if (left.length === right.length) {
    return left.slice(first + 1) === right.slice(first + 1) ||
      (left[first] === right[first + 1] && left[first + 1] === right[first] &&
        left.slice(first + 2) === right.slice(first + 2));
  }
  const [longer, shorter] = left.length > right.length ? [left, right] : [right, left];
  return longer.slice(first + 1) === shorter.slice(first);
}

function scoreText(term: string, field: string, weight: number): number {
  const words: string[] = normalize(field).match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.includes(term)) return weight + 2;
  if (words.some((word) => word.startsWith(term))) return weight + 1;
  if (term.length >= 3 && words.some((word) => word.includes(term))) return weight;
  if (term.length >= 5 && words.some((word) => matchesOneEdit(term, word))) return weight;
  return 0;
}

export function searchPromos(promos: Promo[], search: string): Promo[] {
  const terms = [...new Set(normalize(search.slice(0, 150)).match(/[\p{L}\p{N}]+/gu))];
  if (!terms.length) return promos;

  return promos.map((promo) => {
    const slug = promo.sourceUrl?.match(/^https:\/\/(?:www\.)?mipromo\.com\/sv\/deal\/\d+\/([^/?#]+)/i)?.[1];
    const scores = terms.map((term) => Math.max(
      scoreText(term, promo.details?.merchantName ?? slug ?? "", 8),
      scoreText(term, promo.title, 6),
      scoreText(term, promo.description ?? "", 1),
    ));
    return { promo, score: scores.every(Boolean) ? scores.reduce((sum, score) => sum + score, 0) : 0 };
  }).filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ promo }) => promo);
}
