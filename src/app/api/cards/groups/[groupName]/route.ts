import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { groupName: string } }
) {
  try {
    const { groupName } = await params;
    const decodedGroupName = decodeURIComponent(groupName);

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cards = await db.financialAccount.findMany({
      where: {
        userId: session.user.id,
        accountType: "CREDIT_CARD",
        cardGroup: decodedGroupName,
      },
      orderBy: {
        currentBalance: "asc",
      },
    });

    if (cards.length === 0) {
      return NextResponse.json({ error: "Card group not found" }, { status: 404 });
    }

    const transformedCards = cards.map((card) => ({
      ...card,
      initialBalance: parseFloat(card.initialBalance.toString()),
      currentBalance: parseFloat(card.currentBalance.toString()),
      statementBalance: card.statementBalance
        ? parseFloat(card.statementBalance.toString())
        : null,
    }));

    // Total outstanding balance across all cards in group
    const totalOutstandingBalance = transformedCards.reduce(
      (sum, card) => sum + card.currentBalance,
      0
    );

    // Statement balance: only show if ALL cards have a calculated value
    const allHaveStatementBalance = transformedCards.every(
      (card) => card.statementBalance !== null
    );

    const totalStatementBalance = allHaveStatementBalance
      ? transformedCards.reduce((sum, card) => sum + (card.statementBalance ?? 0), 0)
      : null;

    // Use the shared statementDate (all cards in a group have the same one)
    const statementDate = cards[0].statementDate;
    const lastStatementCalculationDate = cards[0].lastStatementCalculationDate;

    return NextResponse.json(
      {
        groupName: decodedGroupName,
        totalOutstandingBalance,
        totalStatementBalance,
        statementDate,
        lastStatementCalculationDate,
        cards: transformedCards,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error getting card group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}