import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const installmentsDue  = await db.expenseTransaction.findMany({
      where: {
        isInstallment: true,
        remainingInstallments: {
          gt: 0,
        },
        installmentStartDate: {
          lte: today,
        }
      }
    });

    console.log(`Found ${installmentsDue.length} installments to process`);

    const results = [];
    for (const installment of installmentsDue) {
      try {
        const startDate = new Date(installment.installmentStartDate!);
        startDate.setHours(0, 0, 0, 0);

        const lastProcessed = installment.lastProcessedDate
          ? new Date(installment.lastProcessedDate)
          : startDate;

        lastProcessed.setHours(0, 0, 0, 0);

        const daysSinceLastProcessed = Math.floor(
          (today.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastProcessed < 30) {
          console.log(`Installment ${installment.id} not due yet (${daysSinceLastProcessed} days)`);
          continue;
        }

        console.log(`Processing installment ${installment.id}`);
        
        await db.$transaction(async (tx) => {
          // Deduct monthly amount from credit card
          await tx.financialAccount.update({
            where: {
              id: installment.accountId,
            },
            data: {
              currentBalance: {
                decrement: installment.monthlyAmount!,
              },
            },
          });

          // Update installment record
          await tx.expenseTransaction.update({
            where: {
              id: installment.id,
            },
            data: {
              remainingInstallments: {
                decrement: 1
              },
              lastProcessedDate: today,
            },
          });
        });

        console.log(`Successfully processed installment ${installment.id} - deducted ${installment.monthlyAmount}`);
        
        results.push({ 
          id: installment.id, 
          status: 'success',
          daysSinceLastProcessed 
        });
      } catch (error) {
        console.error(`Error processing installment ${installment.id}:`, error);
        results.push({ 
          id: installment.id, 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });

  } catch (error) {
    console.error('Error processing installments: ', error);
    return NextResponse.json(
      { error: 'Failed to process installments' },
      { status: 500 },
    );
  }
}