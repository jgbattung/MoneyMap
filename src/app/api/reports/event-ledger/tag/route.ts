import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { eventLedgerTagSchema } from "@/lib/validations/event-ledger";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();

    const parsed = eventLedgerTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { transactionIds, transactionType, tagIds } = parsed.data;

    const data = { tags: { connect: tagIds.map((id) => ({ id })) } };

    if (transactionType === "expense") {
      await db.$transaction(
        transactionIds.map((id) =>
          db.expenseTransaction.update({ where: { id, userId }, data })
        )
      );
    } else {
      await db.$transaction(
        transactionIds.map((id) =>
          db.incomeTransaction.update({ where: { id, userId }, data })
        )
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding tag to transaction:", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to add tag" },
      { status: 500 }
    );
  }
}
