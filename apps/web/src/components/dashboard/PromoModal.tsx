"use client";

import { useEffect, useRef } from "react";
import type { Promo } from "@promocards/types";
import { PromoDetails } from "./PromoDetails";

export function PromoModal({ promo, onClose, favorite, onFavorite }: {
  promo: Promo;
  onClose: () => void;
  favorite: boolean;
  onFavorite: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (element && !element.open) element.showModal();
    return () => {
      if (element?.open) element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby="promo-title" onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="m-auto w-11/12 max-w-xl max-h-[90dvh] overflow-y-auto bg-transparent p-0 backdrop:bg-gray-950/50">
      <div className="rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex justify-end">
          <button type="button" onClick={onClose} aria-label="Cerrar promoción" className="min-w-10 min-h-10 rounded-lg hover:bg-gray-100">✕</button>
        </div>
        <PromoDetails promo={promo} favorite={favorite} onFavorite={onFavorite} />
      </div>
    </dialog>
  );
}
