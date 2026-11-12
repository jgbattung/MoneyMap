import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { db } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const ToggleEarmarkSchema = z.object({
  done: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const parseResult = ToggleEarmarkSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const item = await db.payDivisionItem.findFirst({
      where: { id: itemId, divisionId: id, division: { userId: session.user.id } },
      select: { id: true, kind: true },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    if (item.kind !== 'EARMARK') {
      return NextResponse.json(
        { error: 'Only earmark rows can be toggled directly' },
        { status: 400 }
      );
    }

    const updated = await db.payDivisionItem.update({
      where: { id: itemId },
      data: { completedAt: parseResult.data.done ? new Date() : null },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error toggling pay division item: ', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
