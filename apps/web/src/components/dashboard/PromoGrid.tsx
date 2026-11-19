"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BANK_NAMES, matchesMyCards, type BankId, type CardPreferences, type Promo } from "@promocards/types";
import { PromoCard } from "./PromoCard";
import { PromoModal } from "./PromoModal";

interface Props {
  promos: Promo[];
  search: string;
  userId?: string;
}

type Preferences = { banks: BankId[]; favorites: string[]; cardTypes: CardPreferences };
const emptyPreferences: Preferences = { banks: [], favorites: [], cardTypes: {} };

export function PromoGrid({ promos, search, userId }: Props) {
  const [selected, setSelected] = useState<Promo | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(emptyPreferences);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyMyCards, setOnlyMyCards] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const storageKey = `promocards:catalog:${userId ?? "guest"}`;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? "null") as Partial<Preferences> | null;
      setPreferences({
        banks: Array.isArray(stored?.banks) ? stored.banks.filter((bank) => Object.hasOwn(BANK_NAMES, bank)) : [],
        favorites: Array.isArray(stored?.favorites) ? stored.favorites.filter((id) => typeof id === "string") : [],
        cardTypes: stored?.cardTypes ?? {},
      });
    } catch {
      setPreferences(emptyPreferences);
    }
  }, [storageKey]);

  function save(next: Preferences) {
    setPreferences(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Las preferencias se conservan en la sesión si falla el almacenamiento.
    }
  }

  function changeSort(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "expiry") next.set("orden", value);
    else next.delete("orden");
    router.push(next.size ? `/?${next}` : "/", { scroll: false });
  }

  const { banks, favorites, cardTypes } = preferences;
  const visible = promos.filter((promo) =>
    (!onlyFavorites || favorites.includes(promo.id)) && (!onlyMyCards || matchesMyCards(promo, banks, cardTypes)),
  );
  if (!onlyMyCards && params.get("orden") !== "expiry" && banks.length > 0) {
    visible.sort((a, b) => Number(matchesMyCards(b, banks, cardTypes)) - Number(matchesMyCards(a, banks, cardTypes)));
  }
  const alternatives = [...new Set(search.split(/\s+/).filter((word) => word.length > 3))];

  return (
    <>
      <div className="flex flex-wrap items-start gap-2 text-sm">
        <details className="rounded-lg border border-gray-200 bg-white px-3 py-2">
          <summary className="cursor-pointer font-semibold">Mis tarjetas{banks.length > 0 && ` (${banks.length})`}</summary>
          <fieldset className="mt-2 grid gap-2">
            <legend className="mb-2 text-xs text-gray-600">Selecciona el banco y el tipo de tarjeta</legend>
            {(Object.keys(BANK_NAMES) as BankId[]).map((bank) => (
              <div key={bank} className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={banks.includes(bank)} onChange={(event) => {
                    const nextBanks = event.target.checked ? [...banks, bank] : banks.filter((id) => id !== bank);
                    save({ ...preferences, banks: nextBanks });
                    if (!nextBanks.length) setOnlyMyCards(false);
                  }} />
                  {BANK_NAMES[bank]}
                </label>
                {banks.includes(bank) && <select aria-label={`Tipo de tarjeta de ${BANK_NAMES[bank]}`}
                  value={cardTypes[bank] ?? "both"} onChange={(event) => {
                    const type = event.target.value;
                    save({ ...preferences, cardTypes: { ...cardTypes, [bank]: type === "credit" || type === "debit" ? type : undefined } });
                  }}>
                  <option value="both">Crédito y débito</option>
                  <option value="credit">Crédito</option>
                  <option value="debit">Débito</option>
                </select>}
              </div>
            ))}
          </fieldset>
        </details>
        {banks.length > 0 && <button type="button" aria-pressed={onlyMyCards} onClick={() => setOnlyMyCards(!onlyMyCards)}
          className={`rounded-lg border px-3 py-2 ${onlyMyCards ? "bg-gray-900 text-white" : "bg-white"}`}>Solo mis tarjetas</button>}
        <button type="button" aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites(!onlyFavorites)}
          className={`rounded-lg border px-3 py-2 ${onlyFavorites ? "bg-gray-900 text-white" : "bg-white"}`}>Favoritos</button>
        <label className="ml-auto flex items-center gap-2 rounded-lg border bg-white px-2 py-2">
          <span className="sr-only">Orden de promociones</span>
          <select value={params.get("orden") === "expiry" ? "expiry" : "relevance"} onChange={(event) => changeSort(event.target.value)}>
            <option value="relevance">Relevancia</option>
            <option value="expiry">Por vencimiento</option>
          </select>
        </label>
      </div>
      <p role="status" className="break-words text-sm text-gray-600">
        {visible.length} {visible.length === 1 ? "promoción" : "promociones"}{search && ` para «${search}»`}
      </p>
      {!visible.length && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm">
          <p className="font-semibold">{search ? "No encontramos promociones para esta búsqueda" : "No hay promociones con estos filtros"}</p>
          {onlyFavorites && <button type="button" onClick={() => setOnlyFavorites(false)} className="mt-3 underline">Ver todas las promociones</button>}
          {onlyMyCards && <button type="button" onClick={() => setOnlyMyCards(false)} className="mt-3 block underline">Incluir otros bancos</button>}
          {search && <div className="mt-3 flex flex-wrap gap-3">
            {alternatives.length > 1 && alternatives.map((word) => (
              <Link key={word} href={`/?${new URLSearchParams({ q: word })}`} className="underline">Buscar «{word}»</Link>
            ))}
            {(params.has("banco") || params.has("categoria") || params.has("hoy")) &&
              <Link href={`/?${new URLSearchParams({ q: search })}`} className="underline">Quitar filtros y mantener la búsqueda</Link>}
            <Link href="/" className="underline">Explorar todas las promociones</Link>
          </div>}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
        {visible.map((promo) => (
          <button
            key={promo.id}
            onClick={() => setSelected(promo)}
            className="text-left w-full focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-2xl"
          >
            <PromoCard promo={promo} />
          </button>
        ))}
      </div>

      {selected && (
        <PromoModal promo={selected} onClose={() => setSelected(null)}
          favorite={favorites.includes(selected.id)}
          onFavorite={() => save({
            ...preferences,
            favorites: favorites.includes(selected.id) ? favorites.filter((id) => id !== selected.id) : [...favorites, selected.id],
          })}
        />
      )}
    </>
  );
}
