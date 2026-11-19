import Link from "next/link";
import { notFound } from "next/navigation";
import { PromoDetails } from "@/components/dashboard/PromoDetails";
import { getPromo } from "@/lib/queries";

export default async function PromoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const promo = await getPromo(id);
  if (!promo) notFound();

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <Link href="/" className="text-sm font-semibold text-gray-700 hover:underline">← Ver todas las promociones</Link>
      <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <PromoDetails promo={promo} />
      </article>
    </main>
  );
}
