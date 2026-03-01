import { auth } from "@/lib/auth";
import { calculateCurrentNetWorth, calculateMonthlyChange } from "@/lib/net-worth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentNetWorth = await calculateCurrentNetWorth(session.user.id);

    const monthlyChange = await calculateMonthlyChange(session.user.id);

    return NextResponse.json(
      {
        currentNetWorth,
        monthlyChange: {
          amount: monthlyChange.change,
          percentage: monthlyChange.percentage,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error calculating net worth:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}