import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params } : { params: { id: string } }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const card = await db.financialAccount.findUnique({
      where: {
        id: id,
        userId: session.user.id
      },
    });

    if (!card) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(card, { status: 200 });

  } catch (error) {
    console.error('Error getting credit card: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

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

    const { name, initialBalance, statementDate, dueDate } = body;

    if (!name || initialBalance === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const updatedCard = await db.financialAccount.update({
      where: {
        id: id,
        userId: session.user.id,
      },
      data: {
        name,
        accountType: 'CREDIT_CARD',
        initialBalance: parseFloat(initialBalance),
        currentBalance: parseFloat(initialBalance),
        statementDate: statementDate ? parseInt(statementDate) : null,
        dueDate: dueDate ? parseInt(dueDate) : null,
      }
    });

    return NextResponse.json(updatedCard, { status: 201 });

  } catch (error) {
    console.error('Error updating credit card: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}