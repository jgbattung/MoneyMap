import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { buildLedgerWhere } from "@/lib/event-ledger-where";
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

    if ("filter" in parsed.data) {
      const { filter, tagIds } = parsed.data;
      const { expenseWhere, incomeWhere } = buildLedgerWhere({ userId, ...filter });

      const [expenses, incomes] = await Promise.all([
        db.expenseTransaction.findMany({ where: expenseWhere, select: { id: true } }),
        db.incomeTransaction.findMany({ where: incomeWhere, select: { id: true } }),
      ]);

      if (expenses.length === 0 && incomes.length === 0) {
        return NextResponse.json({ success: true, tagged: 0 });
      }

      const expenseConnect = expenses.map(({ id }) => ({ id }));
      const incomeConnect = incomes.map(({ id }) => ({ id }));

      // Connect from the Tag side: one operation per tag regardless of row
      // count. `userId` in the where makes tag ownership a hard requirement.
      await db.$transaction(
        tagIds.map((tagId) =>
          db.tag.update({
            where: { id: tagId, userId },
            data: {
              expenseTransactions: { connect: expenseConnect },
              incomeTransactions: { connect: incomeConnect },
            },
          })
        )
      );

      return NextResponse.json({
        success: true,
        tagged: expenseConnect.length + incomeConnect.length,
      });
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

    return NextResponse.json({ success: true, tagged: transactionIds.length });
  } catch (error) {
    console.error("Error adding tag to transaction:", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Tag or transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to add tag" },
      { status: 500 }
    );
  }
}
