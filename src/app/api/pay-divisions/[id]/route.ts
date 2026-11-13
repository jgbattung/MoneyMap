import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// Items cascade with the division. Transfers recorded from its rows are kept
// (the item side holds the foreign key), so balances are untouched.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.payDivision.delete({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ message: 'Pay division deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting pay division: ', error);

    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Pay division not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
