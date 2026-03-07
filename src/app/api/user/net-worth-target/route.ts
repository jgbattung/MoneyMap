import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const NetWorthTargetSchema = z.object({
  target: z.number().min(0).nullable(),
  targetDate: z.string().datetime().nullable(),
});

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

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        netWorthTarget: true,
        netWorthTargetDate: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        target: user.netWorthTarget ? parseFloat(user.netWorthTarget.toString()) : null,
        targetDate: user.netWorthTargetDate,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error getting net worth target:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json();

    const parseResult = NetWorthTargetSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { target, targetDate } = parseResult.data;

    // Update user's net worth target
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        netWorthTarget: target !== null && target !== undefined ? target : null,
        netWorthTargetDate: targetDate !== null && targetDate !== undefined ? new Date(targetDate) : null,
      },
      select: {
        netWorthTarget: true,
        netWorthTargetDate: true,
      },
    });

    return NextResponse.json(
      {
        target: updatedUser.netWorthTarget ? parseFloat(updatedUser.netWorthTarget.toString()) : null,
        targetDate: updatedUser.netWorthTargetDate,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating net worth target:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}