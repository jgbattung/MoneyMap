import { db } from "@/lib/prisma";
import { calculateStatementBalance } from "@/lib/statement-calculator";

/**
 * Recalculates the statement balance for a credit card if the given
 * transaction date falls within a completed statement cycle.
 *
 * A cycle is "completed" when lastStatementCalculationDate is not null.
 * The completed cycle runs from:
 *   cycleStart = statementDate day in the month BEFORE lastStatementCalculationDate
 *   cycleEnd   = lastStatementCalculationDate - 1 day
 *
 * @param cardId - The FinancialAccount id of the credit card
 * @param transactionDate - The date of the transaction being created/edited/deleted
 */
async function recalculateForCard(cardId: string, transactionDate: Date): Promise<void> {
  const card = await db.financialAccount.findUnique({
    where: {
      id: cardId,
      accountType: "CREDIT_CARD",
    },
  });

  // Not a credit card, or no statement tracking set up yet
  if (!card || !card.statementDate || !card.lastStatementCalculationDate) {
    return;
  }

  const lastCalcDate = new Date(card.lastStatementCalculationDate);

  // Derive the completed cycle boundaries
  // cycleStart: the statementDate day in the month before lastStatementCalculationDate
  const cycleStartMonth = lastCalcDate.getMonth() - 1;
  const cycleStart = new Date(lastCalcDate.getFullYear(), cycleStartMonth, card.statementDate, 0, 0, 0, 0);

  // cycleEnd: the day before lastStatementCalculationDate
  const cycleEnd = new Date(lastCalcDate.getFullYear(), lastCalcDate.getMonth(), lastCalcDate.getDate() - 1, 23, 59, 59, 999);

  // Check if the transaction date falls within the completed cycle
  const txDate = new Date(transactionDate);
  txDate.setHours(0, 0, 0, 0);

  if (txDate < cycleStart || txDate > cycleEnd) {
    // Transaction is outside the completed cycle — no recalculation needed
    return;
  }

  console.log(`Recalculating statement balance for card "${card.name}" (${card.id}), cycle: ${cycleStart.toISOString()} → ${cycleEnd.toISOString()}`);

  const previousBalance = Number(card.previousStatementBalance ?? 0);
  const newBalance = await calculateStatementBalance(card.id, cycleStart, cycleEnd, previousBalance);

  await db.financialAccount.update({
    where: { id: card.id },
    data: { statementBalance: newBalance },
  });

  console.log(`Statement balance updated to ${newBalance} for card "${card.name}" (${card.id})`);
}

/**
 * Hook for expense transaction changes.
 * Recalculates statement balance for the affected credit card.
 *
 * @param accountId - The card the expense is on
 * @param transactionDate - The date of the expense
 * @param oldDate - (edit only) The previous date, if the date was changed
 */
export async function onExpenseTransactionChange(
  accountId: string,
  transactionDate: Date,
  oldDate?: Date
): Promise<void> {
  await recalculateForCard(accountId, transactionDate);

  // If the date changed, also check the old date's cycle
  if (oldDate && new Date(oldDate).getTime() !== new Date(transactionDate).getTime()) {
    await recalculateForCard(accountId, oldDate);
  }
}

/**
 * Hook for transfer transaction changes.
 * Recalculates statement balance for:
 * - CC Payments: affects the toAccountId (card being paid)
 * - Non-CC-Payment transfers FROM a credit card: affects the fromAccountId
 *
 * @param fromAccountId - The source account
 * @param toAccountId - The destination account
 * @param transferTypeId - The TransferType id
 * @param transactionDate - The date of the transfer
 * @param oldDate - (edit only) The previous date, if the date was changed
 */
export async function onTransferTransactionChange(
  fromAccountId: string,
  toAccountId: string,
  transferTypeId: string,
  transactionDate: Date,
  oldDate?: Date
): Promise<void> {
  const transferType = await db.transferType.findUnique({
    where: { id: transferTypeId },
  });

  if (!transferType) return;

  if (transferType.name === "Credit Card Payment") {
    await recalculateForCard(toAccountId, transactionDate);

    if (oldDate && new Date(oldDate).getTime() !== new Date(transactionDate).getTime()) {
      await recalculateForCard(toAccountId, oldDate);
    }
  } else {
    await recalculateForCard(fromAccountId, transactionDate);

    if (oldDate && new Date(oldDate).getTime() !== new Date(transactionDate).getTime()) {
      await recalculateForCard(fromAccountId, oldDate);
    }
  }
}

/**
 * Hook for income transaction changes on credit cards (rebates, credits).
 * Recalculates statement balance for the affected credit card.
 *
 * @param accountId - The card the income is on
 * @param transactionDate - The date of the income
 * @param oldDate - (edit only) The previous date, if the date was changed
 */
export async function onIncomeTransactionChange(
  accountId: string,
  transactionDate: Date,
  oldDate?: Date
): Promise<void> {
  await recalculateForCard(accountId, transactionDate);

  if (oldDate && new Date(oldDate).getTime() !== new Date(transactionDate).getTime()) {
    await recalculateForCard(accountId, oldDate);
  }
}