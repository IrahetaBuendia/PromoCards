import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-guard";
import { moderatePromoDB } from "@/lib/queries";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as {
    categoryId?: string;
    title?: string;
    description?: string;
    isActive?: boolean;
  };

  const updates: Record<string, unknown> = {};
  if (body.categoryId !== undefined) updates.category_id = body.categoryId;
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.isActive !== undefined) updates.is_active = body.isActive;

  try {
    const promo = await moderatePromoDB(id, updates);
    return NextResponse.json(promo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
