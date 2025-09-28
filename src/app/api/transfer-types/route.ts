// /api/transfer-types/route.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

const PREDEFINED_TRANSFER_TYPES = [
  "Moving",
  "Saving", 
  "Investing",
  "Funding",
  "Credit Card Payment",
  "Cash Withdrawal",
  "Account Reconciliation"
];

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has any transfer types
    const existingCount = await db.transferType.count({
      where: {
        userId: session.user.id,
      },
    });

    // If no transfer types exist, create predefined ones
    if (existingCount === 0) {
      await db.transferType.createMany({
        data: PREDEFINED_TRANSFER_TYPES.map(name => ({
          userId: session.user.id,
          name,
        })),
      });
    }

    // Fetch all transfer types
    const transferTypes = await db.transferType.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(transferTypes, { status: 200 });
  } catch (error) {
    console.error('Error getting transfer types: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const transferType = await db.transferType.create({
      data: {
        userId: session.user.id,
        name,
      }
    });

    return NextResponse.json(transferType, { status: 201 });

  } catch (error) {
    console.error('Error creating transfer type: ', error);

    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A transfer type with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}