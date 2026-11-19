import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BANK_NAMES, type BankId, type CardPreferences, type CardType } from "./types";

type Preferences = { banks: BankId[]; favorites: string[]; cardTypes: CardPreferences };
const storageKey = "promocards:catalog";
const queryKey = [storageKey];
const empty: Preferences = { banks: [], favorites: [], cardTypes: {} };
let queue: Promise<unknown> = Promise.resolve();

async function readPreferences(): Promise<Preferences> {
  try {
    const stored = JSON.parse(await AsyncStorage.getItem(storageKey) ?? "null") as Partial<Preferences> | null;
    return {
      banks: Array.isArray(stored?.banks) ? stored.banks.filter((bank) => Object.hasOwn(BANK_NAMES, bank)) : [],
      favorites: Array.isArray(stored?.favorites) ? stored.favorites.filter((id) => typeof id === "string") : [],
      cardTypes: stored?.cardTypes ?? {},
    };
  } catch {
    return empty;
  }
}

export function usePromoPreferences() {
  const client = useQueryClient();
  const { data = empty } = useQuery({ queryKey, queryFn: readPreferences, staleTime: Infinity });

  function edit(update: (prefs: Preferences) => Preferences) {
    const operation = queue.then(async () => {
      await client.cancelQueries({ queryKey });
      const current = client.getQueryData<Preferences>(queryKey) ?? await readPreferences();
      const next = update(current);
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      client.setQueryData(queryKey, next);
    });
    queue = operation.catch(() => undefined);
    return operation;
  }

  return {
    ...data,
    toggleBank: (bank: BankId) => edit((prefs) => ({
      ...prefs,
      banks: prefs.banks.includes(bank) ? prefs.banks.filter((id) => id !== bank) : [...prefs.banks, bank],
    })),
    toggleFavorite: (id: string) => edit((prefs) => ({
      ...prefs,
      favorites: prefs.favorites.includes(id) ? prefs.favorites.filter((item) => item !== id) : [...prefs.favorites, id],
    })),
    setCardType: (bank: BankId, type?: CardType) => edit((prefs) => ({
      ...prefs, cardTypes: { ...prefs.cardTypes, [bank]: type },
    })),
  };
}
