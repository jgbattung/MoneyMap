import { db } from "@/lib/prisma";
import { INSTALLMENT_STATUS } from "@/lib/installments";
import { addMonths, currentPhMonth, monthKey } from "@/lib/mcp/dates";
import { round2, toNumber } from "./util";

const DAY_MS = 24 * 60 * 60 * 1000;
const CADENCE_DAYS = 30; // the cron posts a payment every 30 days after the last one

/**
 * Installment plans (the parent rows, which every other aggregate excludes).
 * Field meaning, mirrored from the cron and create route: `amount` is the TOTAL, `monthlyAmount`
 * = total / `installmentDuration`, `remainingInstallments` counts payments still to post.
 * The final payment is estimated at 30 days per remaining payment after the last posted one
 * (or after the start date for a plan that has not posted yet).
 */
export async function getInstallments(userId: string, args: { status?: "ACTIVE" | "ALL" }) {
  const status = args.status ?? "ACTIVE";

  const rows = await db.expenseTransaction.findMany({
    where: {
      userId,
      isInstallment: true,
      installmentStatus:
        status === "ALL"
          ? { in: [INSTALLMENT_STATUS.active, INSTALLMENT_STATUS.completed] }
          : INSTALLMENT_STATUS.active,
    },
    select: {
      name: true,
      amount: true,
      monthlyAmount: true,
      installmentDuration: true,
      remainingInstallments: true,
      installmentStartDate: true,
      lastProcessedDate: true,
      installmentStatus: true,
      account: { select: { name: true } },
    },
    orderBy: { installmentStartDate: "desc" },
  });

  const nextMonth = addMonths(currentPhMonth(), 1);

  const installments = rows.map((r) => {
    const duration = r.installmentDuration ?? 0;
    const left = r.remainingInstallments ?? 0;
    const monthly = toNumber(r.monthlyAmount);

    let expectedEndMonth: string | null = null;
    if (left > 0) {
      const anchor = r.lastProcessedDate
        ? r.lastProcessedDate.getTime() + left * CADENCE_DAYS * DAY_MS
        : r.installmentStartDate
          ? r.installmentStartDate.getTime() + (left - 1) * CADENCE_DAYS * DAY_MS
          : null;
      expectedEndMonth = anchor === null ? null : monthKey(new Date(anchor));
    }

    return {
      name: r.name,
      account: r.account.name,
      monthlyAmount: round2(monthly),
      totalAmount: round2(toNumber(r.amount)),
      paymentsMade: Math.max(0, duration - left),
      paymentsLeft: left,
      amountLeft: round2(left * monthly),
      startDate: r.installmentStartDate ? r.installmentStartDate.toISOString().slice(0, 10) : null,
      expectedEndMonth,
      status: r.installmentStatus,
    };
  });

  // Still paying next month: active, payments left, and the final payment is not before then.
  const committedNextMonth = installments
    .filter(
      (i) =>
        i.status === INSTALLMENT_STATUS.active &&
        i.paymentsLeft > 0 &&
        i.expectedEndMonth !== null &&
        i.expectedEndMonth >= nextMonth
    )
    .reduce((s, i) => s + i.monthlyAmount, 0);

  return {
    currency: "PHP",
    totalMonthly: round2(
      installments.filter((i) => i.status === INSTALLMENT_STATUS.active).reduce((s, i) => s + i.monthlyAmount, 0)
    ),
    committedNextMonth: round2(committedNextMonth),
    installments,
  };
}
