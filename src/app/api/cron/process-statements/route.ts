import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { calculateStatementBalance } from "@/lib/statement-calculator";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token || token !== process.env.CRON_SECRET) {
      console.error("Unauthorized cron request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current day-of-month in PH timezone (UTC+8)
    const phDate = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const phDay = phDate.getUTCDate();
    const phMonth = phDate.getUTCMonth(); // 0-indexed
    const phYear = phDate.getUTCFullYear();

    console.log(`Processing statements for PH date: ${phDate.toISOString()}, day: ${phDay}`);

    // Find all credit cards whose statement_date matches today (PH)
    const cards = await db.financialAccount.findMany({
      where: {
        accountType: "CREDIT_CARD",
        statementDate: phDay,
      },
    });

    console.log(`Found ${cards.length} credit card(s) with statement_date = ${phDay}`);

    const results: Array<{
      id: string;
      name: string;
      status: string;
      statementBalance?: number;
      reason?: string;
    }> = [];

    for (const card of cards) {
      try {
        // Case 1: First run — transitional cycle, skip calculation
        if (!card.lastStatementCalculationDate) {
          console.log(`Card "${card.name}" (${card.id}): first run, setting lastStatementCalculationDate`);

          await db.financialAccount.update({
            where: { id: card.id },
            data: {
              lastStatementCalculationDate: new Date(),
            },
          });

          results.push({
            id: card.id,
            name: card.name,
            status: "skipped",
            reason: "First run — transitional cycle",
          });
          continue;
        }

        const lastCalcDate = new Date(card.lastStatementCalculationDate);
        const lastCalcMonth = lastCalcDate.getMonth();

        // Case 2: Already calculated this month, skip
        if (lastCalcMonth === phMonth) {
          console.log(`Card "${card.name}" (${card.id}): already calculated this month, skipping`);

          results.push({
            id: card.id,
            name: card.name,
            status: "skipped",
            reason: "Already calculated this month",
          });
          continue;
        }

        // Case 3: New month — calculate statement balance for previous cycle
        // Cycle: from last statement date to yesterday
        const cycleStart = new Date(lastCalcDate);
        cycleStart.setHours(0, 0, 0, 0);

        const cycleEnd = new Date(phYear, phMonth, phDay - 1, 23, 59, 59, 999);

        console.log(
          `Card "${card.name}" (${card.id}): calculating cycle ${cycleStart.toISOString()} → ${cycleEnd.toISOString()}`
        );

        const balance = await calculateStatementBalance(card.id, cycleStart, cycleEnd);

        await db.financialAccount.update({
          where: { id: card.id },
          data: {
            statementBalance: balance,
            lastStatementCalculationDate: new Date(),
          },
        });

        console.log(`Card "${card.name}" (${card.id}): statement balance set to ${balance}`);

        results.push({
          id: card.id,
          name: card.name,
          status: "success",
          statementBalance: balance,
        });
      } catch (error) {
        console.error(`Error processing card "${card.name}" (${card.id}):`, error);
        results.push({
          id: card.id,
          name: card.name,
          status: "failed",
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Error processing statements:", error);
    return NextResponse.json(
      { error: "Failed to process statements" },
      { status: 500 }
    );
  }
}