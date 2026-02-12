import { db } from "@/lib/prisma";

const CREDIT_CARD_PAYMENT_TYPE = "Credit Card Payment";

/**
 * Calculates the statement balance for a credit card over a given cycle.
 *
 * Statement Balance = Previous Balance + Expenses + Transfers Out (non-CC-payment) - Income/Credits - CC Payments
 *
 * @param cardId - The FinancialAccount id of the credit card
 * @param cycleStart - Start of the statement cycle (inclusive)
 * @param cycleEnd - End of the statement cycle (inclusive)
 * @param previousBalance - The statement balance from the previous cycle (default 0)
 * @returns The calculated statement balance as a number
 */
export async function calculateStatementBalance(
  cardId: string,
  cycleStart: Date,
  cycleEnd: Date,
  previousBalance: number = 0
): Promise<number> {
  // Sum all expense transactions on this card within the cycle
  const expenseResult = await db.expenseTransaction.aggregate({
    _sum: { amount: true },
    where: {
      accountId: cardId,
      date: {
        gte: cycleStart,
        lte: cycleEnd,
      },
    },
  });

  const totalExpenses = Number(expenseResult._sum.amount ?? 0);

  // Sum all income transactions on this card within the cycle (rebates, credits)
  const incomeResult = await db.incomeTransaction.aggregate({
    _sum: { amount: true },
    where: {
      accountId: cardId,
      date: {
        gte: cycleStart,
        lte: cycleEnd,
      },
    },
  });

  const totalIncome = Number(incomeResult._sum.amount ?? 0);

  // Sum all credit card payment transfers TO this card within the cycle
  const paymentResult = await db.transferTransaction.aggregate({
    _sum: { amount: true },
    where: {
      toAccountId: cardId,
      date: {
        gte: cycleStart,
        lte: cycleEnd,
      },
      transferType: {
        name: CREDIT_CARD_PAYMENT_TYPE,
      },
    },
  });

  const totalPayments = Number(paymentResult._sum.amount ?? 0);

  // Sum all non-CC-payment transfers FROM this card within the cycle
  const transferOutResult = await db.transferTransaction.aggregate({
    _sum: { amount: true },
    where: {
      fromAccountId: cardId,
      date: {
        gte: cycleStart,
        lte: cycleEnd,
      },
      transferType: {
        NOT: {
          name: CREDIT_CARD_PAYMENT_TYPE,
        },
      },
    },
  });

  const totalTransfersOut = Number(transferOutResult._sum.amount ?? 0);

  return previousBalance + totalExpenses + totalTransfersOut - totalIncome - totalPayments;
}