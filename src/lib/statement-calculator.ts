import { db } from "@/lib/prisma";

const CREDIT_CARD_PAYMENT_TYPE = "Credit Card Payment";

/**
 * Calculates the statement balance for a credit card over a given cycle.
 * 
 * Statement Balance = (Expenses on card during cycle) - (Credit Card Payments to card during cycle)
 * 
 * @param cardId - The FinancialAccount id of the credit card
 * @param cycleStart - Start of the statement cycle (inclusive)
 * @param cycleEnd - End of the statement cycle (inclusive)
 * @returns The calculated statement balance as a number
 */
export async function calculateStatementBalance(
  cardId: string,
  cycleStart: Date,
  cycleEnd: Date
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

  return totalExpenses - totalPayments;
}